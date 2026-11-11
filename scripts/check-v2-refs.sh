#!/bin/bash
# Verifica que toda referencia local v2-* nos HTML/manifest resolve a um arquivo real,
# E que nenhum arquivo v2-*.html / v2-js/*.js ainda referencia um .html do projeto
# original sem o prefixo v2- (bug real encontrado na revisao final: v2-js/admin.js
# e v2-js/store.js linkavam pra "acompanhar.html", nao "v2-acompanhar.html").
set -e
cd "$(dirname "$0")/.."
missing=0

for f in v2-admin.html v2-index.html v2-acompanhar.html; do
  grep -oE 'href="v2-[^"]+"|src="v2-[^"]+"' "$f" | sed -E 's/^(href|src)="//; s/"$//' | sort -u | while read -r p; do
    if [ ! -f "$p" ]; then
      echo "FALTANDO ($f): $p"
      exit 1
    fi
  done || missing=1
done

for f in v2-manifest.webmanifest v2-manifest-admin.webmanifest; do
  grep -oE '"v2-[^"]+"' "$f" | tr -d '"' | sort -u | while read -r p; do
    if [ ! -f "$p" ]; then
      echo "FALTANDO ($f): $p"
      exit 1
    fi
  done || missing=1
done

# .html referenciado em qualquer v2-*.html ou v2-js/*.js que NAO comece com v2-
# (string literal terminando em .html dentro de aspas, ignorando https:// e v2-*)
achou_sem_prefixo=0
for f in v2-admin.html v2-index.html v2-acompanhar.html v2-js/*.js; do
  refs=$(grep -oE '"[a-zA-Z0-9_./?=-]*\.html[a-zA-Z0-9_?=&-]*"' "$f" 2>/dev/null | tr -d '"' | grep -v '^v2-' | grep -v '^https\?://' || true)
  if [ -n "$refs" ]; then
    echo "SEM PREFIXO v2- ($f): $refs"
    achou_sem_prefixo=1
  fi
done

if [ "$missing" -ne 0 ] || [ "$achou_sem_prefixo" -ne 0 ]; then
  echo "FALHOU: ha referencias quebradas ou sem prefixo v2-"
  exit 1
fi
echo "OK: todas as referencias v2-* resolvem a arquivos existentes, nenhum .html sem prefixo v2- encontrado"
