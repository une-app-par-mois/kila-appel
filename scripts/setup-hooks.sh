#!/usr/bin/env bash
# Active les hooks Git du dépôt (scripts/hooks/), une fois par poste. Sans dépendance.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath scripts/hooks
echo "Hooks Git activés : pre-commit (main, gitleaks), commit-msg (forme), pre-push (main, tests)."
