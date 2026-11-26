#!/usr/bin/env bash
# Tests du modèle lui-même (garde-fous), lancés par .github/workflows/modele.yml
# dans le dépôt app-template seulement. À supprimer avec ce workflow dans une nouvelle app.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echecs=0
verifier() { # verifier <description> <code attendu> <commande...>
  local description=$1 attendu=$2
  shift 2
  local obtenu=0
  "$@" >/dev/null 2>&1 || obtenu=$?
  if [ "$obtenu" = "$attendu" ]; then
    echo "ok    $description"
  else
    echo "ÉCHEC $description (code $obtenu, attendu $attendu)"
    echecs=$((echecs + 1))
  fi
}

hook() { # hook <commande shell vue par Claude Code>
  jq -n --arg c "$1" '{tool_input: {command: $c}}' | .claude/hooks/block-secrets.sh
}

# Hook anti-secrets de Claude Code
verifier "hook : cat .env refusé" 2 hook "cat .env"
verifier "hook : .env.local refusé" 2 hook "cp .env.local /tmp/x"
verifier "hook : .envrc refusé" 2 hook "source .envrc"
verifier "hook : .env.example permis" 0 hook "cat .env.example"
verifier "hook : process.env permis" 0 hook "grep -r process.env src"
verifier "hook : .envelope permis" 0 hook "ls .envelope"
verifier "hook : clé Anthropic refusée" 2 hook "echo sk-ant-api03-abcdefghijkl"
verifier "hook : clé privée refusée" 2 hook "echo '-----BEGIN RSA PRIVATE KEY'"

# Hook commit-msg
message=$(mktemp)
commit_msg() { printf '%s\n' "$1" >"$message" && scripts/hooks/commit-msg "$message"; }
verifier "commit-msg : forme correcte" 0 commit_msg "Export : fichier CSV des présences (F-03)"
verifier "commit-msg : sans domaine refusé" 1 commit_msg "ajout de l'export"
verifier "commit-msg : plus de 72 caractères refusé" 1 commit_msg "Export : $(printf 'é%.0s' $(seq 1 70))"
verifier "commit-msg : fusion acceptée" 0 commit_msg "Merge branch 'main' into ticket/003-export"
rm -f "$message"

# Hook pre-push : jamais vers main
pre_push() { printf 'refs/heads/x 0 %s 0\n' "$1" | scripts/hooks/pre-push; }
verifier "pre-push : envoi vers main refusé" 1 pre_push "refs/heads/main"

# scripts/test.sh échoue tant qu'il n'est pas défini (pas de faux vert)
verifier "test.sh non défini : échec" 1 scripts/test.sh

# Mode de CI : les workflows lancés par une PR ne tournent que sur les PR vers main
pr_vers_main() { # le bloc « pull_request: » est suivi de « branches: [main] »
  grep -A1 '^  pull_request:' "$1" | grep -q 'branches: \[main\]'
}
for workflow in .github/workflows/*.yml; do
  if grep -q '^  pull_request:' "$workflow"; then
    verifier "$workflow : PR vers main seulement" 0 pr_vers_main "$workflow"
  fi
done

# Réglages de Claude Code : JSON valide
verifier ".claude/settings.json valide" 0 jq empty .claude/settings.json

if [ "$echecs" -gt 0 ]; then
  echo "$echecs vérification(s) en échec."
  exit 1
fi
echo "Toutes les vérifications du modèle passent."
