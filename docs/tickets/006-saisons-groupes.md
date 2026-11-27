# 006 — Saisons et groupes : dépôts et hooks

Statut : fait (PR #63 vers `main`) · Jalon : 1 · Zone sensible : oui (suppressions) · Trivial : non

Découpé le 2026-11-26 (décision du porteur) : 006 (données), 006b (composants), 006c (écrans).

## Contexte

Couche données des saisons (EX-01) et des groupes (EX-02), avec leurs suppressions, avant les écrans du ticket 006c.

## À lire

- `docs/PRD.md` EX-01, EX-02 ; `docs/ARCHITECTURE.md` §4 (schéma, suppressions)

## Ce qui change

- `src/data/seasonsRepo.ts`, `src/data/groupsRepo.ts` : lire, créer, modifier, activer, archiver, supprimer ; ce qu'une suppression effacera
- `src/hooks/useSeasons.ts`, `src/hooks/useGroups.ts` : seul accès des écrans (CONV-10)

## Critères d'acceptation

- [x] Créer, renommer (et changer les dates), activer, supprimer une saison ; une seule active (EX-01)
- [x] Supprimer une saison efface ses groupes, créneaux, séances et présences, pas les membres ; le nombre de lignes concernées est connu avant (EX-01)
- [x] Créer, renommer, archiver, désarchiver, supprimer un groupe ; les présences restent (EX-02)
- [x] Toute saisie est validée avant la base (nom non vide, dates RM-04, fin après début)

## Tests attendus

- Tests de données des dépôts et des suppressions (comptes de lignes), sur `node:sqlite`
- Tests des hooks

## Décisions du porteur (2026-11-26)

- Supprimer un groupe garde ses séances et leurs présences (ARCHITECTURE §4.1, ticket 002) ; la maquette sera corrigée au 006c.
- « Désarchiver » un groupe est prévu, bien qu'absent de la maquette.
- Changer les dates d'une saison est refusé si des séances enregistrées tomberaient en dehors (`SESSIONS_OUTSIDE_SEASON`).

## Hors périmètre

- Écrans (006c), composants (006b), membres (007)
