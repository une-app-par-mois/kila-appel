# 007b — Écrans des membres

Statut : fusionné dans le groupe · Jalon : 1 · Zone sensible : oui (suppression) · Trivial : non

Découpé du ticket 007 le 2026-11-26 (décision du porteur).

## À lire

- `docs/PRD.md` EX-03 ; maquettes Membres, Création d'un membre, Fiche membre, Suppression d'un membre

## Ce qui change

- Composants `FilterChip` (puce de filtre) et `Select` (champ « ▾ » qui ouvre une liste plein écran)
- Écrans Membres (recherche, filtre par groupe, archivés), Nouveau membre (groupe facultatif), fiche (modifier, archiver, désarchiver), suppression avec ce qui sera effacé ; ligne Membres dans Paramètres

## Critères d'acceptation

- [x] La date de naissance est dite facultative (EX-03)
- [x] La confirmation de suppression dit ce qui sera effacé (fiche, contacts, présences) et propose « Archiver » (ABS-05)
- [x] Recherche par nom ou prénom, sans tenir compte des accents ni de la casse

## Tests attendus

- Tests d'écrans sur `node:sqlite` (création, recherche, archivage, suppression vérifiée dans la base)

## Décisions du porteur (2026-11-26)

- Champ « ▾ » : liste plein écran sur Papier, une ligne par choix, coche sur le choix en cours (composant maison, sans dépendance).
- Filtre par groupe : la puce « Tous les groupes » ouvre la même liste (Tous les groupes, puis les groupes de la saison active) et affiche ensuite le groupe choisi ; « Archivés (n) » bascule.
- Fiche : enregistrement automatique de chaque champ en le quittant, s'il est valide ; sinon l'erreur s'affiche sous le champ.
- Confirmation de suppression : elle cite aussi les inscriptions, et la date de naissance seulement si elle existe ; maquette mise à jour.
- La maquette Membres a déjà son champ de recherche : rien à modifier (erreur de lecture de l'IA au découpage du 007).

## Hors périmètre

- Section Contacts de la fiche (008), groupes de la fiche (007c), « Importer (CSV) » (lot 2, F-07)
