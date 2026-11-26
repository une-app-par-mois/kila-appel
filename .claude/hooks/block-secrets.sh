#!/bin/sh
# Hook PreToolUse de Claude Code sur les commandes shell.
# Refuse toute commande qui cite un fichier .env autre que .env.example, ou qui contient
# une valeur qui ressemble à une clé. Les règles « deny » sur la lecture ne couvrent pas
# `cat .env` lancé dans le shell : ce hook comble ce trou.
# Entrée : le JSON de l'appel sur l'entrée standard. Refus : code 2, raison sur la sortie d'erreur.
set -euf # -f : pas de développement des motifs (« .env* » reste tel quel)

refuse() {
  echo "Commande refusée par .claude/hooks/block-secrets.sh : $1" >&2
  exit 2
}

# Sans jq, impossible de lire la commande : on refuse plutôt que de laisser passer.
command -v jq >/dev/null 2>&1 || refuse "jq est introuvable, la commande ne peut pas être vérifiée."

command=$(jq -r '.tool_input.command // ""') || refuse "entrée illisible."

# Mentions d'un fichier .env : « .env » précédé d'un caractère qui n'est pas une lettre, un
# chiffre ou « _ » (donc pas « process.env »), suivi de son éventuelle extension ou d'un motif.
# Un mot qui continue par une lettre (« .envelope ») n'est pas un fichier .env, sauf « .envrc ».
mentions=$(printf '%s\n' "$command" |
  grep -oE '(^|[^A-Za-z0-9_])\.env[A-Za-z0-9_.*?[-]*' |
  sed -E 's/^[^.]//' || true)
for mention in $mentions; do
  case "$mention" in
    .env.example) ;;
    .env | .env[0-9._*?[-]* | .envrc*)
      refuse "elle cite un fichier .env ($mention). Seul .env.example est permis." ;;
    *) ;;
  esac
done

# Valeurs qui ressemblent à une clé (Anthropic, GitHub, AWS, clé privée).
if printf '%s\n' "$command" |
  grep -qE 'sk-ant-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY'; then
  refuse "elle contient une valeur qui ressemble à une clé secrète."
fi

exit 0
