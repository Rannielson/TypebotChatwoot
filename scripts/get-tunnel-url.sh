#!/bin/bash

# Script para obter a URL do túnel público

echo "🔍 Obtendo URL do túnel público..."
echo ""

TUNNEL_URL=$(docker logs typebot_connector_tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Túnel ainda não está pronto. Aguarde alguns segundos e execute novamente."
    echo ""
    echo "Para ver os logs do túnel:"
    echo "  docker logs typebot_connector_tunnel"
    exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/webhook/chatwoot"

echo "✅ URL do túnel encontrada:"
echo ""
echo "🌐 Túnel público: $TUNNEL_URL"
echo "📡 Webhook URL:   $WEBHOOK_URL"
echo ""
echo "📝 Adicione esta URL no seu arquivo .env:"
echo "   WEBHOOK_URL=$WEBHOOK_URL"
echo ""
echo "Ou configure diretamente no Chatwoot:"
echo "   $WEBHOOK_URL"

