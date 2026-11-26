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
