# 📤 Formato de Requisição para Typebot startChat

Este documento descreve o formato simplificado usado para enviar requisições ao endpoint `startChat` do Typebot.

## 🎯 Formato Implementado

O formato foi simplificado para sempre incluir `message` (como string) e `prefilledVariables`:

### ✅ Formato Padrão (sem anexos)

```json
{
  "message": "texto da mensagem ou string vazia",
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "conversa_id": "12345",
    ...
  }
}
```

### ✅ Formato com Anexos

Quando há anexos, o `message` é enviado como objeto para incluir `attachedFileUrls`:

```json
{
  "message": {
    "type": "text",
    "text": "texto da mensagem ou string vazia",
    "attachedFileUrls": [
      "https://example.com/image.jpg"
    ]
  },
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "conversa_id": "12345",
    ...
  }
}
```

## 📋 Exemplos Práticos

### Exemplo 1: Mensagem de texto simples

**Requisição:**
```json
{
  "message": "Oi",
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "origem": "whatsapp",
    "canal": "chatwoot",
    "id_conversa_chatwoot": "cw_983742",
    "conversa_id": "12345",
    "account_id": "1",
    "inbox_id": "2"
  }
}
```

**cURL equivalente:**
```bash
curl --request POST \
  --url https://assistenteatomos.cleoia.com.br/api/v1/typebots/meu-typebot-zyyctxt/startChat \
  --header 'Authorization: Bearer rXrmBBq0LfWhx219AdFeHIfo' \
  --header 'Content-Type: application/json' \
  --data '{
    "message": "Oi",
    "prefilledVariables": {
      "telefone": "5511999999999",
      "nome": "João Silva",
      "origem": "whatsapp",
      "canal": "chatwoot",
      "id_conversa_chatwoot": "cw_983742",
      "conversa_id": "12345"
    }
  }'
```

### Exemplo 2: Iniciar sem mensagem (início do fluxo)

**Requisição:**
```json
{
  "message": "",
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "conversa_id": "12345"
  }
}
```

### Exemplo 3: Mensagem com anexos

**Requisição:**
```json
{
  "message": {
    "type": "text",
    "text": "Olá, veja esta imagem",
    "attachedFileUrls": [
      "https://example.com/image.jpg"
    ]
  },
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "conversa_id": "12345"
  }
}
```

### Exemplo 4: Apenas anexos (sem texto)

**Requisição:**
```json
{
  "message": {
    "type": "text",
    "text": "",
    "attachedFileUrls": [
      "https://example.com/image.jpg"
    ]
  },
  "prefilledVariables": {
    "telefone": "5511999999999",
    "nome": "João Silva",
    "conversa_id": "12345"
  }
}
```

## 🔧 Variáveis Pré-preenchidas Disponíveis

As seguintes variáveis são automaticamente incluídas no `prefilledVariables`:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `nome` | Nome do contato | "João Silva" |
| `contato` | Nome do contato (alias) | "João Silva" |
| `telefone` | Número de telefone | "5511999999999" |
| `phone` | Número de telefone (alias) | "5511999999999" |
| `conversa_id` | ID da conversa | "12345" |
| `conversation_id` | ID da conversa (alias) | "12345" |
| `chat_id` | ID do chat | "12345" |
| `message_id` | ID da mensagem | "67890" |
| `account_id` | ID da conta Chatwoot | "1" |
| `inbox_id` | ID do inbox Chatwoot | "2" |
| `timestamp` | Timestamp da mensagem | "2024-01-15T10:30:00.000Z" |

## 📝 Mudanças Implementadas

### Antes:
- Quando não havia mensagem, enviava apenas `{ prefilledVariables: {...} }`
- Quando havia apenas anexos, enviava objeto complexo

### Agora:
- **Sempre** envia `message` (string ou objeto)
- **Sempre** envia `prefilledVariables`
- Formato mais enxuto e consistente
- Compatível com o formato esperado pelo Typebot

## 🎯 Benefícios

1. **Consistência**: Sempre envia `message` e `prefilledVariables`
2. **Simplicidade**: Formato mais enxuto e fácil de entender
3. **Compatibilidade**: Formato alinhado com a API do Typebot
4. **Flexibilidade**: Suporta mensagens simples e com anexos

## ⚠️ Observações

- Quando não há texto na mensagem, `message` é enviado como string vazia `""`
- Quando há anexos, `message` é enviado como objeto para incluir `attachedFileUrls`
- Todas as variáveis do normalizador são automaticamente incluídas
- O formato é compatível com versões recentes do Typebot
