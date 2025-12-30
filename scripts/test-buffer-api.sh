#!/bin/bash

# Script para testar o buffer de mensagens simulando webhooks do Chatwoot

API_URL="${API_URL:-http://localhost:3000}"
INBOX_ID="${INBOX_ID:-1}"
CONVERSATION_ID="${CONVERSATION_ID:-12345}"
PHONE_NUMBER="${PHONE_NUMBER:-5511999999999}"

echo "🧪 Teste do Buffer de Mensagens"
echo "================================"
echo ""
echo "API URL: $API_URL"
echo "Inbox ID: $INBOX_ID"
echo "Conversation ID: $CONVERSATION_ID"
echo "Phone Number: $PHONE_NUMBER"
echo ""

# Função para criar payload de webhook
create_webhook_payload() {
  local message_id=$1
  local has_attachment=$2
  
  if [ "$has_attachment" = "true" ]; then
    cat <<EOF
{
  "event": "automation_event.message_created",
  "inbox_id": $INBOX_ID,
  "account": {
    "id": 1
  },
  "conversation": {
    "id": $CONVERSATION_ID,
    "inbox_id": $INBOX_ID,
    "contact_inbox": {
      "source_id": "$PHONE_NUMBER"
    }
  },
  "messages": [
    {
      "id": $message_id,
      "account_id": 1,
      "content": "",
      "message_type": 1,
      "created_at": $(date +%s),
      "attachments": [
        {
          "id": $message_id,
          "file_type": "image",
          "data_url": "https://example.com/image-$message_id.jpg",
          "file_size": 1024
        }
      ],
      "sender": {
        "name": "Usuário Teste",
        "phone_number": "$PHONE_NUMBER"
      }
    }
  ],
  "meta": {
    "sender": {
      "name": "Usuário Teste",
      "phone_number": "$PHONE_NUMBER",
      "identifier": "${PHONE_NUMBER}@s.whatsapp.net"
    }
  }
}
EOF
  else
    cat <<EOF
{
  "event": "automation_event.message_created",
  "inbox_id": $INBOX_ID,
  "account": {
    "id": 1
  },
  "conversation": {
    "id": $CONVERSATION_ID,
    "inbox_id": $INBOX_ID,
    "contact_inbox": {
      "source_id": "$PHONE_NUMBER"
    }
  },
  "messages": [
    {
      "id": $message_id,
      "account_id": 1,
      "content": "Mensagem de texto $message_id",
      "message_type": 0,
      "created_at": $(date +%s),
      "sender": {
        "name": "Usuário Teste",
        "phone_number": "$PHONE_NUMBER"
      }
    }
  ],
  "meta": {
    "sender": {
      "name": "Usuário Teste",
      "phone_number": "$PHONE_NUMBER",
      "identifier": "${PHONE_NUMBER}@s.whatsapp.net"
    }
  }
}
EOF
  fi
}

echo "📤 Enviando 5 mensagens com anexos rapidamente..."
echo ""

# Envia 5 mensagens rapidamente
for i in {1..5}; do
  payload=$(create_webhook_payload "test-msg-$i" "true")
  
  response=$(curl -s -X POST "$API_URL/webhook/chatwoot" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  echo "  Mensagem $i:"
  echo "    Response: $response" | jq '.' 2>/dev/null || echo "    Response: $response"
  echo ""
  
  # Pequeno delay entre mensagens (100ms)
  sleep 0.1
done

echo "⏳ Aguardando 4 segundos para verificar processamento..."
sleep 4

echo ""
echo "📊 Verificando logs do sistema..."
echo ""
echo "Para ver logs em tempo real:"
echo "  docker-compose logs -f webhook-api | grep -E 'MessageBuffer|buffered'"
echo "  docker-compose logs -f worker | grep -E 'buffered|agrupada'"
echo ""
