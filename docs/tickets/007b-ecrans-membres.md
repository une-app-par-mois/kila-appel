# 007b — Écrans des membres

Statut : à faire · Jalon : 1 · Zone sensible : oui (suppression) · Trivial : non

Découpé du ticket 007 le 2026-11-26 (décision du porteur).

## À lire

- `docs/PRD.md` EX-03 ; maquettes Membres, Création d'un membre, Fiche membre, Suppression d'un membre

## Ce qui change

- Écrans Membres (recherche, filtre par groupe, archivés), Nouveau membre (groupe facultatif), fiche (modifier, archiver, désarchiver), suppression avec ce qui sera effacé
- Maquette Membres : champ de recherche, à faire valider avant le code

## Critères d'acceptation

- [ ] La date de naissance est dite facultative (EX-03)
- [ ] La confirmation de suppression dit ce qui sera effacé (fiche, contacts, présences) et propose « Archiver » (ABS-05)
- [ ] Recherche par nom ou prénom, sans tenir compte des accents ni de la casse

## Tests attendus

- Tests d'écrans sur `node:sqlite` (création, recherche, archivage, suppression vérifiée dans la base)

## Hors périmètre

- Section Contacts de la fiche (008), groupes de la fiche (007c), import CSV (F-07)
