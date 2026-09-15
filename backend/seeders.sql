-- ==============================================================================
-- SEEDERS INICIAIS — GIRO ANGOLA (5 MOTORISTAS EM LUANDA)
-- ==============================================================================

-- 1. Operador Central 24h
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Operador Central GIRO',
    '+244923000001',
    'central@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'central_operador',
    '000123456LA010'
) ON CONFLICT (telefone) DO NOTHING;

-- 2. Motorista 1: Mutamba
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero, avaliacao_media, total_corridas)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Mateus Kapapelo',
    '+244923111001',
    'mateus.mutamba@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'motorista',
    '001234567LA011',
    4.96,
    284
) ON CONFLICT (telefone) DO NOTHING;

INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor, documento_validado)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'economico',
    'Hyundai',
    'i10 Grand',
    2022,
    'LD-45-89-GH',
    'Prata Titânio',
    TRUE
) ON CONFLICT (matricula) DO NOTHING;

INSERT INTO carteiras (usuario_id, saldo_disponivel, comissao_acumulada_a_pagar, total_ganhos_historico, faturamento_hoje)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    45000.00,
    2500.00,
    380000.00,
    18500.00
) ON CONFLICT (usuario_id) DO NOTHING;

-- 3. Motorista 2: Talatona
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero, avaliacao_media, total_corridas)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'António Van-Dúnem',
    '+244923111002',
    'antonio.talatona@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'motorista',
    '002345678LA012',
    4.98,
    412
) ON CONFLICT (telefone) DO NOTHING;

INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor, documento_validado)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'conforto',
    'Toyota',
    'Corolla Quest',
    2023,
    'LD-99-12-AZ',
    'Ouro Champanhe',
    TRUE
) ON CONFLICT (matricula) DO NOTHING;

INSERT INTO carteiras (usuario_id, saldo_disponivel, comissao_acumulada_a_pagar, total_ganhos_historico, faturamento_hoje)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    82000.00,
    0.00,
    720000.00,
    32500.00
) ON CONFLICT (usuario_id) DO NOTHING;

-- 4. Motorista 3: Kilamba
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero, avaliacao_media, total_corridas)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'Domingos Zua',
    '+244923111003',
    'domingos.kilamba@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'motorista',
    '003456789LA013',
    4.92,
    195
) ON CONFLICT (telefone) DO NOTHING;

INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor, documento_validado)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'moto',
    'Lingken',
    'LK 150 Express',
    2023,
    'LD-M-33-44',
    'Amarelo Ouro',
    TRUE
) ON CONFLICT (matricula) DO NOTHING;

INSERT INTO carteiras (usuario_id, saldo_disponivel, comissao_acumulada_a_pagar, total_ganhos_historico, faturamento_hoje)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    29000.00,
    1200.00,
    210000.00,
    14000.00
) ON CONFLICT (usuario_id) DO NOTHING;

-- 5. Motorista 4: Maianga
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero, avaliacao_media, total_corridas)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'Carlos Silveira',
    '+244923111004',
    'carlos.maianga@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'motorista',
    '004567890LA014',
    4.95,
    350
) ON CONFLICT (telefone) DO NOTHING;

INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor, documento_validado)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'giro_7',
    'Toyota',
    'Avanza 7L',
    2021,
    'LD-77-88-KV',
    'Branco Pérola',
    TRUE
) ON CONFLICT (matricula) DO NOTHING;

INSERT INTO carteiras (usuario_id, saldo_disponivel, comissao_acumulada_a_pagar, total_ganhos_historico, faturamento_hoje)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    54000.00,
    0.00,
    510000.00,
    22000.00
) ON CONFLICT (usuario_id) DO NOTHING;

-- 6. Motorista 5: Viana (Carga)
INSERT INTO usuarios (id, nome, telefone, email, senha_hash, tipo, bi_numero, avaliacao_media, total_corridas)
VALUES (
    'b0000000-0000-0000-0000-000000000005',
    'Sebastião Lourenço',
    '+244923111005',
    'sebastiao.viana@giro.ao',
    '$2b$12$eZ3ePq0W0hO5T3K3c/VvIeXQ5m9Y1vjJ4.R7p.L0A6hK2r6gE4Mym',
    'motorista',
    '005678901LA015',
    4.99,
    520
) ON CONFLICT (telefone) DO NOTHING;

INSERT INTO veiculos (motorista_id, categoria, marca, modelo, ano, matricula, cor, capacidade_carga_kg, documento_validado)
VALUES (
    'b0000000-0000-0000-0000-000000000005',
    'carga_pickup',
    'Toyota',
    'Hilux Caixa Aberta',
    2022,
    'LD-12-34-CG',
    'Branco',
    1200.00,
    TRUE
) ON CONFLICT (matricula) DO NOTHING;

INSERT INTO carteiras (usuario_id, saldo_disponivel, comissao_acumulada_a_pagar, total_ganhos_historico, faturamento_hoje)
VALUES (
    'b0000000-0000-0000-0000-000000000005',
    96000.00,
    4000.00,
    980000.00,
    45000.00
) ON CONFLICT (usuario_id) DO NOTHING;
