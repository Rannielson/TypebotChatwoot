#!/bin/bash

# Teste simples do buffer de mensagens
# Simula múltiplas mensagens chegando rapidamente

API_URL="${API_URL:-http://localhost:3000}"
INBOX_ID="${INBOX_ID:-1}"
CONVERSATION_ID="${CONVERSATION_ID:-12345}"
PHONE_NUMBER="${PHONE_NUMBER:-5511999999999}"

echo "🧪 Teste do Buffer de Mensagens"
echo "================================"
echo ""
echo "📤 Enviando 5 mensagens com anexos rapidamente..."
echo ""

# Função para criar payload
create_payload() {
  local msg_id=$1
  cat <<EOF
{
  "event": "automation_event.message_created",
  "inbox_id": $INBOX_ID,
  "account": {"id": 1},
  "conversation": {
    "id": $CONVERSATION_ID,
    "inbox_id": $INBOX_ID,
    "contact_inbox": {"source_id": "$PHONE_NUMBER"}
  },
  "messages": [{
    "id": $msg_id,
    "account_id": 1,
    "content": "",
    "message_type": 1,
    "created_at": $(date +%s),
    "attachments": [{
      "id": $msg_id,
      "file_type": "image",
      "data_url": "https://example.com/test-$msg_id.jpg",
      "file_size": 1024
    }],
    "sender": {
      "name": "Teste",
      "phone_number": "$PHONE_NUMBER"
    }
  }],
  "meta": {
    "sender": {
      "name": "Teste",
      "phone_number": "$PHONE_NUMBER",
      "identifier": "${PHONE_NUMBER}@s.whatsapp.net"
    }
  }
}
EOF
}

# Envia 5 mensagens rapidamente
for i in {1..5}; do
  payload=$(create_payload "test-$i")
  
  echo "  📨 Enviando mensagem $i..."
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/webhook/chatwoot" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    event=$(echo "$body" | grep -o '"event":"[^"]*"' | cut -d'"' -f4)
    buffer_size=$(echo "$body" | grep -o '"buffer_size":[0-9]*' | cut -d':' -f2 || echo "N/A")
    echo "    ✅ HTTP $http_code - Event: $event - Buffer Size: $buffer_size"
  else
    echo "    ❌ HTTP $http_code"
    echo "    Response: $body"
  fi
  
  sleep 0.1
done

echo ""
echo "⏳ Aguardando 4 segundos para verificar processamento..."
sleep 4

echo ""
echo "📊 Verificando logs..."
echo ""
echo "Para ver logs em tempo real:"
echo "  docker-compose logs -f webhook-api | grep -E 'MessageBuffer|buffered'"
echo "  docker-compose logs -f worker | grep -E 'buffered|agrupada'"
echo ""
