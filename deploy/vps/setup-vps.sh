#!/usr/bin/env bash
set -euo pipefail

NODE_MAJOR=20

apt update
apt upgrade -y
apt install -y curl ca-certificates gnupg nginx git build-essential xz-utils

mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/nodesource.gpg ]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list

apt update
apt install -y nodejs
npm install -g pm2

mkdir -p /opt/projeto-fivem
systemctl enable nginx

echo "Base da VPS pronta. Copie o projeto para /opt/projeto-fivem e rode deploy/vps/deploy.sh."
