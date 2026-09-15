/**
 * ==============================================================================
 * CONEXÃO COM BANCO DE DADOS & REDIS — GIRO ANGOLA
 * Camada de Persistência Segura com Pool Transacional e Suporte a Redis GEO
 * ==============================================================================
 */

const { Pool } = require('pg');
const { createClient } = require('redis');
const winston = require('winston');
require('dotenv').config();

// Logger Estruturado Winston
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 1. PostgreSQL + PostGIS Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'giro_angola',
  user: process.env.DB_USER || 'giro_user',
  password: process.env.DB_PASS || 'SuaSenhaForteAqui123!',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '25'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  logger.info('🐘 Conexão com PostgreSQL + PostGIS estabelecida com sucesso.');
});

pool.on('error', (err) => {
  logger.error('❌ Erro inesperado no Pool do PostgreSQL:', err);
});

// 2. Redis Client (Comandos Geoespaciais e Cache AOF)
const redisUrl = `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
  url: redisUrl
});

redisClient.on('connect', () => {
  logger.info('⚡ Conexão com Redis (GEO tracking) estabelecida com sucesso.');
});

redisClient.on('error', (err) => {
  logger.error('❌ Erro no cliente Redis:', err);
});

// Inicialização Assíncrona do Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Falha ao conectar no Redis:', err);
  }
})();

module.exports = {
  pool,
  redisClient,
  logger,
  // Helper para execução de transações seguras (BEGIN ... COMMIT/ROLLBACK)
  async withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transação financeira revertida (ROLLBACK):', error);
      throw error;
    } finally {
      client.release();
    }
  }
};
