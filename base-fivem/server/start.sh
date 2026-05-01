#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTIFACT_DIR="${SCRIPT_DIR}/../artifacts"
RUN_SH="${ARTIFACT_DIR}/run.sh"
SERVER_CFG="${SCRIPT_DIR}/server.cfg"
SECRETS_CFG="${SCRIPT_DIR}/server.secrets.cfg"

if [ ! -f "${RUN_SH}" ]; then
  echo "run.sh nao encontrado em ${RUN_SH}"
  echo "Baixe os artifacts Linux com base-fivem/server/download-artifacts.sh antes de iniciar."
  exit 1
fi

if [ ! -f "${SERVER_CFG}" ]; then
  echo "server.cfg nao encontrado em ${SERVER_CFG}"
  exit 1
fi

if [ ! -f "${SECRETS_CFG}" ]; then
  echo "server.secrets.cfg nao encontrado em ${SECRETS_CFG}"
  echo "Copie server.secrets.example.cfg para server.secrets.cfg e preencha seus segredos."
  exit 1
fi

cd "${SCRIPT_DIR}"
exec bash "${RUN_SH}" +exec server.cfg
