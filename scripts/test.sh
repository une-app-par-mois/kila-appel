#!/usr/bin/env bash
# Lance la suite de tests. À remplacer selon la stack (ex. npm test, pytest).
# Tant qu'il n'est pas défini, il échoue : une CI verte sans aucun test serait un faux vert.
set -euo pipefail

echo "::error::scripts/test.sh n'est pas encore défini : aucun test lancé." >&2
exit 1
