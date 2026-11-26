# 002 — Couche données testable et migration 1

Statut : en cours · Jalon : 0 · Zone sensible : oui · Trivial : non

## Contexte

Lever le risque d'ADR-008 et poser le schéma complet de la v1 (ADR-003), dont dépendent tous les tickets suivants.

## À lire

- `docs/ARCHITECTURE.md` §4
- ADR-002, ADR-003, ADR-008
- `docs/SECURITE.md` SEC-05, SEC-11

## Ce qui change

- Interface de base minimale (`execute`, `query`, transaction) dans `src/data/db.ts`
- Adaptateur `expo-sqlite` (appli) et adaptateur `node:sqlite` (tests)
- Migration 1 : les 14 tables, clés étrangères, cascades, index, `PRAGMA user_version`
- Ouverture de base : `PRAGMA foreign_keys = ON`, migrations dans une transaction
- Seuil de couverture `./src/data/` (90 % lignes, 85 % branches) ajouté dans `jest.config.js` avec le premier fichier de `src/data/` (CONV §5.3)

## Critères d'acceptation

- [ ] La migration 1 crée toutes les tables de `docs/ARCHITECTURE.md` §4.1 sur une base vide et pose `user_version` = 1
- [ ] Supprimer un membre supprime ses présences, contacts, inscriptions et alertes traitées (SEC-11)
- [ ] Une seule saison active possible (index unique partiel)
- [ ] Unicité (créneau, date) des séances (RM-05)
- [ ] Les mêmes requêtes tournent sur `node:sqlite` et `expo-sqlite` (sinon : arrêt et question au porteur, ADR-008)

## Tests attendus

- Tests de données sur `node:sqlite` : création, cascades, contraintes, valeurs avec `'` et `;` (SEC-05)
- À la main au ticket 004 : la base s'ouvre sur le téléphone

## Hors périmètre

- Dépôts métier (tickets du jalon 1)
