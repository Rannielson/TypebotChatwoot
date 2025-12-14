#!/bin/bash

# Script para iniciar API geral com número configurável de réplicas
# Uso: ./docker/start-api.sh

cd "$(dirname "$0")" || exit 1

# Lê número de réplicas do .env ou usa padrão (geralmente 1-2 é suficiente)
API_REPLICAS=${API_REPLICAS:-1}

echo "🚀 Iniciando API Geral..."
echo "   - Réplicas: ${API_REPLICAS}"
echo "   - Porta interna: ${API_PORT:-3000}"
echo "   - Porta externa (via Nginx): ${PORT:-3000}/api"
echo ""

# Inicia API com scale
docker-compose up -d --scale api="${API_REPLICAS}" api nginx

echo "✅ API Geral iniciada!"
echo ""
echo "📊 Para ver logs: docker-compose logs -f api"
echo "📊 Para ver status: docker-compose ps api"
