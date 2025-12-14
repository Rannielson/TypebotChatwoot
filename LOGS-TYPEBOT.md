# 📋 Logs de Envio para o Typebot

Este documento descreve os logs detalhados que são gerados quando enviamos dados para o Typebot.

## 📤 Logs Implementados

Foram implementados logs estruturados e detalhados em dois pontos principais:

1. **MessageHandler** - Antes de enviar dados para o Typebot
2. **TypebotClient** - Na requisição HTTP real

## 🔍 Exemplo de Log - startChat

Quando uma nova sessão é iniciada no Typebot, você verá um log completo assim:

```
================================================================================
📤 ENVIANDO DADOS PARA O TYPEBOT - STARTCHAT
================================================================================

🔹 Método: startChat
🔹 Identificador: abc123-def456-ghi789
🔹 URL Base: https://chatwoot.example.com

📋 CONTEXTO DA MENSAGEM:
   • Nome do Contato: João Silva
   • Telefone: 5511999999999
   • ID da Conversa: 12345
   • ID da Mensagem: 67890
   • Texto da Mensagem: (vazio)
   • Tem Anexos: Não
   • Quantidade de Anexos: 0

📦 PAYLOAD ENVIADO PARA O TYPEBOT:
{
  "prefilledVariables": {
    "nome": "João Silva",
    "contato": "João Silva",
    "telefone": "5511999999999",
    "phone": "5511999999999",
    "conversa_id": "12345",
    "conversation_id": "12345",
    "chat_id": "12345",
    "message_id": "67890",
    "account_id": "1",
    "inbox_id": "2",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}

🔧 VARIÁVEIS PRÉ-PREENCHIDAS (disponíveis no Typebot):
   • {{nome}}: João Silva
   • {{contato}}: João Silva
   • {{telefone}}: 5511999999999
   • {{phone}}: 5511999999999
   • {{conversa_id}}: 12345
   • {{conversation_id}}: 12345
   • {{chat_id}}: 12345
   • {{message_id}}: 67890
   • {{account_id}}: 1
   • {{inbox_id}}: 2
   • {{timestamp}}: 2024-01-15T10:30:00.000Z

📊 DADOS DO CHATWOOT:
   • Account ID: 1
   • Inbox ID: 2
   • Chat ID: 12345
   • Content Type: text
   • Timestamp: 2024-01-15T10:30:00.000Z

================================================================================

🌐 [TypebotClient] Requisição HTTP para o Typebot:
   • Método: POST
   • URL: https://typebot.example.com/api/v1/typebots/abc123-def456-ghi789/startChat
   • Public ID: abc123-def456-ghi789
   • Payload: {
     "prefilledVariables": {
       "nome": "João Silva",
       "contato": "João Silva",
       "telefone": "5511999999999",
       ...
     }
   }
```

## 🔍 Exemplo de Log - continueChat

Quando uma sessão existente continua, você verá:

```
================================================================================
📤 ENVIANDO DADOS PARA O TYPEBOT - CONTINUECHAT
================================================================================

🔹 Método: continueChat
🔹 Identificador: session-abc123-def456
🔹 URL Base: https://chatwoot.example.com

📋 CONTEXTO DA MENSAGEM:
   • Nome do Contato: João Silva
   • Telefone: 5511999999999
   • ID da Conversa: 12345
   • ID da Mensagem: 67891
   • Texto da Mensagem: Olá, preciso de ajuda
   • Tem Anexos: Sim
   • Quantidade de Anexos: 1

📎 ANEXOS:
   1. ID: 123, Tipo: image, Tamanho: 102400 bytes
      URL: https://example.com/image.jpg

📦 PAYLOAD ENVIADO PARA O TYPEBOT:
{
  "message": {
    "type": "text",
    "text": "Olá, preciso de ajuda",
    "attachedFileUrls": [
      "https://example.com/image.jpg"
    ]
  }
}

💬 MENSAGEM ENVIADA:
   • Tipo: text
   • Texto: Olá, preciso de ajuda
   • URLs de Anexos: 1
     1. https://example.com/image.jpg

📊 DADOS DO CHATWOOT:
   • Account ID: 1
   • Inbox ID: 2
   • Chat ID: 12345
   • Content Type: text
   • Timestamp: 2024-01-15T10:31:00.000Z

================================================================================

🌐 [TypebotClient] Requisição HTTP para o Typebot:
   • Método: POST
   • URL: https://typebot.example.com/api/v1/sessions/session-abc123-def456/continueChat
   • Session ID: session-abc123-def456
   • Mensagem: Olá, preciso de ajuda
   • Anexos: 1 arquivo(s)
     1. https://example.com/image.jpg
   • Payload: {
     "message": {
       "type": "text",
       "text": "Olá, preciso de ajuda",
       "attachedFileUrls": [
         "https://example.com/image.jpg"
       ]
     }
   }
```

## 📊 Informações Capturadas nos Logs

### Informações do Contato
- Nome do contato
- Número de telefone
- ID da conversa
- ID da mensagem

### Variáveis Pré-preenchidas
- Todas as variáveis disponíveis no Typebot
- Valores exatos que serão usados

### Anexos
- Quantidade de anexos
- Detalhes de cada anexo (ID, tipo, tamanho, URL)

### Dados do Chatwoot
- Account ID
- Inbox ID
- Chat ID
- Content Type
- Timestamp

### Requisição HTTP
- Método HTTP
- URL completa
- Payload completo em JSON

## 🎯 Como Usar os Logs

1. **Debug**: Use os logs para verificar se as variáveis estão sendo passadas corretamente
2. **Monitoramento**: Monitore os logs para identificar problemas de comunicação
3. **Auditoria**: Os logs fornecem um registro completo de todas as interações

## 🔍 Onde Encontrar os Logs

Os logs aparecem no console/terminal onde a aplicação está rodando. Eles são gerados automaticamente sempre que:

- Uma nova sessão é iniciada no Typebot (`startChat`)
- Uma sessão existente continua (`continueChat`)

## ⚠️ Observações

- Os logs são gerados **antes** de enviar a requisição HTTP
- Os logs incluem informações sensíveis (telefones, IDs) - tenha cuidado ao compartilhar
- Os logs são formatados para facilitar a leitura humana
- O payload JSON está sempre formatado com indentação para facilitar a leitura
