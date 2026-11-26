# 006c — Écrans des saisons

Statut : en cours · Jalon : 1 · Zone sensible : oui (confirmation de suppression) · Trivial : non

Issu du découpage du ticket 006, puis redécoupé le 2026-11-26 (décision du porteur) : 006c (saisons), 006d (groupes), 006e (licences).

## Contexte

Premiers écrans de gestion, sur les dépôts du ticket 006 et les composants du 006b.

## À lire

- Maquettes : Paramètres, Saisons, Création ou modification d'une saison, Suppression d'une saison

## Ce qui change

- Composants `Screen` (fond Papier, en-tête avec retour) et `TextField` (étiquette, erreur)
- Écran Paramètres : accueil provisoire jusqu'au ticket 012 ; seulement les lignes qui mènent à un écran existant (ici Saisons ; chaque ticket ajoute la sienne)
- Écrans Saisons et formulaire de saison (création, modification, suppression)
- Une saison créée alors qu'aucune n'est active devient active

## Critères d'acceptation

- [ ] Écrans conformes aux maquettes
- [ ] La confirmation de suppression d'une saison dit ce qui sera effacé (groupes, inscriptions, créneaux, séances, présences, appel en cours) et que les membres restent (EX-01)
- [ ] Dates saisies en JJ/MM/AAAA (RM-04) ; erreurs affichées sous le champ et lues par le lecteur d'écran
- [ ] Dates refusées si des séances tomberaient en dehors : « Des séances ont déjà eu lieu hors de ces dates. » (`SESSIONS_OUTSIDE_SEASON`)
- [ ] Échec de chargement (`loadFailed`) : un message à la place du chargement sans fin
- [ ] Une saison créée sans saison active devient active (décision du porteur du 2026-11-26)

## Tests attendus

- Tests d'écran : liste, activation, formulaire (erreurs), confirmation de suppression
- Test de données : activation de la première saison créée

## Décisions du porteur (2026-11-26)

- Paramètres ne montre que les lignes qui mènent à un écran existant.
- Une saison créée sans saison active devient active.

## Hors périmètre

- Écrans des groupes (006d), licences (006e), barre d'onglets et Bienvenue (012)
