#!/bin/bash

# Script para verificar se tudo está configurado corretamente

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando configuração do projeto...${NC}"
echo ""

ERRORS=0

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado${NC}"
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado${NC}"
    ERRORS=$((ERRORS + 1))
else
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✅ Docker: ${DOCKER_VERSION}${NC}"
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Docker Compose: OK${NC}"
fi

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
    if [ -f .env.example ]; then
        echo -e "${BLUE}   Criando .env a partir do .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}   ✅ Arquivo .env criado${NC}"
    else
        echo -e "${RED}   ❌ Arquivo .env.example não encontrado${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
fi

# Verificar arquivo .env.local do frontend
if [ ! -f frontend/.env.local ]; then
    echo -e "${YELLOW}⚠️  Arquivo frontend/.env.local não encontrado${NC}"
    echo -e "${BLUE}   Criando frontend/.env.local...${NC}"
    echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > frontend/.env.local
    echo -e "${GREEN}   ✅ Arquivo frontend/.env.local criado${NC}"
else
    echo -e "${GREEN}✅ Arquivo frontend/.env.local encontrado${NC}"
fi

# Verificar node_modules do backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependências do backend não instaladas${NC}"
    echo -e "${BLUE}   Execute: npm install${NC}"
else
    echo -e "${GREEN}✅ Dependências do backend instaladas${NC}"
fi

# Verificar node_modules do frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependências do frontend não instaladas${NC}"
    echo -e "${BLUE}   Execute: cd frontend && npm install${NC}"
else
    echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"
fi

# Verificar se Docker está rodando
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Docker está rodando${NC}"
fi

# Verificar se serviços Docker estão rodando
if docker ps | grep -q "typebot_connector_postgres"; then
    echo -e "${GREEN}✅ PostgreSQL está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL não está rodando${NC}"
    echo -e "${BLUE}   Execute: cd docker && docker-compose up -d postgres redis${NC}"
fi

if docker ps | grep -q "typebot_connector_redis"; then
    echo -e "${GREEN}✅ Redis está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  Redis não está rodando${NC}"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tudo configurado corretamente!${NC}"
    echo ""
    echo -e "${BLUE}Para iniciar:${NC}"
    echo -e "  ${YELLOW}npm run dev:all${NC}  (inicia backend e frontend)"
    echo -e "  ${YELLOW}npm run dev${NC}      (apenas backend)"
    exit 0
else
    echo -e "${RED}❌ Encontrados ${ERRORS} problema(s)${NC}"
    echo -e "${YELLOW}Corrija os problemas acima antes de continuar${NC}"
    exit 1
fi

