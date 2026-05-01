#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=/opt/projeto-fivem
SERVER_DIR="${PROJECT_ROOT}/base-fivem/server"
SYSTEMD_UNIT_SOURCE="${PROJECT_ROOT}/deploy/vps/fivem.service"
SYSTEMD_UNIT_TARGET=/etc/systemd/system/fivem.service
ARTIFACT_URL="${1:-${FIVEM_ARTIFACT_URL:-}}"

if [ ! -d "${SERVER_DIR}" ]; then
  echo "Diretorio ${SERVER_DIR} nao encontrado."
  exit 1
fi

if [ ! -f "${SERVER_DIR}/server.secrets.cfg" ]; then
  echo "Arquivo ${SERVER_DIR}/server.secrets.cfg nao encontrado."
  echo "Copie server.secrets.example.cfg e ajuste os segredos antes de continuar."
  exit 1
fi

if [ -z "${ARTIFACT_URL}" ]; then
  echo "Informe a URL do artifact Linux recomendado."
  echo "Exemplo: bash deploy/vps/setup-fivem.sh <url-do-fx-tar-xz>"
  exit 1
fi

bash "${SERVER_DIR}/download-artifacts.sh" "${ARTIFACT_URL}"
cp "${SYSTEMD_UNIT_SOURCE}" "${SYSTEMD_UNIT_TARGET}"
systemctl daemon-reload
systemctl enable fivem
systemctl restart fivem
systemctl status fivem --no-pager
