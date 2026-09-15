-- ==============================================================================
-- SCHEMA DE BANCO DE DADOS POSTGRESQL + POSTGIS — GIRO ANGOLA
-- Nível Bancário: Transacional, Idempotente, Auditoria Imutável e Índices Espaciais
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ENUMS
DO $$ BEGIN
    CREATE TYPE tipo_usuario AS ENUM ('passageiro', 'motorista', 'central_operador', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_corrida AS ENUM (
        'solicitada', 
        'aceita', 
        'motorista_a_caminho', 
        'motorista_no_local', 
        'em_viagem', 
        'concluida', 
        'cancelada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pagamento AS ENUM ('DINHEIRO', 'MULTICAIXA_EXPRESS', 'UNITEL_MONEY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE categoria_veiculo AS ENUM (
        'moto', 
        'economico', 
        'conforto', 
        'giro_7', 
        'entrega_moto', 
        'entrega_carro', 
        'entrega_van', 
        'carga_pickup', 
        'carga_canter', 
        'carga_pesada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_sos AS ENUM ('ativo', 'em_atendimento', 'resolvido', 'falso_alarme');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo tipo_usuario NOT NULL DEFAULT 'passageiro',
    bi_numero VARCHAR(30) UNIQUE,
    avatar_url TEXT,
    avaliacao_media NUMERIC(3,2) DEFAULT 5.00,
    total_corridas INT DEFAULT 0,
    fcm_token TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. VEÍCULOS
CREATE TABLE IF NOT EXISTS veiculos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorista_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria categoria_veiculo NOT NULL DEFAULT 'economico',
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    cor VARCHAR(30) NOT NULL,
    capacidade_passageiros INT DEFAULT 4,
    capacidade_carga_kg NUMERIC(10,2) DEFAULT 0,
    documento_validado BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. CARTEIRAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS carteiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    saldo_disponivel NUMERIC(12,2) DEFAULT 0.00,
    comissao_acumulada_a_pagar NUMERIC(12,2) DEFAULT 0.00, -- Débito de 10% nas corridas em dinheiro
    total_ganhos_historico NUMERIC(12,2) DEFAULT 0.00,
    faturamento_hoje NUMERIC(12,2) DEFAULT 0.00, -- Desafio Diário 30K
    bonus_diario_recebido BOOLEAN DEFAULT FALSE,
    conta_multicaixa_express VARCHAR(30),
    numero_unitel_money VARCHAR(20),
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. CORRIDAS
CREATE TABLE IF NOT EXISTS corridas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(100) UNIQUE,
    passageiro_id UUID NOT NULL REFERENCES usuarios(id),
    motorista_id UUID REFERENCES usuarios(id),
    categoria categoria_veiculo NOT NULL,
    status status_corrida NOT NULL DEFAULT 'solicitada',
    
    origem_nome TEXT NOT NULL,
    origem_ponto GEOMETRY(Point, 4326) NOT NULL,
    destino_nome TEXT NOT NULL,
    destino_ponto GEOMETRY(Point, 4326) NOT NULL,
    
    distancia_km NUMERIC(8,2) NOT NULL,
    duracao_estimada_min INT NOT NULL,
    
    valor_estimado NUMERIC(10,2) NOT NULL,
    valor_final NUMERIC(10,2),
    taxa_plataforma_percentual NUMERIC(4,2) DEFAULT 10.00,
    valor_comissao_giro NUMERIC(10,2),
    valor_liquido_motorista NUMERIC(10,2),
    
    metodo_pagamento metodo_pagamento NOT NULL DEFAULT 'DINHEIRO',
    codigo_embarque VARCHAR(4) NOT NULL,
    
    iniciada_em TIMESTAMPTZ,
    concluida_em TIMESTAMPTZ,
    cancelada_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    
    criada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUDITORIA FINANCEIRA (Append-Only)
CREATE TABLE IF NOT EXISTS auditoria_financeira (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    corrida_id UUID REFERENCES corridas(id),
    carteira_id UUID NOT NULL REFERENCES carteiras(id),
    tipo_operacao VARCHAR(50) NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    saldo_anterior NUMERIC(12,2) NOT NULL,
    saldo_posterior NUMERIC(12,2) NOT NULL,
    detalhes JSONB,
    registrado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. ALERTAS DE PÂNICO (SOS)
CREATE TABLE IF NOT EXISTS alertas_sos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorista_id UUID NOT NULL REFERENCES usuarios(id),
    corrida_id UUID REFERENCES corridas(id),
    localizacao GEOMETRY(Point, 4326) NOT NULL,
    endereco_aproximado TEXT,
    raio_notificacao_km NUMERIC(4,2) DEFAULT 5.00,
    status status_sos DEFAULT 'ativo',
    esquadra_pna_notificada VARCHAR(100),
    policia_acionada_em TIMESTAMPTZ,
    resolvido_em TIMESTAMPTZ,
    notas_operador TEXT,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES GIST E B-TREE
CREATE INDEX IF NOT EXISTS idx_corridas_origem_gist ON corridas USING GIST (origem_ponto);
CREATE INDEX IF NOT EXISTS idx_corridas_destino_gist ON corridas USING GIST (destino_ponto);
CREATE INDEX IF NOT EXISTS idx_alertas_sos_localizacao_gist ON alertas_sos USING GIST (localizacao);
CREATE INDEX IF NOT EXISTS idx_corridas_status ON corridas (status);
CREATE INDEX IF NOT EXISTS idx_corridas_passageiro ON corridas (passageiro_id);
CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas (motorista_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON usuarios (telefone);
CREATE INDEX IF NOT EXISTS idx_auditoria_carteira ON auditoria_financeira (carteira_id);
