#!/bin/bash

# Teste direto do buffer via Redis e API
# Verifica se o buffer está funcionando corretamente

API_URL="${API_URL:-http://localhost:3001}"
REDIS_HOST="${REDIS_HOST:-37.27.106.75}"
REDIS_PORT="${REDIS_PORT:-6381}"

echo "🧪 Teste do Buffer de Mensagens"
echo "================================"
echo ""
echo "API URL: $API_URL"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo ""

# Verifica se a API está respondendo
echo "1️⃣ Verificando se a API está respondendo..."
health=$(curl -s "$API_URL/health")
if [ $? -eq 0 ]; then
  echo "   ✅ API está respondendo"
  echo "   Response: $health"
else
  echo "   ❌ API não está respondendo"
  exit 1
fi

echo ""
echo "2️⃣ Verificando inboxes disponíveis..."
echo "   (Precisa de token de autenticação - pulando por enquanto)"
echo ""

# Teste direto via Redis (verifica estrutura do buffer)
echo "3️⃣ Verificando estrutura do buffer no Redis..."
echo "   Chaves de buffer: msg-buffer:*"
echo ""

# Cria payload de teste válido
create_test_payload() {
  local msg_id=$1
  cat <<EOF
{
  "event": "automation_event.message_created",
  "inbox_id": 1,
  "account": {
    "id": 1
  },
  "conversation": {
    "id": 12345,
    "inbox_id": 1,
    "contact_inbox": {
      "source_id": "5511999999999"
    }
  },
  "messages": [
    {
      "id": $msg_id,
      "account_id": 1,
      "content": "",
      "message_type": 1,
      "created_at": $(date +%s),
      "attachments": [
        {
          "id": $msg_id,
          "file_type": "image",
          "data_url": "https://example.com/test-$msg_id.jpg",
          "file_size": 1024
        }
      ],
      "sender": {
        "name": "Teste Buffer",
        "phone_number": "5511999999999"
      }
    }
  ],
  "meta": {
    "sender": {
      "name": "Teste Buffer",
      "phone_number": "5511999999999",
      "identifier": "5511999999999@s.whatsapp.net"
    }
  }
}
EOF
}

echo "4️⃣ Enviando 3 mensagens de teste com anexos..."
echo ""

for i in {1..3}; do
  payload=$(create_test_payload "buffer-test-$i")
  
  echo "   📨 Mensagem $i..."
  response=$(curl -s -X POST "$API_URL/webhook/chatwoot" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  echo "   Response: $response"
  echo ""
  
  sleep 0.2
done

echo "⏳ Aguardando 2 segundos..."
sleep 2

echo ""
echo "5️⃣ Verificando logs do webhook-api..."
echo ""
docker-compose -f docker/docker-compose.yml logs --tail=50 webhook-api | grep -E "MessageBuffer|buffered|buffer" || echo "   (Nenhum log de buffer encontrado ainda)"
echo ""

echo "6️⃣ Verificando logs do worker..."
echo ""
docker-compose -f docker/docker-compose.yml logs --tail=50 worker | grep -E "buffered|agrupada|buffer" || echo "   (Nenhum log de buffer encontrado ainda)"
echo ""

echo "✅ Teste concluído!"
echo ""
echo "💡 Para monitorar em tempo real:"
echo "   docker-compose logs -f webhook-api | grep -E 'MessageBuffer|buffered'"
echo "   docker-compose logs -f worker | grep -E 'buffered|agrupada'"
echo ""
