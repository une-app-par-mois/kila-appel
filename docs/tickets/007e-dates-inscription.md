# 007e — Inscription dans les dates de la saison

Statut : fusionné dans le groupe · Jalon : 1 · Zone sensible : non · Trivial : non

Relevé par la revue de sécurité du 007c ; décision du porteur du 2026-11-26.

## Ce qui change

- Une date de début d'inscription (ajout à un groupe, nouveau membre inscrit) hors des dates de la saison active est refusée, avec un message

- Décision du porteur du 2026-11-26 : la date proposée est aujourd'hui, ramené au premier ou au dernier jour de la saison active ; même règle pour « + Ajouter à un groupe » depuis la fiche d'un membre.

## Critères d'acceptation

- [x] Refus avant le début ou après la fin de la saison, rien n'est écrit (EX-04)

## Tests attendus

- Tests de données ; test d'écran du message
