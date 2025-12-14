#!/bin/bash

# Script para iniciar webhook-api com número configurável de réplicas
# Uso: ./docker/start-webhook-api.sh

cd "$(dirname "$0")" || exit 1

# Lê número de réplicas do .env ou usa padrão
WEBHOOK_API_REPLICAS=${WEBHOOK_API_REPLICAS:-3}

echo "📡 Iniciando Webhook API..."
echo "   - Réplicas: ${WEBHOOK_API_REPLICAS}"
echo "   - Porta interna: ${WEBHOOK_PORT:-3001}"
echo "   - Porta externa (via Nginx): ${PORT:-3000}"
echo "   - Lock TTL na criação: ${WEBHOOK_JOB_CREATE_LOCK_TTL:-5000}ms"
echo ""

# Inicia webhook-api com scale
docker-compose up -d --scale webhook-api="${WEBHOOK_API_REPLICAS}" webhook-api nginx

echo "✅ Webhook API iniciado!"
echo ""
echo "📊 Para ver logs: docker-compose logs -f webhook-api"
echo "📊 Para ver status: docker-compose ps webhook-api"
