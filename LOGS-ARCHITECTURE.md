# Arquitetura de Logs - Webhook API vs Worker

## Visão Geral

A aplicação está dividida em **dois containers separados** para processamento de webhooks:

1. **Webhook API** - Recebe e valida webhooks (rápido, <50ms)
2. **Worker** - Processa jobs da fila (pode levar segundos)

## Fluxo de Processamento

```
┌─────────────────┐
│   Chatwoot      │
└────────┬────────┘
         │ POST /webhook/chatwoot
    ┌────▼──────────────────────────┐
    │  Webhook API Container        │
    │  - Valida payload             │
    │  - Cria job na fila           │
    │  - Responde 200 OK (<50ms)    │
    │  Logs: [WebhookAPI]           │
    └────┬──────────────────────────┘
         │ Job criado
    ┌────▼──────────────────────────┐
    │  BullMQ Queue (Redis)          │
    └────┬──────────────────────────┘
         │ Job consumido
    ┌────▼──────────────────────────┐
    │  Worker Container              │
    │  - Processa mensagem           │
    │  - Chama Typebot               │
    │  - Envia para WhatsApp         │
    │  Logs: [Worker], [MessageHandler], [TypebotClient] │
    └────────────────────────────────┘
```

## Logs por Container

### Webhook API Container

**Responsabilidade**: Receber webhook, validar, criar job, responder imediatamente.

**Logs esperados**:
```
[WebhookAPI] ✅ Job criado: msg-334-16339119 (response: 25ms)
[WebhookAPI] ⚠️ Job msg-334-16339119 já está sendo criado por outra réplica (response: 15ms)
```

**O que NÃO deve aparecer aqui**:
- ❌ `[TypebotClient]` - Isso roda no Worker
- ❌ `[MessageHandler]` - Isso roda no Worker
- ❌ `[Worker]` - Isso é do Worker

### Worker Container

**Responsabilidade**: Processar jobs da fila, chamar Typebot, enviar mensagens.

**Logs esperados**:
```
[TypebotClient] Iniciando chat - Public ID: meu-typebot-zyyctxt, Request: {}
[TypebotClient] Resposta recebida (tipo: objeto): {...}
[MessageHandler] Resposta do Typebot startChat: {...}
[MessageHandler] Nova sessão iniciada. Mostrando resposta inicial do Typebot primeiro.
[MessageHandler] Mensagem do usuário "Oi" será processada na próxima interação.
[MessageHandler] Atualizando sessão final com sessionId: d6n36zx9d1lzbvkstr6b372s
[Worker] Job msg-334-16339119 completado em 4597ms
```

**O que NÃO deve aparecer aqui**:
- ❌ `[WebhookAPI]` - Isso roda no Webhook API

## Como Verificar Logs

### Ver logs do Webhook API

```bash
docker-compose logs -f webhook-api
```

Você deve ver apenas:
- Logs de inicialização do servidor
- `[WebhookAPI]` logs de criação de jobs
- Erros de validação

### Ver logs do Worker

```bash
docker-compose logs -f worker
```

Você deve ver:
- `[Worker]` logs de processamento
- `[MessageHandler]` logs de processamento de mensagens
- `[TypebotClient]` logs de comunicação com Typebot
- `[SessionService]` logs de gerenciamento de sessões

### Ver todos os logs

```bash
docker-compose logs -f
```

## Por que os logs estão no Worker?

Os logs que você viu (`[TypebotClient]`, `[Webhook]`) estão no Worker porque:

1. **Webhook API** apenas recebe e cria o job (muito rápido, <50ms)
2. **Worker** é quem realmente processa a mensagem:
   - Chama `messageHandler.handleMessage()`
   - Que chama `typebotClient.startChat()`
   - Que gera os logs `[TypebotClient]`

## Correções Aplicadas

✅ Renomeado `[Webhook]` → `[MessageHandler]` nos logs do handler
✅ Adicionado `[WebhookAPI]` nos logs do webhook route
✅ Mantido `[Worker]` nos logs do worker
✅ Mantido `[TypebotClient]` nos logs do cliente Typebot

Agora fica claro de onde cada log vem!

## Exemplo de Logs Corretos

### Webhook API (Container separado)
```
📡 Webhook Server rodando na porta 3001
[WebhookAPI] ✅ Job criado: msg-334-16339119 (response: 25ms)
[WebhookAPI] ✅ Job criado: msg-334-16339120 (response: 23ms)
```

### Worker (Container separado)
```
✅ Webhook Worker: Ativo
[TypebotClient] Iniciando chat - Public ID: meu-typebot-zyyctxt
[TypebotClient] Resposta recebida (tipo: objeto): {...}
[MessageHandler] Resposta do Typebot startChat: {...}
[MessageHandler] Nova sessão iniciada. Mostrando resposta inicial do Typebot primeiro.
[Worker] Job msg-334-16339119 completado em 4597ms
```

## Troubleshooting

### Se ver `[WebhookAPI]` no Worker
- ❌ Algo está errado - webhook-api não deveria processar mensagens

### Se ver `[TypebotClient]` no Webhook API
- ❌ Algo está errado - webhook-api não deveria chamar Typebot

### Se não ver `[WebhookAPI]` logs
- Verifique se o webhook-api está rodando: `docker-compose ps webhook-api`
- Verifique se está recebendo webhooks: `docker-compose logs webhook-api | grep WebhookAPI`
