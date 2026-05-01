# Localhost

Arquivos e comandos para manter o ambiente local separado do ambiente da VPS.

## Arquivos esperados

- `bot-discord/.env.localhost`
- `web-sistema/.env.localhost`

## Comandos

1. Validar backend:
   `npm --prefix bot-discord run check:env:localhost`
2. Subir API:
   `npm --prefix bot-discord run start:api:localhost`
3. Subir bot:
   `npm --prefix bot-discord run start:bot:localhost`
4. Subir front:
   `npm --prefix web-sistema run dev:localhost`

## Observacao

Os exemplos base deste ambiente ficam em:

- `deploy/localhost/bot-discord.env.example`
- `deploy/localhost/web-sistema.env.example`
