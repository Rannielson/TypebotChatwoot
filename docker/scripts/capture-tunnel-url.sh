#!/bin/bash

# Script para capturar a URL do túnel e salvar em arquivo compartilhado

TUNNEL_CONTAINER="typebot_connector_tunnel"
OUTPUT_FILE="/shared/tunnel-url.txt"
MAX_WAIT=30
WAIT_COUNT=0

echo "Aguardando túnel gerar URL..."

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  TUNNEL_URL=$(docker logs $TUNNEL_CONTAINER 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
  
  if [ ! -z "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > $OUTPUT_FILE
    echo "✅ URL do túnel capturada: $TUNNEL_URL"
    exit 0
  fi
  
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

echo "⚠️  Timeout aguardando URL do túnel"
exit 1

