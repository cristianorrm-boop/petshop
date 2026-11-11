#!/bin/bash
# Confere que Fretes/Contas a Pagar/Contas a Receber (fora de escopo da V2)
# nao aparecem em lugar nenhum do admin v2.
set -e
cd "$(dirname "$0")/.."

n1=$(grep -c 'data-tab="fretes"\|data-tab="pagar"\|data-tab="receber"' v2-admin.html || true)
n2=$(grep -c 'telas\.fretes\|telas\.pagar\|telas\.receber' v2-js/admin.js || true)

if [ "${n1:-0}" -gt 0 ] || [ "${n2:-0}" -gt 0 ]; then
  echo "FALHOU: ainda ha referencia a fretes/pagar/receber (v2-admin.html: $n1, v2-js/admin.js: $n2)"
  exit 1
fi
echo "OK: nenhuma referencia a fretes/pagar/receber em v2-admin.html ou v2-js/admin.js"
