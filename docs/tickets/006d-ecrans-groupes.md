# 006d — Écrans des groupes

Statut : fait (PR #63 vers `main`) · Jalon : 1 · Zone sensible : oui (confirmation de suppression) · Trivial : non

Issu du découpage du ticket 006c (décision du porteur du 2026-11-26).

## À lire

- Maquettes : Groupes, Création d'un groupe, Groupe, Renommer ou supprimer un groupe, Suppression d'un groupe, États vides

## Ce qui change

- Écrans Groupes (saison active), groupes archivés, création, fiche d'un groupe, modification ; ligne Groupes dans Paramètres

## Critères d'acceptation

- [x] Écrans conformes aux maquettes ; états vides
- [x] La confirmation de suppression d'un groupe dit ce que fait la base (ARCHITECTURE §4.1) : « Seront effacés : ses inscriptions et ses liens aux créneaux. Les séances, leurs présences et les membres sont conservés. » Le texte de la maquette, qui annonçait l'effacement des séances, est corrigé (décision du porteur du 2026-11-26)
- [x] Un groupe archivé montre « Désarchiver » à la place d'« Archiver » (ajouté par décision du porteur du 2026-11-26)
- [x] Sans saison active : « Aucune saison active » et un bouton vers Saisons (texte absent des maquettes, décision du porteur du 2026-11-26)

- [x] `useGroups` recharge tous les écrans ouverts après une modification, comme `useSeasons` (revue du 006c : une pile native garde les écrans précédents montés) ; supprimer une saison recharge aussi les groupes

## Décisions du porteur (2026-11-26)

- La ligne d'un groupe montre son nom seul : le nombre de membres arrive au ticket 007, le créneau au 009.
- La confirmation de suppression donne les nombres : « Seront effacés définitivement : ses 22 inscriptions et ses liens à 1 créneau et à 31 séances. » puis « Les séances, leurs présences et les membres sont conservés. Pour le retirer des écrans sans rien effacer, utilisez plutôt « Archiver ». »
- Fiche d'un groupe sans membre : état vide sans le bouton « Ajouter des membres » (ticket 007).

## Tests attendus

- Tests d'écran : liste, archivage, désarchivage, confirmation de suppression

## Hors périmètre

- Membres et inscriptions (007), créneaux (009)
