/**
 * ==============================================================================
 * WEBSOCKET & TELEMETRIA GEOESPACIAL — GIRO ANGOLA
 * Rastreamento de Motoristas via Redis GEOADD e Alerta Solidário SOS com GEORADIUS
 * ==============================================================================
 */

const jwt = require('jsonwebtoken');
const { redisClient, pool, logger } = require('./database');

const REDIS_DRIVERS_GEO_KEY = 'giro:drivers:geo';
const REDIS_DRIVERS_STATE_KEY = 'giro:drivers:state';

function initSocket(io) {
  // Middleware de Autenticação JWT no WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Autenticação necessária'));
    }
    const cleanToken = token.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(cleanToken, process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Token inválido ou expirado'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`🔌 Usuário conectado ao WebSocket: ${user.nome} (${user.tipo}) [ID: ${user.id}]`);

    // Entrar na sala pessoal para notificações diretas
    socket.join(`user:${user.id}`);
    if (user.tipo === 'motorista') {
      socket.join('drivers:all');
    }
    if (user.tipo === 'central_operador' || user.tipo === 'admin') {
      socket.join('central:dispatch');
    }

    // 1. ATUALIZAÇÃO DE POSIÇÃO DO MOTORISTA (Throttled a cada 5-10s)
    socket.on('driver:location_update', async (data) => {
      try {
        const { lat, lng, bearing, heading, status, categoria } = data;
        if (!lat || !lng) return;

        // Armazenar no índice geoespacial do Redis (GEOADD longitude latitude member)
        await redisClient.geoAdd(REDIS_DRIVERS_GEO_KEY, {
          longitude: lng,
          latitude: lat,
          member: user.id
        });

        // Atualizar estado e metadados rápidos no Redis Hash
        await redisClient.hSet(REDIS_DRIVERS_STATE_KEY, user.id, JSON.stringify({
          id: user.id,
          nome: user.nome,
          telefone: user.telefone,
          lat,
          lng,
          bearing: bearing || heading || 0,
          status: status || 'online',
          categoria: categoria || 'economico',
          updatedAt: Date.now()
        }));

        // Notificar Central 24h em tempo real
        io.to('central:dispatch').emit('central:driver_moved', {
          driverId: user.id,
          nome: user.nome,
          lat,
          lng,
          bearing,
          status,
          categoria
        });

      } catch (err) {
        logger.error('Erro ao processar localização do motorista:', err);
      }
    });

    // 2. DISPARO DO BOTÃO DE PÂNICO (SOS) — Busca Espacial em Raio de 5 KM
    socket.on('driver:panic_trigger', async (data) => {
      try {
        const { lat, lng, corridaId, enderecoAproximado } = data;
        logger.warn(`🚨 ALERTA SOS DISPARADO PELO MOTORISTA ${user.nome} (${user.id}) nas coordenadas [${lat}, ${lng}]`);

        // 1. Gravar Alerta no Banco de Dados (PostgreSQL + PostGIS)
        const sosRes = await pool.query(
          `INSERT INTO alertas_sos (motorista_id, corrida_id, localizacao, endereco_aproximado, raio_notificacao_km)
           VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, 5.00)
           RETURNING id, criado_em`,
          [user.id, corridaId || null, lng, lat, enderecoAproximado || 'Localização em tempo real (GPS)']
        );
        const sosRecord = sosRes.rows[0];

        // 2. Busca Geoespacial de Colegas num Raio de 5 KM via Redis GEOSEARCH
        const nearbyDrivers = await redisClient.geoSearch(
          REDIS_DRIVERS_GEO_KEY,
          { longitude: lng, latitude: lat },
          { radius: 5, unit: 'km' }
        );

        logger.info(`🚨 ${nearbyDrivers.length} motoristas parceiros encontrados no raio de 5km.`);

        const sosPayload = {
          sosId: sosRecord.id,
          driverId: user.id,
          driverName: user.nome,
          driverPhone: user.telefone,
          lat,
          lng,
          enderecoAproximado,
          timestamp: sosRecord.criado_em,
          radiusKm: 5.0
        };

        // 3. Notificar Motoristas no Raio de 5 KM (Alerta Solidário Peer-to-Peer)
        nearbyDrivers.forEach((colleagueId) => {
          if (colleagueId !== user.id) {
            io.to(`user:${colleagueId}`).emit('sos:solidarity_alert', sosPayload);
          }
        });

        // 4. Notificar a Central Tática 24h
        io.to('central:dispatch').emit('central:sos_incoming', sosPayload);

        // Feedback de confirmação imediata para o próprio motorista
        socket.emit('sos:confirmed', {
          success: true,
          sosId: sosRecord.id,
          message: 'Central 24h acionada e viaturas a caminho. Alerta emitido para colegas a 5 km.'
        });

      } catch (err) {
        logger.error('Erro crítico ao disparar SOS:', err);
        socket.emit('sos:error', { message: 'Falha ao transmitir alerta de pânico.' });
      }
    });

    // Desconexão do Motorista
    socket.on('disconnect', async () => {
      logger.info(`🔌 Usuário desconectado: ${user.nome} [${user.id}]`);
      if (user.tipo === 'motorista') {
        // Remover do tracking ativo
        await redisClient.zRem(REDIS_DRIVERS_GEO_KEY, user.id);
        await redisClient.hDel(REDIS_DRIVERS_STATE_KEY, user.id);
        io.to('central:dispatch').emit('central:driver_offline', { driverId: user.id });
      }
    });
  });
}

module.exports = { initSocket };
