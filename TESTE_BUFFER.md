# 🧪 Teste do Buffer de Mensagens

## ✅ Status da Implementação

O buffer de mensagens foi implementado com sucesso. Para testar em produção, você precisa:

## 📋 Pré-requisitos

1. **Inbox configurado**: Deve existir um inbox com ID válido no banco de dados
2. **Containers rodando**: `webhook-api` e `worker` devem estar em execução
3. **Redis acessível**: O Redis deve estar configurado e acessível

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Logs do Webhook-API

```bash
docker-compose logs -f webhook-api | grep -E "MessageBuffer|buffered|buffer"
```

**Logs esperados quando mensagem é adicionada ao buffer:**
```
[WebhookAPI] 📦 Mensagem adicionada ao buffer: inbox=1, conversation=123, bufferSize=2 (response: 15ms)
[MessageBufferService] Mensagem adicionada ao buffer: msg-buffer:1:123:5511999999999 (2 mensagem(ns) no buffer, timeout: 3000ms)
```

**Logs esperados quando buffer é processado:**
```
[MessageBufferService] 🚀 Processando buffer: msg-buffer:1:123:5511999999999 (3 mensagem(ns) agrupadas)
[MessageBufferService] ✅ Buffer processado: msg-buffer:1:123:5511999999999 (3 mensagem(ns) agrupadas em 1 job)
```

### 2. Verificar Logs do Worker

```bash
docker-compose logs -f worker | grep -E "buffered|agrupada|buffer"
```

**Logs esperados:**
```
[Worker] 📦 Processando mensagem agrupada do buffer: 3 mensagem(ns) agrupadas, processando apenas a primeira
```

### 3. Verificar Buffer no Redis

```bash
# Conectar ao Redis
redis-cli -h 37.27.106.75 -p 6381

# Listar chaves de buffer
KEYS msg-buffer:*

# Ver conteúdo de um buffer específico
GET msg-buffer:1:12345:5511999999999
```

## 🎯 Teste Manual

### Cenário: Múltiplas Imagens Enviadas Rapidamente

1. **Envie 5 imagens rapidamente** via WhatsApp para um número configurado no inbox
2. **Observe os logs** do webhook-api - você deve ver:
   - Mensagens sendo adicionadas ao buffer
   - Buffer sendo processado após timeout (3 segundos)
3. **Verifique o comportamento do bot**:
   - **Antes**: 5 respostas duplicadas ❌
   - **Agora**: 1 resposta única ✅

### Como Testar via API (se tiver inbox configurado)

```bash
# Substitua INBOX_ID, CONVERSATION_ID e PHONE_NUMBER pelos valores reais
INBOX_ID=1
CONVERSATION_ID=12345
PHONE_NUMBER=5511999999999
API_URL=http://localhost:3001

# Envia 3 mensagens com anexos rapidamente
for i in {1..3}; do
  curl -X POST "$API_URL/webhook/chatwoot" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"automation_event.message_created\",
      \"inbox_id\": $INBOX_ID,
      \"account\": {\"id\": 1},
      \"conversation\": {
        \"id\": $CONVERSATION_ID,
        \"inbox_id\": $INBOX_ID,
        \"contact_inbox\": {\"source_id\": \"$PHONE_NUMBER\"}
      },
      \"messages\": [{
        \"id\": \"test-$i\",
        \"account_id\": 1,
        \"content\": \"\",
        \"message_type\": 1,
        \"created_at\": $(date +%s),
        \"attachments\": [{
          \"id\": $i,
          \"file_type\": \"image\",
          \"data_url\": \"https://example.com/test-$i.jpg\",
          \"file_size\": 1024
        }],
        \"sender\": {
          \"name\": \"Teste\",
          \"phone_number\": \"$PHONE_NUMBER\"
        }
      }],
      \"meta\": {
        \"sender\": {
          \"name\": \"Teste\",
          \"phone_number\": \"$PHONE_NUMBER\",
          \"identifier\": \"${PHONE_NUMBER}@s.whatsapp.net\"
        }
      }
    }"
  sleep 0.1
done
```

## ✅ Indicadores de Sucesso

1. **Logs mostram buffer funcionando**:
   - Mensagens sendo adicionadas ao buffer
   - Buffer sendo processado após timeout
   - Apenas primeira mensagem sendo processada

2. **Comportamento do bot**:
   - Uma única resposta para múltiplas imagens
   - Sem respostas duplicadas

3. **Redis**:
   - Chaves de buffer aparecem temporariamente
   - Chaves são removidas após processamento

## ⚠️ Troubleshooting

### Buffer não está funcionando

1. **Verifique se o código foi compilado**:
   ```bash
   docker-compose exec webhook-api ls -la /app/dist/services/message-buffer.service.js
   ```

2. **Verifique variáveis de ambiente**:
   ```bash
   docker-compose exec webhook-api env | grep MESSAGE_BUFFER
   ```

3. **Verifique se mensagens têm anexos**:
   - Buffer só funciona para mensagens com anexos (por padrão)
   - Ou habilite `USE_MESSAGE_BUFFER=true` para todas as mensagens

### Logs não aparecem

1. **Verifique se containers estão rodando**:
   ```bash
   docker-compose ps webhook-api worker
   ```

2. **Verifique nível de log**:
   - Logs podem estar em nível `debug` ou `info`
   - Use `grep` para filtrar logs relevantes

## 📊 Métricas Esperadas

- **Tempo de resposta do webhook**: <50ms (resposta imediata)
- **Timeout do buffer**: 3 segundos (configurável)
- **Mensagens agrupadas**: Máximo 10 por buffer
- **Processamento**: Apenas primeira mensagem do grupo

---

**Última atualização**: 30/12/2025
**Status**: ✅ Implementação completa - Pronto para testes em produção
