# ADR-008 — Tests de la couche données avec node:sqlite

Statut : accepté le 2026-11-26

## Contexte

Les bogues les plus graves de l'ancienne version étaient dans la couche données (restauration cassée), non testée.

## Décision

Les dépôts reçoivent une interface de base minimale (exécuter, lire) ; en test, elle est fournie par le module `node:sqlite` intégré à Node 22, sur une vraie base. Aucune dépendance.

## Options écartées

Simuler la base (ne teste pas le SQL) ; better-sqlite3 (dépendance native de plus).

## Conséquences

À confirmer au ticket d'outillage : mêmes requêtes sur `node:sqlite` et `expo-sqlite`.

- **Vérifié le 2026-11-26** : migration 1, cascades et contraintes testées sur `node:sqlite` (SQLite 3.51.3) et, par une imitation fidèle, sur l'adaptateur `expo-sqlite` (ticket 002).
- **Vérifié le 2026-11-26 sur téléphone** (Samsung Galaxy A55, Android, APK de version du ticket 004) : la base s'ouvre et la migration 1 s'applique avec `expo-sqlite` (SQLite 3.53.3 embarqué). Le journal affiche `[kila] DB_READY { version: 1 }` (`adb logcat`).
- Non vérifié sur iOS réel : pas d'iPhone au jalon 0 (build simulateur seulement).
