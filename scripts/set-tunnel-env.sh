#!/bin/bash

# Script para capturar URL do túnel e atualizar .env e docker-compose

echo "🔍 Capturando URL do túnel..."

TUNNEL_URL=$(docker logs typebot_connector_tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Túnel ainda não está pronto. Aguarde alguns segundos."
    echo "   Execute: docker logs typebot_connector_tunnel"
    exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/webhook/chatwoot"

echo "✅ URL encontrada: $TUNNEL_URL"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

# Atualiza .env
if grep -q "^WEBHOOK_URL=" .env 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$WEBHOOK_URL|" .env
    else
        sed -i "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$WEBHOOK_URL|" .env
    fi
    echo "✅ .env atualizado"
else
    echo "" >> .env
    echo "# Webhook URL público (túnel Cloudflare)" >> .env
    echo "WEBHOOK_URL=$WEBHOOK_URL" >> .env
    echo "✅ WEBHOOK_URL adicionado ao .env"
fi

# Atualiza docker-compose.yml com variável de ambiente
cd docker
if grep -q "WEBHOOK_URL:" docker-compose.yml 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|WEBHOOK_URL:.*|WEBHOOK_URL: \${WEBHOOK_URL:-$WEBHOOK_URL}|" docker-compose.yml
    else
        sed -i "s|WEBHOOK_URL:.*|WEBHOOK_URL: \${WEBHOOK_URL:-$WEBHOOK_URL}|" docker-compose.yml
    fi
    echo "✅ docker-compose.yml atualizado"
else
    # Adiciona após FRONTEND_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "/FRONTEND_URL:/a\\
      WEBHOOK_URL: \${WEBHOOK_URL:-$WEBHOOK_URL}" docker-compose.yml
    else
        sed -i "/FRONTEND_URL:/a\\      WEBHOOK_URL: \${WEBHOOK_URL:-$WEBHOOK_URL}" docker-compose.yml
    fi
    echo "✅ WEBHOOK_URL adicionado ao docker-compose.yml"
fi

echo ""
echo "📝 Para aplicar as mudanças, reinicie o container app:"
echo "   cd docker && docker-compose restart app"
echo ""
echo "🌐 Configure no Chatwoot:"
echo "   $WEBHOOK_URL"

