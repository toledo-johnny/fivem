# Base FiveM

Estrutura versionada da base do servidor FiveM, pronta para Git e preparada para rodar na VPS Linux.

## O que entra no Git

- `base-fivem/server`: `server.cfg`, scripts de inicializacao e todos os recursos

## O que fica fora do Git

- `base-fivem/artifacts`: binaries do FXServer
- `base-fivem/server/server.secrets.cfg`: segredos locais da VPS
- `base-fivem/server/cache` e `base-fivem/server/txData`: runtime

## Segredos

1. Copie `base-fivem/server/server.secrets.example.cfg` para `base-fivem/server/server.secrets.cfg`
2. Preencha MySQL, Steam Web API e `sv_licenseKey`

## Windows local

- Coloque os artifacts Windows em `base-fivem/artifacts`
- Rode `base-fivem/server/start.bat`

## VPS Linux

1. Copie `base-fivem/server/server.secrets.example.cfg` para `base-fivem/server/server.secrets.cfg`
2. Pegue a URL do build Linux recomendado na documentacao oficial da Cfx.re:
   `https://docs.fivem.net/docs/server-manual/setting-up-a-server-vanilla/`
3. Rode:
   `bash base-fivem/server/download-artifacts.sh "<url-do-fx-tar-xz>"`
4. Inicie:
   `bash base-fivem/server/start.sh`

Para rodar como servico na VPS, use os arquivos em `deploy/vps`.
