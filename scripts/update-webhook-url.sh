#!/bin/bash

# Script para atualizar a URL do webhook no .env

echo "🔍 Obtendo URL do túnel público..."

TUNNEL_URL=$(docker logs typebot_connector_tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Túnel ainda não está pronto. Aguarde alguns segundos e execute novamente."
    echo ""
    echo "Para ver os logs do túnel:"
    echo "  docker logs typebot_connector_tunnel"
    exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/webhook/chatwoot"

echo "✅ URL do túnel encontrada: $TUNNEL_URL"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

# Atualiza ou adiciona WEBHOOK_URL no .env
if grep -q "^WEBHOOK_URL=" .env 2>/dev/null; then
    # Atualiza linha existente
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$WEBHOOK_URL|" .env
    else
        # Linux
        sed -i "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$WEBHOOK_URL|" .env
    fi
    echo "✅ WEBHOOK_URL atualizado no .env"
else
    # Adiciona nova linha
    echo "" >> .env
    echo "# Webhook URL público (túnel Cloudflare)" >> .env
    echo "WEBHOOK_URL=$WEBHOOK_URL" >> .env
    echo "✅ WEBHOOK_URL adicionado ao .env"
fi

echo ""
echo "📝 Configure esta URL no Chatwoot:"
echo "   $WEBHOOK_URL"
echo ""
echo "⚠️  Nota: A URL do túnel pode mudar quando o container for reiniciado."
echo "   Execute este script novamente após reiniciar o túnel."

