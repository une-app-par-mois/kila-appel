#!/usr/bin/env bash
# Suite de tests complète (docs/CONVENTIONS.md §5.4). Échoue au premier problème.
# Lancée par le hook pre-push et par la CI.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "::error::node_modules absent : lancer d'abord npm ci." >&2
  exit 1
fi

echo "== Lint et format (Biome, CONV-20)"
npx --no-install biome check .

echo "== Typage strict (tsc, CONV-12)"
npx --no-install tsc --noEmit

echo "== Contrastes de la charte"
node scripts/contrastes.mjs

echo "== Tests et couverture (Jest, CONV §5.3)"
# --ci : un instantané manquant échoue au lieu d'être écrit.
npx --no-install jest --ci --coverage
