/**
 * ==============================================================================
 * STRESS TEST DO BOTÃO DE PÂNICO (SOS) — GIRO ANGOLA
 * Simulação de múltiplos motoristas e teste de broadcast geoespacial em 5km
 * ==============================================================================
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'ChaveSuperSecretaJWTAccessGiroAngola2026_987654321';

// Motoristas de teste
const drivers = [
  { id: 'b0000000-0000-0000-0000-000000000001', nome: 'Mateus (Mutamba)', tipo: 'motorista', lat: -8.8383, lng: 13.2344 },
  { id: 'b0000000-0000-0000-0000-000000000002', nome: 'António (Talatona)', tipo: 'motorista', lat: -8.9147, lng: 13.1893 },
  { id: 'b0000000-0000-0000-0000-000000000004', nome: 'Carlos (Maianga)', tipo: 'motorista', lat: -8.8310, lng: 13.2370 }
];

async function runSOSTest() {
  console.log('🧪 Iniciando teste de estresse e broadcast do Botão SOS...');

  // 1. Conectar Central de Operações
  const centralToken = jwt.sign({ id: 'a0000000-0000-0000-0000-000000000001', nome: 'Central 24h', tipo: 'central_operador' }, JWT_SECRET);
  const centralSocket = io(SERVER_URL, { auth: { token: centralToken } });

  centralSocket.on('connect', () => {
    console.log('📡 Central de Operações conectada ao radar.');
  });

  centralSocket.on('central:sos_incoming', (sos) => {
    console.log('🚨 [CENTRAL RECEBEU ALERTA SOS!]:', sos);
  });

  // 2. Conectar Colegas de Apoio
  const colleagueToken = jwt.sign(drivers[2], JWT_SECRET);
  const colleagueSocket = io(SERVER_URL, { auth: { token: colleagueToken } });

  colleagueSocket.on('connect', () => {
    console.log(`🚗 Colega de Apoio conectado: ${drivers[2].nome}`);
    // Atualiza posição inicial
    colleagueSocket.emit('driver:location_update', { lat: drivers[2].lat, lng: drivers[2].lng, status: 'online' });
  });

  colleagueSocket.on('sos:solidarity_alert', (data) => {
    console.log(`🤝 [ALERTA SOLIDÁRIO 5KM RECEBIDO PELO MOTORISTA ${drivers[2].nome}]:`, data);
  });

  // 3. Conectar Motorista em Emergência e Disparar SOS
  setTimeout(() => {
    const victimToken = jwt.sign(drivers[0], JWT_SECRET);
    const victimSocket = io(SERVER_URL, { auth: { token: victimToken } });

    victimSocket.on('connect', () => {
      console.log(`🚨 Motorista em Perigo conectado: ${drivers[0].nome}`);
      
      console.log('⚡ Disparando sinal de pânico imediato...');
      victimSocket.emit('driver:panic_trigger', {
        lat: drivers[0].lat,
        lng: drivers[0].lng,
        enderecoAproximado: 'Av. Deolinda Rodrigues, junto ao Kinaxixi, Luanda'
      });
    });

    victimSocket.on('sos:confirmed', (res) => {
      console.log('✅ Confirmação recebida pelo motorista:', res);
      setTimeout(() => {
        console.log('🏁 Teste do Botão de Pânico concluído com sucesso!');
        process.exit(0);
      }, 2000);
    });

  }, 1500);
}

runSOSTest();
