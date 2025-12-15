# 📬 Guia de Configuração de Inboxes

Este guia explica como configurar as inboxes no sistema e o que cada campo faz.

## 🔗 URL do Webhook para Chatwoot

**Copie esta URL e configure no Chatwoot:**

```
https://connectwebhook.atomos.tech/webhook/chatwoot
```

### Como configurar no Chatwoot:

1. Acesse o Chatwoot → **Settings** → **Applications** → **Webhooks**
2. Clique em **Add Webhook**
3. Cole a URL acima no campo **Webhook URL**
4. Selecione os eventos:
   - ✅ `automation_event.message_created` - Para processar mensagens recebidas
   - ✅ `automation_event.conversation_updated` - Para encerrar sessões quando conversa é resolvida
5. Salve a configuração

---

## 📋 Campos do Formulário de Inbox

### Campos Obrigatórios (*)

#### 1. **Tenant** *
- **O que é**: O tenant (empresa/cliente) ao qual este inbox pertence
- **Como preencher**: Selecione o tenant na lista dropdown
- **Exemplo**: "Minha Empresa", "Cliente ABC"
- **Importante**: Cada inbox deve estar vinculado a um tenant

#### 2. **ID do Inbox (Chatwoot)** *
- **O que é**: O ID numérico do inbox no Chatwoot
- **Como encontrar**: 
  - No Chatwoot, vá em **Settings** → **Inboxes**
  - Clique no inbox desejado
  - O ID aparece na URL: `https://chatwoot.com/app/accounts/1/inboxes/290` → ID é `290`
- **Exemplo**: `290`, `123`, `456`
- **Importante**: Este ID é usado para identificar qual inbox do Chatwoot está enviando o webhook

#### 3. **Nome do Inbox** *
- **O que é**: Nome descritivo para identificar o inbox no sistema
- **Como preencher**: Use um nome que facilite a identificação
- **Exemplo**: "2121 - WR", "Atendimento Principal", "Suporte Técnico"
- **Importante**: Este nome é apenas para organização interna, não afeta o funcionamento

