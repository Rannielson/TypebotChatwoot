# Fix: ERR_NAME_NOT_RESOLVED - nginx/api/sessions/active

## Problema

O frontend está tentando acessar `nginx/api/sessions/active`, mas `nginx` não é um hostname válido quando o código roda no navegador (client-side).

## Causa

A variável `NEXT_PUBLIC_API_URL` é usada no código que roda no **navegador** (client-side), então não pode usar hostnames Docker internos como `nginx`, `api`, etc.

## Solução

### Opção 1: Definir variável de ambiente (Recomendado)

Crie ou edite o arquivo `docker/.env`:

```bash
# URL acessível do navegador (client-side)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Depois, rebuild o frontend:

```bash
cd docker
docker-compose build frontend
docker-compose up -d frontend
```

### Opção 2: Usar URL do Tunnel (se estiver usando Cloudflare)

Se você estiver usando o tunnel do Cloudflare, use a URL do tunnel:

```bash
# No docker/.env
NEXT_PUBLIC_API_URL=https://seu-tunnel-url.trycloudflare.com/api
```

### Opção 3: Rebuild com variável inline

```bash
cd docker
NEXT_PUBLIC_API_URL=http://localhost:3000/api docker-compose build frontend
docker-compose up -d frontend
```

## Verificação

1. Verifique se o container está usando a variável correta:
   ```bash
   docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL
   ```

2. Verifique os logs do frontend:
   ```bash
   docker-compose logs frontend
   ```

3. Teste no navegador:
   - Abra o DevTools (F12)
   - Vá para a aba Network
   - Verifique se as requisições estão indo para `http://localhost:3000/api` e não para `nginx/api`

## Por que isso acontece?

- `NEXT_PUBLIC_*` variáveis são **expostas ao cliente** (navegador)
- O código JavaScript roda no navegador, não no servidor
- O navegador não conhece hostnames Docker internos (`nginx`, `api`, etc)
- Precisa usar URLs acessíveis do navegador (`localhost:3000` ou URL externa)

## Arquitetura

```
┌─────────────────┐
│   Navegador     │ (client-side)
│  (localhost)    │
└────────┬────────┘
         │
    ┌────▼────┐
    │ localhost:3000 │ (porta externa do nginx)
    └────┬────┘
         │
    ┌────▼────┐
    │  Nginx   │ (load balancer)
    └────┬────┘
         │
    ┌────▼────┐
    │   API    │ (api:3000 ou webhook-api:3001)
    └─────────┘
```

O navegador acessa `localhost:3000`, que é o Nginx, que então roteia para os serviços internos.
