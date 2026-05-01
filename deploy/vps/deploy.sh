#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=/opt/projeto-fivem
BOT_DIR="${PROJECT_ROOT}/bot-discord"
WEB_DIR="${PROJECT_ROOT}/web-sistema"
NGINX_AVAILABLE=/etc/nginx/sites-available/base-fivem.conf
NGINX_ENABLED=/etc/nginx/sites-enabled/base-fivem.conf

cd "$BOT_DIR"
npm ci
npm run check:env:vps

cd "$WEB_DIR"
npm ci
npm run build:vps

pm2 startOrReload "${PROJECT_ROOT}/deploy/vps/ecosystem.config.cjs" --update-env
pm2 save

ln -sfn "${PROJECT_ROOT}/deploy/vps/nginx-base-fivem.conf" "$NGINX_AVAILABLE"
ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "Deploy concluido. Front em Nginx e API/Bot em PM2."
