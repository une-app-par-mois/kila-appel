# 007c — Écrans des inscriptions

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé du ticket 007 le 2026-11-26 (décision du porteur).

## À lire

- `docs/PRD.md` EX-04 ; maquettes Groupe et ses membres, Inscription de membres à un groupe, Retrait d'un membre d'un groupe, Fiche membre (Groupes)

## Ce qui change

- Fiche d'un groupe : ses membres en cours, « Ajouter des membres »
- Inscription de plusieurs membres à une date ; retrait à une date (premier jour sans lui)
- Fiche membre : ses groupes, « Retirer », « Ajouter à un groupe »

## Critères d'acceptation

- [ ] Retirer conserve les présences passées (EX-04)
- [ ] Le nombre de membres d'un groupe compte les inscriptions en cours à la date du jour (fin absente ou à venir), et non plus seulement celles sans date de fin (`groupsRepo.get`)

- [ ] Une inscription future (date choisie après aujourd'hui) est visible quelque part (« à partir du … ») : les listes ne montrent que les inscriptions en cours

## Tests attendus

- Tests d'écrans sur `node:sqlite`

## Hors périmètre

- Import CSV (F-07)
