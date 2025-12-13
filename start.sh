#!/bin/bash

# Script de inicialização do projeto
# Este script inicia o backend e frontend

set -e

echo "🚀 Iniciando Typebot Chatwoot Connector..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando a partir do .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Arquivo .env criado. Por favor, configure as variáveis se necessário.${NC}"
fi

# Verificar se está no diretório docker
if [ ! -f "docker/docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠️  Execute este script da raiz do projeto${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Iniciando serviços Docker (PostgreSQL e Redis)...${NC}"
cd docker
docker-compose up -d postgres redis

echo -e "${BLUE}⏳ Aguardando serviços ficarem prontos...${NC}"
sleep 5

echo -e "${BLUE}🔧 Instalando dependências do backend...${NC}"
cd ..
npm install

echo -e "${BLUE}🗄️  Executando migrations...${NC}"
npm run migrate

echo -e "${BLUE}🌱 Executando seeds...${NC}"
npm run seed

echo -e "${BLUE}🔧 Instalando dependências do frontend...${NC}"
cd frontend
npm install

echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo -e "${BLUE}Para iniciar os serviços:${NC}"
echo -e "  ${YELLOW}Backend:${NC} npm run dev (na raiz do projeto)"
echo -e "  ${YELLOW}Frontend:${NC} cd frontend && npm run dev"
echo ""
echo -e "${BLUE}Ou use o script start-dev.sh para iniciar ambos simultaneamente${NC}"

