#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_URL="${1:-${FIVEM_ARTIFACT_URL:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTIFACT_DIR="${SCRIPT_DIR}/../artifacts"

if [ -z "${ARTIFACT_URL}" ]; then
  echo "Uso: bash base-fivem/server/download-artifacts.sh <url-do-fx-tar-xz>"
  echo "Pegue a URL do build Linux recomendado na documentacao oficial da Cfx.re:"
  echo "https://docs.fivem.net/docs/server-manual/setting-up-a-server-vanilla/"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="${TMP_DIR}/fx.tar.xz"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

mkdir -p "${ARTIFACT_DIR}"

echo "Baixando artifacts Linux do FiveM..."
curl -L "${ARTIFACT_URL}" -o "${ARCHIVE_PATH}"

echo "Limpando artifacts antigos..."
find "${ARTIFACT_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

echo "Extraindo artifacts em ${ARTIFACT_DIR}..."
tar -xf "${ARCHIVE_PATH}" -C "${ARTIFACT_DIR}"

echo "Artifacts atualizados com sucesso."
