#!/bin/bash

# Script para iniciar backend e frontend em desenvolvimento simultaneamente

set -e

echo "🚀 Iniciando Backend e Frontend em modo desenvolvimento..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para limpar processos ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Encerrando processos...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup SIGINT SIGTERM

# Verificar se Docker está rodando
if ! docker ps > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker não está rodando. Iniciando serviços Docker...${NC}"
    cd docker
    docker-compose up -d postgres redis
    cd ..
    sleep 5
fi

# Iniciar backend
echo -e "${BLUE}🔧 Iniciando Backend na porta 3000...${NC}"
npm run dev &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 3

# Iniciar frontend
echo -e "${BLUE}🎨 Iniciando Frontend na porta 3001...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Serviços iniciados!${NC}"
echo ""
echo -e "${BLUE}📍 URLs:${NC}"
echo -e "  ${YELLOW}Backend:${NC}  http://localhost:3000"
echo -e "  ${YELLOW}Frontend:${NC} http://localhost:3001"
echo -e "  ${YELLOW}API Docs:${NC} http://localhost:3000/health"
echo ""
echo -e "${BLUE}👤 Credenciais padrão:${NC}"
echo -e "  ${YELLOW}Email:${NC}    admin@example.com"
echo -e "  ${YELLOW}Senha:${NC}    admin123"
echo ""
echo -e "${YELLOW}Pressione Ctrl+C para encerrar todos os serviços${NC}"

# Aguardar processos
wait

