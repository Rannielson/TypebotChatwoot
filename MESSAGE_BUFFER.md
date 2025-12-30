# 📦 Buffer de Mensagens - Evitar Respostas Duplicadas

## ✅ Status da Implementação

- ✅ MessageBufferService criado
- ✅ Integração com webhook.routes.ts
- ✅ Worker atualizado para processar mensagens agrupadas
- ✅ Configuração via variáveis de ambiente
- ✅ Sistema funcionando e pronto para uso

## 📋 Problema Resolvido

Quando um associado envia várias imagens/fotos rapidamente, o bot estava respondendo múltiplas vezes com a mesma mensagem. O buffer agrupa essas mensagens e processa apenas uma vez, evitando respostas duplicadas.

## 🔧 Como Funciona

### Fluxo Normal (sem buffer)

1. Mensagem 1 chega → Processa imediatamente → Resposta 1
2. Mensagem 2 chega → Processa imediatamente → Resposta 2
3. Mensagem 3 chega → Processa imediatamente → Resposta 3
4. **Resultado**: 3 respostas duplicadas ❌

### Fluxo com Buffer

1. Mensagem 1 chega → Adiciona ao buffer → Aguarda timeout
2. Mensagem 2 chega → Adiciona ao buffer → Reinicia timeout
3. Mensagem 3 chega → Adiciona ao buffer → Reinicia timeout
4. Timeout atingido → Processa apenas a primeira mensagem → **1 resposta única** ✅

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Timeout do buffer em milissegundos (padrão: 3000ms = 3 segundos)
MESSAGE_BUFFER_TIMEOUT_MS=3000

# Habilita buffer para todas as mensagens (true) ou apenas para mensagens com anexos (false)
USE_MESSAGE_BUFFER=false
```

### Comportamento Padrão

- **Mensagens com anexos** (imagens, áudios, vídeos): **SEMPRE** usam buffer
- **Mensagens de texto**: Processadas imediatamente (sem buffer)
- **USE_MESSAGE_BUFFER=true**: Todas as mensagens usam buffer

### Configuração Recomendada

```bash
# Para evitar respostas duplicadas em múltiplas imagens
MESSAGE_BUFFER_TIMEOUT_MS=3000  # 3 segundos
USE_MESSAGE_BUFFER=false        # Apenas anexos usam buffer

# Para buffer em todas as mensagens (mais conservador)
MESSAGE_BUFFER_TIMEOUT_MS=2000  # 2 segundos
USE_MESSAGE_BUFFER=true         # Todas as mensagens usam buffer
```

## 📊 Características do Buffer

### Agrupamento

- **Chave única**: `inbox_id:conversation_id:phone_number`
- **Timeout configurável**: Padrão 3 segundos
- **Tamanho máximo**: 10 mensagens por buffer
- **Ordenação**: Mensagens ordenadas por timestamp

### Processamento

- **Estratégia**: Processa apenas a **primeira mensagem** do grupo
- **Razão**: Todas as mensagens são do mesmo usuário na mesma conversa
- **Resultado**: Uma única resposta para múltiplas mensagens

### Redis

- **Armazenamento**: Buffer armazenado no Redis
- **TTL**: Timeout + 10 segundos (segurança)
- **Limpeza**: Automática após processamento

## 🔍 Monitoramento

### Logs do Buffer

```bash
docker-compose logs -f webhook-api | grep "MessageBuffer"
```

### Exemplo de Logs

**Quando mensagem é adicionada ao buffer:**
```
[WebhookAPI] 📦 Mensagem adicionada ao buffer: inbox=1, conversation=123, bufferSize=2 (response: 15ms)
[MessageBufferService] Mensagem adicionada ao buffer: msg-buffer:1:123:5511999999999 (2 mensagem(ns) no buffer, timeout: 3000ms)
```

**Quando buffer é processado:**
```
[MessageBufferService] 🚀 Processando buffer: msg-buffer:1:123:5511999999999 (3 mensagem(ns) agrupadas)
[MessageBufferService] ✅ Buffer processado: msg-buffer:1:123:5511999999999 (3 mensagem(ns) agrupadas em 1 job)
[Worker] 📦 Processando mensagem agrupada do buffer: 3 mensagem(ns) agrupadas, processando apenas a primeira
```

## 🎯 Casos de Uso

### 1. Múltiplas Imagens

**Cenário**: Usuário envia 5 fotos rapidamente

**Sem buffer**: 5 respostas do bot ❌
**Com buffer**: 1 resposta do bot ✅

### 2. Áudio + Imagem

**Cenário**: Usuário envia áudio e depois imagem

**Sem buffer**: 2 respostas do bot ❌
**Com buffer**: 1 resposta do bot ✅

### 3. Mensagem de Texto

**Cenário**: Usuário envia apenas texto

**Comportamento**: Processa imediatamente (sem buffer) ✅
**Razão**: Texto não causa problema de múltiplas respostas

## ⚙️ Detalhes Técnicos

### Arquivos Criados/Modificados

1. **Service**: `src/services/message-buffer.service.ts` (novo)
2. **Rotas**: `src/routes/webhook.routes.ts` (integração do buffer)
3. **Worker**: `src/workers/webhook.worker.ts` (suporte a mensagens agrupadas)
4. **Config**: `docker/docker-compose.yml` (variáveis de ambiente)

### Fluxo de Execução

1. **Webhook recebe mensagem** com anexos
2. **MessageBufferService.addMessage()** adiciona ao buffer
3. **Timer aguarda** timeout configurado (padrão: 3s)
4. **Se novas mensagens chegam**, timer é reiniciado
5. **Após timeout**, buffer é processado
6. **Apenas primeira mensagem** é processada
7. **Uma única resposta** é enviada

### Estrutura do Buffer

```typescript
interface MessageBuffer {
  messages: BufferedMessage[];  // Mensagens agrupadas
  lastUpdate: number;           // Última atualização
  processing: boolean;          // Flag de processamento
}
```

## 🚨 Importante

- ⚠️ Buffer **não** armazena mensagens permanentemente
- ⚠️ Buffer é **limpo automaticamente** após processamento
- ⚠️ Timeout muito curto pode não agrupar mensagens suficientes
- ⚠️ Timeout muito longo pode causar atraso desnecessário
- ✅ **Recomendado**: 2-5 segundos para maioria dos casos

## 📝 Exemplo de Configuração no Docker

```yaml
environment:
  # Buffer de 3 segundos (padrão)
  MESSAGE_BUFFER_TIMEOUT_MS: 3000
  
  # Apenas mensagens com anexos usam buffer
  USE_MESSAGE_BUFFER: false
```

## 🔄 Ajustes Finais

Se ainda houver respostas duplicadas:

1. **Aumente o timeout**: `MESSAGE_BUFFER_TIMEOUT_MS=5000` (5 segundos)
2. **Habilite buffer global**: `USE_MESSAGE_BUFFER=true`
3. **Monitore os logs** para verificar se o buffer está funcionando

---

**Status**: ✅ Implementação completa e funcional
**Última atualização**: 30/12/2025
