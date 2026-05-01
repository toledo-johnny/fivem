# VPS Ubuntu 24.04

Estrutura pronta para subir o bot, a API e o front na Hostinger usando:

- `PM2` para `discord-bot` e `portal-api`
- `systemd` para `base-fivem`
- `Nginx` para servir `web-sistema/dist`
- proxy interno para `http://127.0.0.1:3050`

## Arquivos esperados

- `bot-discord/.env.vps`
- `web-sistema/.env.vps`
- `base-fivem/server/server.secrets.cfg`

## Fluxo recomendado

1. Clone o repositorio na VPS em `/opt/projeto-fivem`
2. Rode `bash deploy/vps/setup-vps.sh`
3. Ajuste `bot-discord/.env.vps`, `web-sistema/.env.vps` e `base-fivem/server/server.secrets.cfg`
4. Baixe os artifacts Linux recomendados e habilite o servico FiveM com:
   `bash deploy/vps/setup-fivem.sh "<url-do-fx-tar-xz>"`
5. Rode `bash deploy/vps/deploy.sh`
6. Libere no firewall da Hostinger apenas `22`, `80`, `443` e `30120`

## Atualizando a VPS

Depois do primeiro setup, o fluxo de atualizacao fica:

1. `cd /opt/projeto-fivem`
2. `git pull origin main`
3. `bash deploy/vps/deploy.sh`

Se voce tambem atualizar os artifacts do FiveM, rode antes:

`bash base-fivem/server/download-artifacts.sh "<url-do-fx-tar-xz>"`

## Deploy automatico pelo GitHub

O repositorio inclui `.github/workflows/deploy-vps.yml` para rodar deploy automatico a cada push na branch `main`.

Secrets necessarios no GitHub:

- `VPS_HOST`: IP ou dominio da VPS
- `VPS_USER`: usuario SSH que executa o deploy
- `VPS_SSH_KEY`: chave privada do usuario

Se sua VPS usa uma porta SSH diferente de `22`, ajuste o campo `port` no workflow antes de ativar o deploy automatico.

## Ponto importante

- A porta `3050` deve ficar exposta apenas internamente na VPS
- A porta `30120` precisa ficar aberta para o FiveM
- Quando trocar o IP por dominio, atualize `DASHBOARD_BASE_URL`, `DASHBOARD_WEB_ORIGIN`, `DISCORD_OAUTH_REDIRECT_URI` e as URLs do Mercado Pago para `https://seu-dominio`

## Exemplos base

- `deploy/vps/bot-discord.env.example`
- `deploy/vps/web-sistema.env.example`
- `deploy/vps/ecosystem.config.cjs`
- `deploy/vps/nginx-base-fivem.conf`
