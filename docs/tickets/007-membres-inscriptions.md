# 007 — Membres et inscriptions

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

Gérer les membres (EX-03) et leur appartenance aux groupes (EX-04), avec la suppression réelle (ABS-05).

## À lire

- `docs/PRD.md` EX-03, EX-04
- Maquettes : Membres, Création d'un membre, Fiche membre, Suppression d'un membre, Groupe et ses membres, Inscription de membres à un groupe, Retrait d'un membre d'un groupe

## Ce qui change

- Dépôts `members`, `enrollments`
- Écrans correspondants

## Critères d'acceptation

- [ ] Créer un membre avec nom et prénom obligatoires, date de naissance facultative et dite telle (EX-03)
- [ ] Archiver, désarchiver, supprimer définitivement (présences comprises) après confirmation (ABS-05)
- [ ] Inscrire des membres existants à une date ; retirer en posant une date de fin sans effacer les présences (EX-04)
- [ ] Recherche et filtre « Archivés »

## Tests attendus

- Tests de données (cascades, dates d'inscription)
- Tests d'écrans (confirmation de suppression)

## Hors périmètre

- Contacts d'urgence (008), import CSV (F-07)
