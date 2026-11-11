#!/bin/bash
# Confere que Fretes/Contas a Pagar/Contas a Receber (fora de escopo da V2)
# nao aparecem em lugar nenhum do admin v2.
set -e
cd "$(dirname "$0")/.."

n1=$(grep -c 'data-tab="fretes"\|data-tab="pagar"\|data-tab="receber"\|id="tab-fretes"\|id="tab-pagar"\|id="tab-receber"' v2-admin.html || true)
n2=$(grep -c 'telas\.fretes\|telas\.pagar\|telas\.receber' v2-js/admin.js || true)
# qualquer v2-js/*.js (nao so admin.js) que ainda tente navegar pra uma aba
# removida, ou que referencie o link morto "ir-fretes" (achado da revisao
# final da Fase 2: admin-config.js linkava pra uma aba que nao existe mais).
n3=$(grep -l 'abrirTab("fretes")\|abrirTab("pagar")\|abrirTab("receber")\|ir-fretes' v2-js/*.js 2>/dev/null | wc -l)

if [ "${n1:-0}" -gt 0 ] || [ "${n2:-0}" -gt 0 ] || [ "${n3:-0}" -gt 0 ]; then
  echo "FALHOU: ainda ha referencia a fretes/pagar/receber (v2-admin.html: $n1, v2-js/admin.js: $n2, outros v2-js/*.js: $n3)"
  exit 1
fi
echo "OK: nenhuma referencia a fretes/pagar/receber em v2-admin.html ou em nenhum v2-js/*.js"
