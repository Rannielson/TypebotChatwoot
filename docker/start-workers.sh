#!/bin/bash

# Script para iniciar workers com número configurável de réplicas
# Uso: ./docker/start-workers.sh

cd "$(dirname "$0")" || exit 1

# Lê número de réplicas do .env ou usa padrão
WORKER_REPLICAS=${WORKER_REPLICAS:-2}

echo "🚀 Iniciando workers..."
echo "   - Réplicas: ${WORKER_REPLICAS}"
echo "   - Concurrency por worker:"
echo "     * Webhook: ${WEBHOOK_WORKER_CONCURRENCY:-50}"
echo "     * Log: ${LOG_WORKER_CONCURRENCY:-20}"
echo "     * Chatwoot Note: ${CHATWOOT_NOTE_WORKER_CONCURRENCY:-20}"
echo ""

# Inicia workers com scale
docker-compose up -d --scale worker="${WORKER_REPLICAS}" worker

echo "✅ Workers iniciados!"
