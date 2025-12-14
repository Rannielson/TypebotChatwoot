# Variáveis Disponíveis no Typebot

As variáveis normalizadas do Chatwoot são automaticamente passadas para o Typebot e podem ser usadas em qualquer lugar do seu fluxo.

## 📋 Lista de Variáveis Disponíveis

### 👤 Informações do Contato

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{nome}}` | Nome do contato | "João Silva" |
| `{{contato}}` | Nome do contato (alias) | "João Silva" |
| `{{telefone}}` | Número de telefone (apenas dígitos) | "5511999999999" |
| `{{phone}}` | Número de telefone (alias) | "5511999999999" |

### 💬 IDs da Conversa e Mensagem

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{conversa_id}}` | ID da conversa no Chatwoot | "12345" |
| `{{conversation_id}}` | ID da conversa (alias) | "12345" |
| `{{chat_id}}` | ID do chat (mesmo que conversation_id) | "12345" |
| `{{message_id}}` | ID da mensagem atual | "67890" |

### 🏢 IDs do Chatwoot

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{account_id}}` | ID da conta no Chatwoot | "1" |
| `{{inbox_id}}` | ID do inbox no Chatwoot | "2" |

### ⏰ Timestamp

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{timestamp}}` | Timestamp da mensagem (ISO 8601) | "2024-01-15T10:30:00.000Z" |

## 🎯 Como Usar no Typebot

### 1. Em Mensagens de Texto

Use a sintaxe `{{nome_da_variavel}}` em qualquer mensagem de texto:

```
Olá {{nome}}! 

Seu telefone é {{telefone}} e o ID da conversa é {{conversa_id}}.
```

### 2. Em Condições (If/Then)

Use as variáveis em condições para personalizar o fluxo:

```
Se {{nome}} contém "Silva", então...
```

### 3. Em Campos de Input

As variáveis podem ser usadas como valores pré-preenchidos em campos de input:

- Campo: `Nome`
- Valor pré-preenchido: `{{nome}}`

### 4. Em Integrações (Webhooks, APIs)

Passe as variáveis como parâmetros em integrações:

```json
{
  "nome": "{{nome}}",
  "telefone": "{{telefone}}",
  "conversa_id": "{{conversa_id}}"
}
```

### 5. Em Código (Code Block)

Use as variáveis em blocos de código JavaScript:

```javascript
const nome = "{{nome}}";
const telefone = "{{telefone}}";
console.log(`Contato: ${nome} - ${telefone}`);
```

## 📝 Exemplos Práticos

### Exemplo 1: Saudação Personalizada

```
Olá {{nome}}! 👋

Bem-vindo ao nosso atendimento. 
Sua conversa #{{conversa_id}} está sendo processada.
```

### Exemplo 2: Mensagem com Informações

```
Olá {{nome}}!

Detalhes da sua conversa:
📱 Telefone: {{telefone}}
🆔 ID Conversa: {{conversa_id}}
📅 Data: {{timestamp}}
```

### Exemplo 3: Condição Baseada no Nome

```
Se {{nome}} contém "VIP", então:
  → Enviar mensagem especial para cliente VIP
Senão:
  → Enviar mensagem padrão
```

## ⚠️ Observações Importantes

1. **Case Sensitive**: As variáveis são case-sensitive. Use exatamente como mostrado: `{{nome}}` (não `{{Nome}}` ou `{{NOME}}`).

2. **Valores Padrão**: 
   - Se o nome não estiver disponível, será usado "Usuário"
   - Se o telefone não estiver disponível, será uma string vazia

3. **Formato do Telefone**: O telefone vem apenas com dígitos (sem formatação). Exemplo: `5511999999999`

4. **IDs como String**: Todos os IDs são passados como strings, mesmo que sejam numéricos.

5. **Timestamp**: O timestamp está no formato ISO 8601 (UTC).

## 🔄 Atualização Automática

As variáveis são atualizadas automaticamente a cada nova mensagem recebida do Chatwoot, garantindo que você sempre tenha os dados mais recentes do contato e da conversa.

## 🧪 Testando as Variáveis

Para testar se as variáveis estão funcionando:

1. Envie uma mensagem através do Chatwoot
2. No Typebot, crie uma mensagem de texto com: `{{nome}} - {{telefone}} - {{conversa_id}}`
3. Verifique se os valores aparecem corretamente

---

**Última atualização**: As variáveis são passadas automaticamente no `startChat` do Typebot através do campo `prefilledVariables`.
