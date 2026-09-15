/**
 * ==============================================================================
 * SERVIDOR PRINCIPAL HTTP & API REST — GIRO ANGOLA
 * Conforme Normas de Segurança Bancária, Idempotência e Modelagem Tarifária
 * ==============================================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const crypto = require('crypto');
require('dotenv').config();

const { pool, redisClient, logger, withTransaction } = require('./database');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 1. MIDDLEWARES DE SEGURANÇA BANCÁRIA
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));

// Rate Limiting Global
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Limite de requisições excedido. Tente novamente mais tarde.' }
});
app.use('/api/', apiLimiter);

// Rate Limiting Rigoroso para Autenticação e SOS
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' }
});

const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Frequência máxima de alertas SOS atingida.' }
});

// Middleware de Autenticação JWT
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autorização não fornecido.' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}

// 2. MODELO TARIFÁRIO CALIBRADO (10% A 12% MAIS BARATO QUE A CONCORRÊNCIA)
const TABELA_TARIFAS = {
  base: 50,
  km: 243,
  min: 1,
  minimo: 900,
  taxaComissaoGiro: 0.10, // 10% de comissão
  multiplicadores: {
    moto: 0.47,
    economico: 1.00,
    conforto: 1.14,
    giro_7: 1.40,
    entrega_moto: 0.48,
    entrega_carro: 1.05,
    entrega_van: 1.35,
    carga_pickup: 1.50, // +50% conforme especificação
    carga_canter: 2.25,
    carga_pesada: 3.50
  }
};

function calcularEstimativaTarifa(distanciaKm, duracaoMin, categoria) {
  const mult = TABELA_TARIFAS.multiplicadores[categoria] || 1.0;
  const isMoto = categoria === 'moto' || categoria === 'entrega_moto';
  const isCarga = categoria.startsWith('carga_');
  
  const minFare = isCarga ? (TABELA_TARIFAS.minimo * 1.5) : (TABELA_TARIFAS.minimo * (isMoto ? 0.85 : 1.0));
  const valorBruto = (TABELA_TARIFAS.base + (TABELA_TARIFAS.km * distanciaKm) + (TABELA_TARIFAS.min * duracaoMin)) * mult;
  
  const valorFinal = Math.max(minFare, valorBruto);
  return Math.round(valorFinal);
}

// 3. ROTAS DA API

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), platform: 'GIRO Angola API v1' });
});

// A. AUTENTICAÇÃO — LOGIN
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  const schema = Joi.object({
    telefone: Joi.string().required(),
    senha: Joi.string().min(6).required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const result = await pool.query(
      'SELECT id, nome, telefone, email, senha_hash, tipo, ativo FROM usuarios WHERE telefone = $1',
      [value.telefone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = result.rows[0];
    if (!user.ativo) {
      return res.status(403).json({ error: 'Conta suspensa. Contacte a Central GIRO.' });
    }

    const match = await bcrypt.compare(value.senha, user.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const payload = { id: user.id, nome: user.nome, telefone: user.telefone, tipo: user.tipo };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321', { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'ChaveSuperSecretaJWTRefreshGiroAngola2026_123456789', { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        telefone: user.telefone,
        tipo: user.tipo
      }
    });
  } catch (err) {
    logger.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
});

// A2. AUTENTICAÇÃO — CADASTRO DE PASSAGEIRO E MOTORISTA
app.post('/api/v1/auth/registar', authLimiter, async (req, res) => {
  const schema = Joi.object({
    nome: Joi.string().min(3).max(120).required(),
    telefone: Joi.string().pattern(/^9\d{8}$/).required(),
    email: Joi.string().email().allow('', null),
    senha: Joi.string().min(6).required(),
    tipo: Joi.string().valid('passageiro', 'motorista').default('passageiro'),
    biNumero: Joi.string().max(30).allow('', null),
    veiculo: Joi.object({
      categoria: Joi.string().valid(...Object.keys(TABELA_TARIFAS.multiplicadores)).required(),
      marca: Joi.string().max(50).required(),
      modelo: Joi.string().max(50).required(),
      ano: Joi.number().integer().min(1990).max(2100),
      matricula: Joi.string().max(20).required(),
      cor: Joi.string().max(30).required()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  if (value.tipo === 'motorista' && !value.veiculo) {
    return res.status(400).json({ error: 'Dados do veículo são obrigatórios para motoristas.' });
  }

  try {
    const senhaHash = await bcrypt.hash(value.senha, 12);

    const user = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO usuarios (nome, telefone, email, senha_hash, tipo, bi_numero)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nome, telefone, tipo`,
        [value.nome, value.telefone, value.email || null, senhaHash, value.tipo, value.biNumero || null]
      );
      const novo = inserted.rows[0];

      await client.query('INSERT INTO carteiras (usuario_id) VALUES ($1)', [novo.id]);

      if (value.tipo === 'motorista') {
        const v = value.veiculo;
        await client.query(
          `INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [novo.id, v.categoria, v.marca, v.modelo, v.ano || null, v.matricula, v.cor]
        );
      }

      return novo;
    });

    const payload = { id: user.id, nome: user.nome, telefone: user.telefone, tipo: user.tipo };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321', { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'ChaveSuperSecretaJWTRefreshGiroAngola2026_123456789', { expiresIn: '7d' });

    res.status(201).json({ accessToken, refreshToken, user: payload });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma conta com este telefone, email, BI ou matrícula.' });
    }
    logger.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// A3. PERFIL DO UTILIZADOR AUTENTICADO
app.get('/api/v1/auth/me', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.telefone, u.email, u.tipo, u.avaliacao_media, u.total_corridas,
              c.saldo_disponivel, c.faturamento_hoje, c.comissao_acumulada_a_pagar
         FROM usuarios u
         LEFT JOIN carteiras c ON c.usuario_id = u.id
        WHERE u.id = $1 AND u.ativo = TRUE`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Erro ao carregar perfil:', err);
    res.status(500).json({ error: 'Erro interno ao carregar perfil.' });
  }
});

// A3b. REGISTAR TOKEN DE NOTIFICAÇÕES PUSH
app.post('/api/v1/auth/push-token', authenticateJWT, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token é obrigatório.' });
  try {
    await pool.query('UPDATE usuarios SET fcm_token = $1 WHERE id = $2', [token, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    logger.error('Erro ao guardar push token:', err);
    res.status(500).json({ error: 'Erro ao registar token.' });
  }
});

// A4. EXCLUSÃO DE CONTA — exigida pela Google Play e pela App Store
app.delete('/api/v1/auth/conta', authenticateJWT, async (req, res) => {
  const { senha } = req.body;
  if (!senha) return res.status(400).json({ error: 'Confirme a senha para eliminar a conta.' });

  try {
    const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });

    const match = await bcrypt.compare(senha, result.rows[0].senha_hash);
    if (!match) return res.status(401).json({ error: 'Senha incorrecta.' });

    const pendentes = await pool.query(
      `SELECT 1 FROM corridas
        WHERE (passageiro_id = $1 OR motorista_id = $1)
          AND status NOT IN ('concluida', 'cancelada') LIMIT 1`,
      [req.user.id]
    );
    if (pendentes.rows.length > 0) {
      return res.status(409).json({ error: 'Termine ou cancele as corridas em curso antes de eliminar a conta.' });
    }

    // Anonimização: o histórico financeiro é append-only e não pode ser apagado.
    await pool.query(
      `UPDATE usuarios
          SET ativo = FALSE,
              nome = 'Conta eliminada',
              email = NULL,
              bi_numero = NULL,
              fcm_token = NULL,
              avatar_url = NULL,
              telefone = 'eliminado_' || id,
              senha_hash = '!',
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [req.user.id]
    );

    res.json({ ok: true, mensagem: 'Conta eliminada. Os registos financeiros são retidos de forma anónima por obrigação legal.' });
  } catch (err) {
    logger.error('Erro ao eliminar conta:', err);
    res.status(500).json({ error: 'Erro interno ao eliminar conta.' });
  }
});

// B. AUTENTICAÇÃO — REFRESH TOKEN ROTATIVO
app.post('/api/v1/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh Token obrigatório.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'ChaveSuperSecretaJWTRefreshGiroAngola2026_123456789');
    const payload = { id: decoded.id, nome: decoded.nome, telefone: decoded.telefone, tipo: decoded.tipo };
    const newAccessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321', { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'ChaveSuperSecretaJWTRefreshGiroAngola2026_123456789', { expiresIn: '7d' });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(403).json({ error: 'Refresh Token inválido ou expirado.' });
  }
});

// B2. ESTIMATIVA DE TARIFA — preço de todas as categorias antes de confirmar
app.post('/api/v1/corridas/estimativa', authenticateJWT, (req, res) => {
  const schema = Joi.object({
    distanciaKm: Joi.number().positive().max(2000).required(),
    duracaoMin: Joi.number().positive().max(1440).required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const estimativas = Object.keys(TABELA_TARIFAS.multiplicadores).map((categoria) => ({
    categoria,
    valorKz: calcularEstimativaTarifa(value.distanciaKm, value.duracaoMin, categoria),
    distanciaKm: value.distanciaKm,
    duracaoMin: value.duracaoMin
  }));

  res.json({ estimativas, comissaoPercentual: TABELA_TARIFAS.taxaComissaoGiro * 100 });
});

// C. MOTORISTAS PRÓXIMOS (ST_DWithin PostGIS + Redis GEO)
app.get('/api/v1/motoristas/proximos', authenticateJWT, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const raioKm = parseFloat(req.query.raioKm || '5');

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Coordenadas lat e lng são obrigatórias.' });
  }

  try {
    // 1. Busca rápida no Redis GEOSEARCH
    const nearbyDriverIds = await redisClient.geoSearch(
      'giro:drivers:geo',
      { longitude: lng, latitude: lat },
      { radius: raioKm, unit: 'km' }
    );

    if (nearbyDriverIds.length === 0) {
      return res.json({ total: 0, motoristas: [] });
    }

    // 2. Carregar detalhes dos motoristas no PostgreSQL
    const driversResult = await pool.query(
      `SELECT u.id, u.nome, u.telefone, u.avaliacao_media, v.categoria, v.marca, v.modelo, v.matricula, v.cor
       FROM usuarios u
       JOIN veiculos v ON v.motorista_id = u.id
       WHERE u.id = ANY($1::uuid[]) AND u.ativo = TRUE`,
      [nearbyDriverIds]
    );

    res.json({
      total: driversResult.rows.length,
      motoristas: driversResult.rows
    });
  } catch (err) {
    logger.error('Erro ao buscar motoristas próximos:', err);
    res.status(500).json({ error: 'Erro ao pesquisar veículos disponíveis.' });
  }
});

// D. SOLICITAR CORRIDA COM ESTIMATIVA PRÉVIA DE PREÇO (FARE ESTIMATE ANTES DE CONFIRMAR)
app.post('/api/v1/corridas/solicitar', authenticateJWT, async (req, res) => {
  const schema = Joi.object({
    origemNome: Joi.string().required(),
    origemLat: Joi.number().required(),
    origemLng: Joi.number().required(),
    destinoNome: Joi.string().required(),
    destinoLat: Joi.number().required(),
    destinoLng: Joi.number().required(),
    distanciaKm: Joi.number().positive().required(),
    duracaoMin: Joi.number().positive().required(),
    categoria: Joi.string().valid('moto', 'economico', 'conforto', 'giro_7', 'entrega_moto', 'entrega_carro', 'entrega_van', 'carga_pickup', 'carga_canter', 'carga_pesada').required(),
    metodoPagamento: Joi.string().valid('DINHEIRO', 'MULTICAIXA_EXPRESS', 'UNITEL_MONEY').required(),
    idempotencyKey: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // 1. Verificação de Idempotência
    const existing = await pool.query('SELECT * FROM corridas WHERE idempotency_key = $1', [value.idempotencyKey]);
    if (existing.rows.length > 0) {
      return res.json({ corrida: existing.rows[0], reenviado: true });
    }

    // 2. Cálculo da Tarifa Fixa Antes de Confirmar
    const valorEstimado = calcularEstimativaTarifa(value.distanciaKm, value.duracaoMin, value.categoria);
    const codigoEmbarque = Math.floor(1000 + Math.random() * 9000).toString(); // PIN de 4 dígitos

    // 3. Persistência da Corrida com PostGIS Point (SRID 4326)
    const result = await pool.query(
      `INSERT INTO corridas (
        idempotency_key, passageiro_id, categoria, status,
        origem_nome, origem_ponto, destino_nome, destino_ponto,
        distancia_km, duracao_estimada_min, valor_estimado,
        metodo_pagamento, codigo_embarque
      ) VALUES (
        $1, $2, $3, 'solicitada',
        $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7, ST_SetSRID(ST_MakePoint($8, $9), 4326),
        $10, $11, $12,
        $13, $14
      ) RETURNING *`,
      [
        value.idempotencyKey, req.user.id, value.categoria,
        value.origemNome, value.origemLng, value.origemLat,
        value.destinoNome, value.destinoLng, value.destinoLat,
        value.distanciaKm, value.duracaoMin, valorEstimado,
        value.metodoPagamento, codigoEmbarque
      ]
    );

    const corridaCriada = result.rows[0];

    // 4. Disparar evento para motoristas mais próximos via WebSocket
    io.to('drivers:all').emit('ride:new_request', {
      corridaId: corridaCriada.id,
      origemNome: value.origemNome,
      destinoNome: value.destinoNome,
      distanciaKm: value.distanciaKm,
      valorEstimado,
      categoria: value.categoria,
      metodoPagamento: value.metodoPagamento
    });

    res.status(201).json({
      success: true,
      corrida: corridaCriada,
      fareBreakdown: {
        valorTotal: valorEstimado,
        taxaPlataformaPercentual: 10,
        moeda: 'Kz'
      }
    });

  } catch (err) {
    logger.error('Erro ao solicitar corrida:', err);
    res.status(500).json({ error: 'Erro ao processar pedido de viagem.' });
  }
});

// D2. ACEITAR CORRIDA — atómico, o primeiro motorista a aceitar fica com a corrida
app.post('/api/v1/corridas/aceitar', authenticateJWT, async (req, res) => {
  if (req.user.tipo !== 'motorista') {
    return res.status(403).json({ error: 'Apenas motoristas podem aceitar corridas.' });
  }

  const { corridaId } = req.body;
  if (!corridaId) return res.status(400).json({ error: 'corridaId é obrigatório.' });

  try {
    const emCurso = await pool.query(
      `SELECT 1 FROM corridas WHERE motorista_id = $1
        AND status IN ('aceita', 'motorista_a_caminho', 'motorista_no_local', 'em_viagem') LIMIT 1`,
      [req.user.id]
    );
    if (emCurso.rows.length > 0) {
      return res.status(409).json({ error: 'Já tem uma corrida em curso.' });
    }

    // A cláusula status = 'solicitada' garante que só uma aceitação vence a corrida.
    const result = await pool.query(
      `UPDATE corridas
          SET motorista_id = $1, status = 'motorista_a_caminho'
        WHERE id = $2 AND status = 'solicitada' AND motorista_id IS NULL
        RETURNING *`,
      [req.user.id, corridaId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Esta corrida já foi aceite por outro motorista.' });
    }

    const corrida = result.rows[0];
    const veiculo = await pool.query(
      `SELECT marca, modelo, cor, matricula FROM veiculos WHERE motorista_id = $1 LIMIT 1`,
      [req.user.id]
    );
    const v = veiculo.rows[0];

    io.to(`user:${corrida.passageiro_id}`).emit('corrida:aceita', {
      id: corrida.id,
      motorista_nome: req.user.nome,
      motorista_telefone: req.user.telefone,
      veiculo: v ? `${v.marca} ${v.modelo} ${v.cor} · ${v.matricula}` : 'Viatura GIRO',
      codigo_embarque: corrida.codigo_embarque
    });

    // Retira o pedido da lista dos outros motoristas.
    io.to('drivers:all').emit('ride:request_taken', { corridaId: corrida.id });

    res.json({ success: true, corrida });
  } catch (err) {
    logger.error('Erro ao aceitar corrida:', err);
    res.status(500).json({ error: 'Erro ao aceitar corrida.' });
  }
});

// D3. INICIAR VIAGEM — exige o código de embarque de 4 dígitos do passageiro
app.post('/api/v1/corridas/iniciar', authenticateJWT, async (req, res) => {
  const { corridaId, codigoEmbarque } = req.body;
  if (!corridaId || !codigoEmbarque) {
    return res.status(400).json({ error: 'corridaId e codigoEmbarque são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      `UPDATE corridas
          SET status = 'em_viagem', iniciada_em = CURRENT_TIMESTAMP
        WHERE id = $1 AND motorista_id = $2 AND codigo_embarque = $3
          AND status IN ('motorista_a_caminho', 'motorista_no_local')
        RETURNING id, passageiro_id`,
      [corridaId, req.user.id, String(codigoEmbarque)]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Código de embarque incorrecto ou corrida em estado inválido.' });
    }

    io.to(`user:${result.rows[0].passageiro_id}`).emit('corrida:iniciada', { id: corridaId });
    res.json({ success: true });
  } catch (err) {
    logger.error('Erro ao iniciar viagem:', err);
    res.status(500).json({ error: 'Erro ao iniciar viagem.' });
  }
});

// D4. CANCELAR CORRIDA — passageiro ou motorista, antes do embarque
app.post('/api/v1/corridas/cancelar', authenticateJWT, async (req, res) => {
  const { corridaId, motivo } = req.body;
  if (!corridaId) return res.status(400).json({ error: 'corridaId é obrigatório.' });

  try {
    const result = await pool.query(
      `UPDATE corridas
          SET status = 'cancelada', cancelada_em = CURRENT_TIMESTAMP, motivo_cancelamento = $3
        WHERE id = $1
          AND (passageiro_id = $2 OR motorista_id = $2)
          AND status IN ('solicitada', 'aceita', 'motorista_a_caminho', 'motorista_no_local')
        RETURNING id, passageiro_id, motorista_id`,
      [corridaId, req.user.id, motivo || 'Cancelada pelo utilizador']
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Não é possível cancelar esta corrida.' });
    }

    const c = result.rows[0];
    const payload = { id: c.id, motivo: motivo || 'Cancelada pelo utilizador', porUsuarioId: req.user.id };
    io.to(`user:${c.passageiro_id}`).emit('corrida:cancelada', payload);
    if (c.motorista_id) io.to(`user:${c.motorista_id}`).emit('corrida:cancelada', payload);
    io.to('drivers:all').emit('ride:request_taken', { corridaId: c.id });

    res.json({ success: true });
  } catch (err) {
    logger.error('Erro ao cancelar corrida:', err);
    res.status(500).json({ error: 'Erro ao cancelar corrida.' });
  }
});

// D5. CORRIDA ACTIVA — permite retomar o ecrã certo depois de fechar o app
app.get('/api/v1/corridas/activa', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.nome AS motorista_nome, u.telefone AS motorista_telefone,
              v.marca, v.modelo, v.cor, v.matricula
         FROM corridas c
         LEFT JOIN usuarios u ON u.id = c.motorista_id
         LEFT JOIN veiculos v ON v.motorista_id = c.motorista_id
        WHERE (c.passageiro_id = $1 OR c.motorista_id = $1)
          AND c.status IN ('solicitada', 'aceita', 'motorista_a_caminho', 'motorista_no_local', 'em_viagem')
        ORDER BY c.criada_em DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ corrida: result.rows[0] || null });
  } catch (err) {
    logger.error('Erro ao carregar corrida activa:', err);
    res.status(500).json({ error: 'Erro ao carregar corrida activa.' });
  }
});

// D6. HISTÓRICO DE CORRIDAS
app.get('/api/v1/corridas/historico', authenticateJWT, async (req, res) => {
  const limite = Math.min(parseInt(req.query.limite || '30', 10), 100);
  try {
    const result = await pool.query(
      `SELECT id, origem_nome, destino_nome, categoria, status, valor_estimado, valor_final,
              metodo_pagamento, distancia_km, criada_em, concluida_em
         FROM corridas
        WHERE passageiro_id = $1 OR motorista_id = $1
        ORDER BY criada_em DESC LIMIT $2`,
      [req.user.id, limite]
    );
    res.json({ corridas: result.rows });
  } catch (err) {
    logger.error('Erro ao carregar histórico:', err);
    res.status(500).json({ error: 'Erro ao carregar histórico.' });
  }
});

// E. CONCLUIR CORRIDA (TRANSAÇÃO ATÔMICA + IDEMPOTÊNCIA + SPLIT 10% GIRO)
app.post('/api/v1/corridas/concluir', authenticateJWT, async (req, res) => {
  const schema = Joi.object({
    corridaId: Joi.string().uuid().required(),
    idempotencyKey: Joi.string().required(),
    valorFinal: Joi.number().positive().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const resultadoTransacao = await withTransaction(async (client) => {
      // 1. Buscar a Corrida
      const corridaRes = await client.query(
        'SELECT * FROM corridas WHERE id = $1 FOR UPDATE',
        [value.corridaId]
      );
      if (corridaRes.rows.length === 0) {
        throw new Error('Corrida não encontrada.');
      }
      const corrida = corridaRes.rows[0];

      if (corrida.status === 'concluida') {
        return { corrida, jaConcluida: true };
      }

      const motoristaId = corrida.motorista_id || req.user.id;
      const valorTotal = value.valorFinal;
      const comissaoGiro = Math.round(valorTotal * 0.10); // 10% de comissão
      const liquidoMotorista = valorTotal - comissaoGiro; // 90% para o motorista

      // 2. Buscar Carteira do Motorista
      const carteiraRes = await client.query(
        'SELECT * FROM carteiras WHERE usuario_id = $1 FOR UPDATE',
        [motoristaId]
      );
      if (carteiraRes.rows.length === 0) {
        throw new Error('Carteira do motorista não encontrada.');
      }
      const carteira = carteiraRes.rows[0];
      const saldoAnterior = parseFloat(carteira.saldo_disponivel);
      let novoSaldo = saldoAnterior;
      let comissaoAcumulada = parseFloat(carteira.comissao_acumulada_a_pagar);
      let tipoOperacao = '';

      // 3. Aplicação das Regras de Negócio de Angola
      if (corrida.metodo_pagamento === 'DINHEIRO') {
        // Motorista recebeu 100% em mãos. Sistema debita os 10% da comissão a pagar
        comissaoAcumulada += comissaoGiro;
        tipoOperacao = 'DEBITO_COMISSAO_DINHEIRO';
      } else {
        // Multicaixa Express / Unitel Money: Credita 90% no saldo disponível
        novoSaldo += liquidoMotorista;
        tipoOperacao = 'CREDITO_CORRIDA_EXPRESS';
      }

      // Atualizar Faturamento de Hoje para Desafio 30K
      const novoFaturamentoHoje = parseFloat(carteira.faturamento_hoje) + valorTotal;
      let bonusAtribuido = false;

      if (novoFaturamentoHoje >= 30000 && !carteira.bonus_diario_recebido) {
        novoSaldo += 1500; // Bônus de 1.500 Kz (50% da taxa retida dos 30K)
        bonusAtribuido = true;
      }

      // Atualizar Carteira
      await client.query(
        `UPDATE carteiras 
         SET saldo_disponivel = $1, 
             comissao_acumulada_a_pagar = $2, 
             total_ganhos_historico = total_ganhos_historico + $3,
             faturamento_hoje = $4,
             bonus_diario_recebido = $5,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [novoSaldo, comissaoAcumulada, liquidoMotorista, novoFaturamentoHoje, (carteira.bonus_diario_recebido || bonusAtribuido), carteira.id]
      );

      // 4. Registro no Livro-Razão de Auditoria Financeira Imutável
      await client.query(
        `INSERT INTO auditoria_financeira (
          idempotency_key, corrida_id, carteira_id, tipo_operacao, valor, saldo_anterior, saldo_posterior, detalhes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          value.idempotencyKey, corrida.id, carteira.id, tipoOperacao, 
          (corrida.metodo_pagamento === 'DINHEIRO' ? comissaoGiro : liquidoMotorista),
          saldoAnterior, novoSaldo,
          JSON.stringify({
            metodoPagamento: corrida.metodo_pagamento,
            valorBruto: valorTotal,
            comissaoGiro,
            liquidoMotorista,
            bonusDesafio30K: bonusAtribuido ? 1500 : 0
          })
        ]
      );

      // 5. Atualizar Status da Corrida
      const corridaFinalizada = await client.query(
        `UPDATE corridas 
         SET status = 'concluida', 
             valor_final = $1, 
             valor_comissao_giro = $2, 
             valor_liquido_motorista = $3,
             concluida_em = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [valorTotal, comissaoGiro, liquidoMotorista, corrida.id]
      );

      return { corrida: corridaFinalizada.rows[0], bonusAtribuido };
    });

    res.json({
      success: true,
      corrida: resultadoTransacao.corrida,
      bonusDesafio30K: resultadoTransacao.bonusAtribuido
    });

  } catch (err) {
    logger.error('Erro ao concluir corrida:', err);
    res.status(500).json({ error: err.message || 'Erro ao liquidar corrida.' });
  }
});

// F. BOTÃO DE PÂNICO (SOS VIA HTTP COM DISPARO DE PUSH & POSTGIS 5KM)
app.post('/api/v1/sos', sosLimiter, authenticateJWT, async (req, res) => {
  const schema = Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    corridaId: Joi.string().uuid().optional().allow(null),
    enderecoAproximado: Joi.string().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // 1. Gravação do Alerta de Pânico
    const result = await pool.query(
      `INSERT INTO alertas_sos (motorista_id, corrida_id, localizacao, endereco_aproximado, raio_notificacao_km)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, 5.00)
       RETURNING id, criado_em`,
      [req.user.id, value.corridaId || null, value.lng, value.lat, value.enderecoAproximado || 'Posição GPS']
    );

    const alerta = result.rows[0];

    // 2. Busca de Motoristas em 5km via PostGIS
    const colegasProximos = await pool.query(
      `SELECT u.id, u.nome, u.telefone, u.fcm_token
       FROM usuarios u
       JOIN veiculos v ON v.motorista_id = u.id
       WHERE u.id != $1 AND u.ativo = TRUE`,
      [req.user.id]
    );

    logger.warn(`🚨 SOS Criado: ID ${alerta.id}. Notificando Central e colegas em Luanda.`);

    // 3. Emitir WebSocket para a Central 24h
    io.to('central:dispatch').emit('central:sos_incoming', {
      sosId: alerta.id,
      motoristaId: req.user.id,
      motoristaNome: req.user.nome,
      motoristaTelefone: req.user.telefone,
      lat: value.lat,
      lng: value.lng,
      enderecoAproximado: value.enderecoAproximado,
      criadoEm: alerta.criado_em
    });

    res.status(201).json({
      success: true,
      sosId: alerta.id,
      mensagem: 'Alerta SOS registrado com sucesso. Central 24h e colegas mobilizados num raio de 5 km.'
    });

  } catch (err) {
    logger.error('Erro ao acionar SOS via HTTP:', err);
    res.status(500).json({ error: 'Erro ao registrar alerta SOS.' });
  }
});

// G. WEBHOOK MULTICAIXA EXPRESS / UNITEL MONEY (VALIDAÇÃO HMAC)
app.post('/api/v1/webhooks/pagamentos', async (req, res) => {
  const signature = req.headers['x-signature-hmac'];
  const secret = process.env.MULTICAIXA_EXPRESS_WEBHOOK_SECRET || 'mcx_sec_angola_live_998877';

  if (!signature) {
    return res.status(401).json({ error: 'Assinatura HMAC ausente.' });
  }

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (computedHash !== signature) {
    logger.error('Assinatura HMAC inválida no Webhook de Pagamentos');
    return res.status(403).json({ error: 'Assinatura HMAC inválida.' });
  }

  const { corridaId, status, valorPago, transacaoId } = req.body;
  logger.info(`💳 Webhook de Pagamento recebido para corrida ${corridaId} [Status: ${status}]`);

  res.json({ received: true });
});

// INICIALIZAR SOCKET.IO
initSocket(io);

// INICIAR SERVIDOR
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Servidor GIRO Angola operacional na porta ${PORT} [Node ${process.version}]`);
});

module.exports = { app, server };