#### 4. **WhatsApp Phone Number ID** *
- **O que é**: O ID do número de telefone do WhatsApp Business configurado no Meta for Developers
- **Como encontrar**:
  1. Acesse [Meta for Developers](https://developers.facebook.com/)
  2. Vá em **WhatsApp** → **API Setup**
  3. Copie o **Phone number ID** (não é o número de telefone, é um ID numérico)
- **Exemplo**: `123456789012345`
- **Importante**: Este ID é necessário para enviar mensagens via WhatsApp API

#### 5. **WhatsApp Access Token** *
- **O que é**: Token de acesso permanente do WhatsApp Business API
- **Como obter**:
  1. No Meta for Developers, vá em **WhatsApp** → **API Setup**
  2. Role até **Temporary access token** ou configure um **Permanent token**
  3. Para produção, use um **Permanent token** (não expira)
  4. Copie o token completo
- **Exemplo**: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Importante**: 
  - Mantenha este token seguro e privado
  - Tokens temporários expiram em 24 horas
  - Use tokens permanentes em produção

#### 6. **WhatsApp API Version** (Opcional)
- **O que é**: Versão da API do WhatsApp que será usada
- **Valor padrão**: `v21.0`
- **Como preencher**: Deixe o padrão ou atualize se necessário
- **Exemplo**: `v21.0`, `v20.0`, `v19.0`
- **Importante**: Use a versão mais recente suportada pelo Meta

#### 7. **Typebot Base URL** *
- **O que é**: URL base do seu Typebot (Viewer)
- **Como preencher**: URL completa do Typebot Viewer sem barra no final
- **Exemplo**: 
  - `https://assistenteatomos.cleoia.com.br`
  - `https://viewer.typebot.io`
- **Importante**: Esta é a URL onde o Typebot está hospedado e acessível publicamente

#### 8. **Typebot Public ID** *
- **O que é**: ID público do seu bot no Typebot
- **Como encontrar**:
  1. No Typebot Builder, abra o bot desejado
  2. Vá em **Settings** → **General**
  3. Copie o **Public ID** (geralmente termina com algo como `-zyyctxt`)
- **Exemplo**: `meu-typebot-zyyctxt`, `atendimento-abc123`
- **Importante**: Este ID é usado para iniciar conversas no Typebot

#### 9. **Typebot API Key** (Opcional)
- **O que é**: Chave de API do Typebot para autenticação
- **Quando usar**: Necessário apenas se o Typebot estiver configurado com autenticação
- **Como obter**:
  1. No Typebot Builder, vá em **Settings** → **General**
  2. Role até **API Key** e gere uma nova chave
- **Exemplo**: `typebot_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Importante**: 
  - Deixe vazio se o Typebot não requer autenticação
  - Necessário apenas para Typebots privados ou com autenticação habilitada

#### 10. **Chatwoot API Token** (Opcional)
- **O que é**: Token de API do Chatwoot para criar notas privadas
- **Quando usar**: Necessário para criar notas privadas no Chatwoot quando mensagens são enviadas
- **Como obter**:
  1. No Chatwoot, vá em **Settings** → **Applications** → **Access Tokens**
  2. Clique em **Add Token**
  3. Dê um nome (ex: "Typebot Connector")
  4. Copie o token gerado
- **Exemplo**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Importante**: 
  - Se não fornecido, usa o token do tenant ou variável de ambiente
  - Necessário para registrar mensagens enviadas via WhatsApp no Chatwoot

#### 11. **Ativo** (is_active)
- **O que é**: Define se o inbox está ativo e processando mensagens
- **Valores**: 
  - `true` - Inbox ativo (processa mensagens)
  - `false` - Inbox inativo (ignora mensagens)
- **Padrão**: `true`
- **Importante**: 
  - Use `false` para desativar temporariamente um inbox sem deletá-lo
  - Útil para manutenção ou testes

---

## 🔄 Fluxo de Funcionamento

1. **Mensagem chega no WhatsApp** → Chatwoot recebe
2. **Chatwoot envia webhook** → `https://connectwebhook.atomos.tech/webhook/chatwoot`
3. **Sistema identifica o inbox** → Usa `inbox_id` do webhook
4. **Busca configuração** → PostgreSQL com dados do WhatsApp e Typebot
5. **Cria/Busca sessão** → Redis (cache) ou PostgreSQL (histórico)
6. **Chama Typebot** → Inicia ou continua conversa
7. **Transforma resposta** → Typebot → WhatsApp (texto, botões, imagens)
8. **Envia via WhatsApp API** → Usa `whatsapp_phone_number_id` e `whatsapp_access_token`
9. **Cria nota no Chatwoot** → Registra mensagem enviada (se `chatwoot_api_token` configurado)

---

## ✅ Checklist de Configuração

Antes de criar um inbox, certifique-se de ter:

- [ ] Tenant criado no sistema
- [ ] Inbox criado no Chatwoot (e anotado o ID)
- [ ] WhatsApp Business API configurado no Meta for Developers
- [ ] Phone Number ID do WhatsApp anotado
- [ ] Access Token do WhatsApp (permanente para produção)
- [ ] Typebot criado e publicado
- [ ] Public ID do Typebot anotado
- [ ] URL do Typebot Viewer acessível
- [ ] (Opcional) API Key do Typebot se necessário
- [ ] (Opcional) Token de API do Chatwoot para notas privadas
- [ ] Webhook configurado no Chatwoot apontando para: `https://connectwebhook.atomos.tech/webhook/chatwoot`

---

## 🆘 Troubleshooting

### Webhook não está recebendo mensagens
- ✅ Verifique se a URL do webhook está correta no Chatwoot
- ✅ Verifique se os eventos estão selecionados (`message_created`, `conversation_updated`)
- ✅ Verifique os logs: `docker service logs -f typebot_connector_typebot_connector_webhook`

### Mensagens não são enviadas
- ✅ Verifique se `whatsapp_phone_number_id` está correto
- ✅ Verifique se `whatsapp_access_token` não expirou (se temporário)
- ✅ Verifique se o número está verificado no Meta for Developers

### Typebot não responde
- ✅ Verifique se `typebot_base_url` está acessível
- ✅ Verifique se `typebot_public_id` está correto
- ✅ Verifique se `typebot_api_key` está configurada (se necessário)
- ✅ Teste acessar o Typebot diretamente: `{typebot_base_url}/{typebot_public_id}`

### Notas não aparecem no Chatwoot
- ✅ Verifique se `chatwoot_api_token` está configurado
- ✅ Verifique se o token tem permissões para criar notas
- ✅ Verifique se o `chatwoot_account_id` está configurado no tenant

---

## 📝 Exemplo Completo

```json
{
  "tenant_id": 1,
  "inbox_id": 290,
  "inbox_name": "Atendimento Principal",
  "whatsapp_phone_number_id": "123456789012345",
  "whatsapp_access_token": "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "whatsapp_api_version": "v21.0",
  "typebot_base_url": "https://assistenteatomos.cleoia.com.br",
  "typebot_api_key": "",
  "typebot_public_id": "meu-typebot-zyyctxt",
  "chatwoot_api_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "is_active": true
}
```

---

## 🔐 Segurança

- ⚠️ **Nunca compartilhe** tokens de acesso publicamente
- ⚠️ **Use tokens permanentes** em produção (não temporários)
- ⚠️ **Revise permissões** dos tokens regularmente
- ⚠️ **Mantenha backups** das configurações em local seguro
- ⚠️ **Use HTTPS** para todas as URLs (Typebot, Chatwoot, Webhook)

---

**Última atualização**: Configuração para produção com Traefik
