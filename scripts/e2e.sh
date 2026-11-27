#!/usr/bin/env bash
# Parcours de bout en bout Maestro (docs/CONVENTIONS.md §5.2, campagne de fin de jalon, ticket 016).
#   ./scripts/e2e.sh [--appareil-reel] <fichier.apk>
# EFFACE LES DONNÉES DE L'APPLI SUR L'APPAREIL : désinstallation, puis réinstallation de l'APK.
# Par défaut, seul un émulateur est accepté ; un téléphone branché est refusé, sauf
# `--appareil-reel` (décision du porteur du 2026-11-27).
set -euo pipefail

cd "$(dirname "$0")/.."

readonly PACKAGE="com.jitavision.kila"
readonly BACKUP_NAME="kila-e2e-sauvegarde-fictive.db"
readonly DOWNLOADS="/sdcard/Download"

usage() {
  echo "Usage : ./scripts/e2e.sh [--appareil-reel] <fichier.apk>" >&2
  exit 2
}

real_device=0
apk=""
for arg in "$@"; do
  case "$arg" in
    --appareil-reel) real_device=1 ;;
    -*) usage ;;
    *) [ -z "$apk" ] || usage; apk="$arg" ;;
  esac
done
[ -n "$apk" ] || usage
if [ ! -f "$apk" ]; then
  echo "::error::APK introuvable : $apk" >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "::error::node_modules absent : lancer d'abord npm ci." >&2
  exit 1
fi

# Le générateur de la sauvegarde fictive a besoin de module.registerHooks (Node 22.15).
if ! node -e 'process.exit(typeof require("node:module").registerHooks === "function" ? 0 : 1)'; then
  echo "::error::Node 22.15 ou plus récent est nécessaire (version actuelle : $(node --version))." >&2
  exit 1
fi

# Aucune statistique envoyée par Maestro (ABS-01 côté outillage, réponse du porteur).
export MAESTRO_CLI_NO_ANALYTICS=1
maestro="$(command -v maestro || true)"
[ -n "$maestro" ] || maestro="$HOME/.maestro/bin/maestro"
if [ ! -x "$maestro" ]; then
  echo "::error::Maestro introuvable (voir README, « Tests de bout en bout »)." >&2
  exit 1
fi

echo "== Appareil"
mapfile -t devices < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [ -n "${ANDROID_SERIAL:-}" ]; then
  serial="$ANDROID_SERIAL"
elif [ "${#devices[@]}" -eq 1 ]; then
  serial="${devices[0]}"
elif [ "${#devices[@]}" -eq 0 ]; then
  echo "::error::Aucun appareil adb : démarrer un émulateur." >&2
  exit 1
else
  echo "::error::Plusieurs appareils adb : choisir avec ANDROID_SERIAL=<numéro>." >&2
  exit 1
fi
# Un émulateur : propriété qemu à 1, quel que soit son numéro (émulateur relié en TCP compris).
qemu="$(adb -s "$serial" shell getprop ro.kernel.qemu | tr -d '\r')"
[ -n "$qemu" ] || qemu="$(adb -s "$serial" shell getprop ro.boot.qemu | tr -d '\r')"
if [ "$qemu" != "1" ]; then
  if [ "$real_device" -ne 1 ]; then
    echo "::error::$serial n'est pas un émulateur : refusé (ses données seraient effacées)." >&2
    echo "Pour un téléphone de test, relancer avec --appareil-reel." >&2
    exit 1
  fi
  echo "Appareil réel accepté (--appareil-reel) : $serial"
else
  echo "Émulateur : $serial"
fi
adb_() { adb -s "$serial" "$@"; }

echo "== Installation (efface les données de l'appli)"
adb_ uninstall "$PACKAGE" >/dev/null 2>&1 || true
adb_ install "$apk"

echo "== Sauvegarde fictive dans Téléchargements (aucun binaire versionné, SEC-13)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# Le jour de l'appareil : les séances fictives tombent dans ses 30 derniers jours.
today="$(adb_ shell date +%F | tr -d '\r')"
if [[ ! "$today" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "::error::Date de l'appareil illisible : « $today » (attendu : AAAA-MM-JJ)." >&2
  exit 1
fi
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  scripts/e2e/sauvegarde-fictive.mjs "$work/$BACKUP_NAME" "$today"
adb_ shell rm -f "$DOWNLOADS/$BACKUP_NAME"
adb_ push "$work/$BACKUP_NAME" "$DOWNLOADS/$BACKUP_NAME"

echo "== Parcours Maestro"
"$maestro" --device "$serial" test .maestro
