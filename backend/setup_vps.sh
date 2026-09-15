#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALAÇÃO & CONFIGURAÇÃO AUTOMÁTICA DA VPS — GIRO ANGOLA
# Sistema Operacional: Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "======================================================"
echo "🚀 INICIANDO INSTALAÇÃO DO SERVIDOR GIRO ANGOLA"
echo "======================================================"

export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget gnupg2 lsb-release ca-certificates ufw git build-essential

# 1. Instalação do Node.js 20 LTS
echo "📦 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g npm@latest pm2

# 2. Instalação do PostgreSQL 16 + PostGIS
echo "🐘 Instalando PostgreSQL + Extensão Espacial PostGIS..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-contrib-16 postgresql-16-postgis-3

sudo -u postgres psql -c "CREATE USER giro_user WITH PASSWORD 'SuaSenhaForteAqui123!';" || true
sudo -u postgres psql -c "CREATE DATABASE giro_angola OWNER giro_user;" || true
sudo -u postgres psql -d giro_angola -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d giro_angola -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 3. Instalação do Redis com AOF
echo "⚡ Instalando Redis com AOF (Append Only File)..."
apt install -y redis-server
sed -i 's/^appendonly no/appendonly yes/' /etc/redis/redis.conf
sed -i 's/^# requirepass foobared/requirepass SuaSenhaRedisForte456!/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# 4. Instalação do Nginx e Certbot
echo "🌐 Instalando Nginx e Certbot SSL..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

# 5. Configuração de Firewall UFW
echo "🔒 Configurando Firewall UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# 6. PM2 Startup
pm2 startup systemd -u root --hp /root || true

echo "======================================================"
echo "✅ SERVIDOR VPS GIRO ANGOLA PREPARADO COM SUCESSO!"
echo "======================================================"
