# 🌐 Configuração do Túnel Público

O projeto utiliza **Cloudflare Tunnel** (cloudflared) para criar um túnel público que permite receber webhooks do Chatwoot sem precisar expor portas publicamente ou configurar DNS.

## 🚀 Como Funciona

O túnel cria uma URL pública temporária que redireciona todas as requisições para o backend local rodando no Docker.

## 📋 Status Atual

✅ **Túnel configurado e rodando**
- Container: `typebot_connector_tunnel`
- URL atual: `https://wholesale-praise-desirable-treo.trycloudflare.com`
- Webhook URL: `https://wholesale-praise-desirable-treo.trycloudflare.com/webhook/chatwoot`

## 🔧 Comandos Úteis

### Ver URL do Túnel

```bash
# Script automático
bash scripts/get-tunnel-url.sh

# Ou manualmente
docker logs typebot_connector_tunnel | grep "trycloudflare.com"
```

### Atualizar URL no .env

```bash
bash scripts/update-webhook-url.sh
```

Este script:
1. Obtém a URL atual do túnel
2. Atualiza a variável `WEBHOOK_URL` no arquivo `.env`
3. Mostra a URL para configurar no Chatwoot

### Gerenciar Túnel

```bash
# Ver logs
docker logs typebot_connector_tunnel

# Reiniciar túnel
cd docker
docker-compose restart tunnel

# Parar túnel
docker-compose stop tunnel

# Iniciar túnel
docker-compose up -d tunnel
```

## ⚠️ Importante

1. **URL Temporária**: A URL do túnel muda a cada reinicialização do container
2. **Atualizar .env**: Execute `bash scripts/update-webhook-url.sh` após reiniciar o túnel
3. **Atualizar Chatwoot**: Configure a nova URL no Chatwoot após reiniciar o túnel
4. **Produção**: Para produção, considere usar um túnel nomeado do Cloudflare com URL fixa

## 📝 Configurar no Chatwoot

1. Acesse as configurações de webhook do Chatwoot
2. Configure a URL do webhook como:
   ```
   https://wholesale-praise-desirable-treo.trycloudflare.com/webhook/chatwoot
   ```
3. Eventos suportados:
   - `automation_event.message_created`
   - `automation_event.conversation_updated` (quando `status: "resolved"`)

## 🔄 Fluxo Completo

```
Chatwoot → Túnel Público → Backend (app:3000) → Processa Webhook
```

## 🆘 Troubleshooting

### Túnel não está gerando URL

```bash
# Verificar se o container está rodando
docker ps | grep tunnel

# Ver logs detalhados
docker logs typebot_connector_tunnel

# Reiniciar túnel
cd docker && docker-compose restart tunnel
```

### URL mudou após reiniciar

```bash
# Atualizar .env automaticamente
bash scripts/update-webhook-url.sh
```

### Testar Webhook

```bash
# Testar se o túnel está funcionando
curl https://wholesale-praise-desirable-treo.trycloudflare.com/health

# Testar webhook (substitua pela URL atual)
curl -X POST https://wholesale-praise-desirable-treo.trycloudflare.com/webhook/chatwoot \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 📚 Referências

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/use_cases/quick-tunnel/)

