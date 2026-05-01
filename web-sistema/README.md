# Base FiveM Web

Projeto React + Vite para uma landing page e painel de cidade FiveM.

O projeto roda sem Gemini, sem AI Studio e sem integracoes com IA externa. A navegacao principal e o dashboard consomem a `portal-api` do `bot-discord`, enquanto o login usa OAuth do Discord no backend com sessao por cookie.

## Requisitos

- Node.js

## Configuracao

1. Copie `.env.example` para `.env`
2. Preencha:
   - `VITE_API_BASE_URL`
3. Garanta que o `bot-discord` esteja com OAuth, CORS e `DASHBOARD_WEB_ORIGIN` configurados para a origem do Vite
4. Suba a API oficial em paralelo com:
   `npm --prefix ../bot-discord run start:api`

## Rodando localmente

1. Instale as dependencias:
   `npm install`
2. Inicie o ambiente de desenvolvimento:
   `npm run dev`

## Ambientes separados

- `npm run dev:localhost`: sobe o Vite usando `web-sistema/.env.localhost`
- `npm run build:localhost`: gera build usando `web-sistema/.env.localhost`
- `npm run build:vps`: gera build usando `web-sistema/.env.vps`

Se `VITE_API_BASE_URL` nao for definido no build de producao, o front passa a usar o mesmo host do navegador. Isso facilita servir o React pelo Nginx e deixar a API atras de proxy na VPS.

## Scripts

- `npm run dev`: sobe o servidor Vite na porta `3000`
- `npm run build`: gera a build de producao
- `npm run preview`: abre a build localmente
- `npm run lint`: roda o TypeScript sem emitir arquivos
- `npm run clean`: remove a pasta `dist`

## Fluxos principais

- `Landing`: home oficial consumindo `GET /api/public/portal`
- `Shop`: carrinho ligado aos pacotes reais do portal, criando pedidos internos e abrindo checkout oficial do Mercado Pago
- `Updates`: lista e detalhe de noticias publicadas pelo bot
- `Rules`: pagina institucional reaproveitando os blocos oficiais do onboarding
- `Login`: OAuth do Discord via backend do bot, com retorno para `/login` em caso de erro
- `Dashboard`: area player consumindo sessao, whitelist, tickets, historico de compras e status FiveM reais
- `Admin`: painel staff com players, whitelist, tickets, blocos de conteudo, portal, staff, pedidos, logs, financeiro, banco e configuracoes
