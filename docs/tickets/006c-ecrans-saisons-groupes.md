# 006c — Écrans saisons et groupes

Statut : à faire · Jalon : 1 · Zone sensible : oui (confirmations de suppression) · Trivial : non

Issu du découpage du ticket 006 (décision du porteur du 2026-11-26).

## Contexte

Premiers écrans de gestion, sur les dépôts du ticket 006 et les composants du 006b.

## À lire

- Maquettes : Saisons, Création ou modification d'une saison, Suppression d'une saison, Groupes, Création d'un groupe, Renommer ou supprimer un groupe, Suppression d'un groupe, Paramètres, États vides

## Ce qui change

- Écrans Paramètres, saisons, groupes et leurs confirmations
- Paramètres sert d'écran d'accueil provisoire jusqu'au ticket 012 (barre d'onglets), décision du porteur du 2026-11-26

## Critères d'acceptation

- [ ] Écrans conformes aux maquettes ; états vides
- [ ] La confirmation de suppression d'une saison dit ce qui sera effacé (groupes, créneaux, séances, présences) et que les membres restent (EX-01)
- [ ] La confirmation de suppression d'un groupe dit ce que fait la base (ARCHITECTURE §4.1) : « Seront effacés : ses inscriptions et ses liens aux créneaux. Les séances, leurs présences et les membres sont conservés. » Le texte de la maquette, qui annonçait l'effacement des séances, est corrigé (décision du porteur du 2026-11-26)
- [ ] Dates d'une saison refusées (`SESSIONS_OUTSIDE_SEASON`) : « Des séances ont déjà eu lieu hors de ces dates. » (décision du porteur du 2026-11-26)
- [ ] Échec de chargement (`loadFailed`) : un message à la place du chargement sans fin
- [ ] Un groupe archivé montre « Désarchiver » à la place d'« Archiver » (absent de la maquette, ajouté par décision du porteur du 2026-11-26)

## Tests attendus

- Tests d'écrans des confirmations

## Hors périmètre

- Barre d'onglets (012), membres (007)
