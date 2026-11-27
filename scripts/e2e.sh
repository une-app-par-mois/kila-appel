#!/usr/bin/env bash
# Parcours de bout en bout Maestro (docs/CONVENTIONS.md §5.2, campagne de fin de jalon, tickets 016
# et 030).
#   ./scripts/e2e.sh [--appareil-reel] <fichier.apk>
# EFFACE LES DONNÉES DE L'APPLI SUR L'APPAREIL : désinstallation, puis réinstallation de l'APK.
# Par défaut, seul un émulateur est accepté ; un téléphone branché est refusé, sauf
# `--appareil-reel` (décision du porteur du 2026-11-27).
set -euo pipefail

cd "$(dirname "$0")/.."

readonly PACKAGE="com.jitavision.kila"
readonly BACKUP_PREFIX="kila-e2e-"
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
# Android 13 (API 33) au moins : la permission de notification se demande (parcours de la relance).
sdk="$(adb_ shell getprop ro.build.version.sdk | tr -d '\r')"
if [[ ! "$sdk" =~ ^[0-9]+$ ]] || [ "$sdk" -lt 33 ]; then
  echo "::error::Android API 33 ou plus nécessaire (appareil : « $sdk »)." >&2
  exit 1
fi

echo "== Installation (efface les données de l'appli)"
adb_ uninstall "$PACKAGE" >/dev/null 2>&1 || true
adb_ install "$apk"

echo "== Sauvegardes fictives dans Téléchargements (aucun binaire versionné, SEC-13)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# Le jour de l'appareil : les séances fictives tombent dans ses 30 derniers jours. Le jeu des
# statistiques (ticket 030) ne vaut que du 2026-11-25 au 2027-07-31 : sinon sa sauvegarde n'est pas
# écrite et le parcours `statistiques` (tag `statistiques`) n'est pas joué.
today="$(adb_ shell date +%F | tr -d '\r')"
if [[ ! "$today" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "::error::Date de l'appareil illisible : « $today » (attendu : AAAA-MM-JJ)." >&2
  exit 1
fi
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  scripts/e2e/sauvegarde-fictive.mjs "$work" "$today"
# Une par parcours : jalon 1, alerte, statistiques, volume de NF-08 (ticket 030).
for backup in "$work/$BACKUP_PREFIX"*.db; do
  name="$(basename "$backup")"
  adb_ shell rm -f "$DOWNLOADS/$name"
  adb_ push "$backup" "$DOWNLOADS/$name"
done

echo "== Parcours Maestro"
skip=()
if [ ! -f "$work/${BACKUP_PREFIX}statistiques.db" ]; then
  echo "::warning::Parcours statistiques non joué : jour de l'appareil $today hors du jeu du 023." >&2
  skip=(--exclude-tags statistiques)
fi
"$maestro" --device "$serial" test "${skip[@]}" .maestro
