# LinguaFire

Plataforma gamificada de ingles. A interface principal foi migrada para React + TypeScript em `client/`; o app legado continua disponivel em `/legacy/index.html` para compatibilidade.

## Desenvolvimento

Instale dependencias na raiz, no client e no servidor:

```sh
npm install
npm --prefix client install
npm --prefix server install
```

Rode o frontend React com Vite:

```sh
npm run dev:client
```

Por padrao, o Vite abre em `http://127.0.0.1:5173/` e faz proxy das rotas de API para `http://127.0.0.1:3000`.

Rode o backend em outro terminal:

```sh
npm run dev:server
```

## Build e producao

O build React e obrigatorio em producao:

```sh
npm run build
NODE_ENV=production npm start
```

Se `NODE_ENV=production` e `client/dist/index.html` nao existir, o servidor falha explicitamente. Em desenvolvimento/teste, o servidor ainda pode cair para `public/dist` para preservar o legado.

Para publicar no Render, use `render.yaml` como blueprint. Para container, use o `Dockerfile` na raiz.

O endpoint `/health` informa o frontend ativo:

```json
{
  "ok": true,
  "frontend": "react"
}
```

## Testes

```sh
npm run check
npm test
npm --prefix server run test:e2e
```

Para uma verificacao completa antes de publicar:

```sh
npm run release:check
```

O e2e cobre as abas React principais em desktop/mobile e mantem um teste separado do legado em `/legacy/index.html`.

O workflow `.github/workflows/ci.yml` roda o mesmo `release:check` em push e pull request.

## Variaveis de ambiente

Use `server/.env.example` como base. Para producao, configure pelo menos:

- `NODE_ENV=production`
- `BASE_URL=https://seudominio.com`
- `CORS_ORIGINS=https://seudominio.com`
- `JWT_SECRET` forte
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Opcionais conforme features:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SMTP_*`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `NATIVES_ADMIN_TOKEN`
- `LYRICS_ADMIN_TOKEN`
- `AGENT_ADMIN_TOKEN`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ADMIN_TOKEN`

## Assinaturas

Em producao, `/api/subscription/create` cria uma Stripe Checkout Session quando `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` estao definidos. Configure o webhook da Stripe para `https://seudominio.com/api/subscription/webhook` e preencha `STRIPE_WEBHOOK_SECRET`.

`ALLOW_FAKE_SUBSCRIPTIONS=true` existe apenas para demo/desenvolvimento. Nao use em producao com usuarios reais.

## Push

As notificacoes usam `web-push`. Gere VAPID keys com:

```sh
npx web-push generate-vapid-keys
```

Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`. O endpoint `/api/push/broadcast` exige `PUSH_ADMIN_TOKEN`.

## Legado

- Entrada principal: React em `/`.
- Compatibilidade: legado em `/legacy/index.html`.
- Arquivos estaticos antigos ainda sao servidos como fallback para assets do legado.

Antes de remover o legado, confirme que todo o conteudo de `public/dist/lesson-module.js` foi migrado para `client/src/data/lessons.ts`.
