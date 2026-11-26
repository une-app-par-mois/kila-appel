# 007 — Membres et inscriptions : dépôts et hooks

Statut : en cours · Jalon : 1 · Zone sensible : oui · Trivial : non

Découpé le 2026-11-26 (décision du porteur) : 007 (données), 007b (écrans des membres), 007c (inscriptions).

## Contexte

Gérer les membres (EX-03) et leur appartenance aux groupes (EX-04), avec la suppression réelle (ABS-05).

## À lire

- `docs/PRD.md` EX-03, EX-04
- Maquettes : Membres, Création d'un membre, Fiche membre, Suppression d'un membre, Groupe et ses membres, Inscription de membres à un groupe, Retrait d'un membre d'un groupe

## Ce qui change

- `src/data/membersRepo.ts`, `src/data/enrollmentsRepo.ts`, validation d'un membre
- `src/hooks/useMembers.ts` (membres, un membre, inscriptions d'un groupe) ; `useLoaded` mis en commun

## Critères d'acceptation

- [ ] Créer un membre avec nom et prénom obligatoires, date de naissance facultative et dite telle (EX-03)
- [ ] Archiver, désarchiver, supprimer définitivement (présences et contacts compris) ; ce que la suppression effacera est connu avant (ABS-05)
- [ ] Inscrire des membres existants à une date (refus d'un membre déjà inscrit) ; retirer en posant une date de fin sans effacer les présences (EX-04)
- [ ] Liste filtrée : recherche par nom ou prénom, groupe, archivés

## Tests attendus

- Tests de données (cascades, dates d'inscription)
- Tests des hooks

## Décisions du porteur (2026-11-26)

- Découpage en 007, 007b, 007c.
- Liste des membres : une recherche par nom ou prénom, avec le filtre par groupe et les archivés (déjà dans la maquette, que l'IA avait mal lue).
- Date de fin d'une inscription = premier jour sans le membre (« à partir du ») : inscrit du début (inclus) à la fin (exclue). Proposée à aujourd'hui, modifiable, refusée avant le début.

## Hors périmètre

- Écrans (007b, 007c), contacts d'urgence (008), import CSV (F-07)
