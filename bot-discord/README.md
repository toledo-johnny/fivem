# Bot Discord + Portal API

Backend oficial do ecossistema compartilhado entre Discord, portal web e banco do servidor FiveM.

## Processos

- `discord-bot`: runtime do bot, comandos, tickets, whitelist, painéis e scheduler do Discord
- `portal-api`: runtime HTTP independente para OAuth, portal, dashboard admin, pedidos e webhooks

## Requisitos

- Node.js 18+
- MySQL acessando o banco compartilhado `workstore`
- Aplicativo Discord configurado para OAuth

## Configuracao

1. Copie `.env.example` para `.env`
2. Preencha bot, OAuth, MySQL e Mercado Pago
3. Garanta que `DISCORD_PRIMARY_GUILD_ID` aponte para a guild principal do ecossistema

## Rodando localmente

1. Instale as dependencias:
   `npm install`
2. Suba a API independente:
   `npm run start:api`
3. Em outra janela, suba o bot:
   `npm run start:bot`

## Ambientes separados

- `npm run start:api:localhost`: sobe a API usando `bot-discord/.env.localhost`
- `npm run start:bot:localhost`: sobe o bot usando `bot-discord/.env.localhost`
- `npm run start:api:vps`: sobe a API usando `bot-discord/.env.vps`
- `npm run start:bot:vps`: sobe o bot usando `bot-discord/.env.vps`
- `npm run check:env:localhost`: valida o arquivo `bot-discord/.env.localhost`
- `npm run check:env:vps`: valida o arquivo `bot-discord/.env.vps`

Os arquivos de infraestrutura para Ubuntu 24.04 ficam em `../deploy/vps`.

## Scripts

- `npm run start:api`: sobe a API HTTP oficial do portal e admin
- `npm run start:bot`: sobe o bot do Discord
- `npm run dev:api`: modo watch da API
- `npm run dev:bot`: modo watch do bot
- `npm run deploy:commands`: publica comandos slash
- `npm run check`: valida ambiente, testes e sintaxe

## Escopo atual

- OAuth do Discord com sessao por cookie
- Tickets e whitelist usando o banco `discord_bot_*`
- Portal publico e dashboard admin via `web-sistema`
- Niveis `support`, `admin` e `owner` baseados em cargos do Discord
- Loja com pedidos internos, webhook `POST /webhooks/mercadopago` e entrega automatica em `accounts.gems`
