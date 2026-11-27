# 006f — Modifier une saison sans laisser d'inscription hors de ses dates

Statut : en cours · Jalon : 1 · Zone sensible : oui (comme 006 et 006c) · Trivial : non

Relevé par la revue du 007e ; décision du porteur du 2026-11-26.

## Ce qui change

- Modifier les dates d'une saison est refusé si une inscription à l'un de ses groupes commence hors des nouvelles dates (EX-01, EX-04), avec le message « Des inscriptions commencent hors de ces dates. », comme le refus existant pour les séances (`SESSIONS_OUTSIDE_SEASON`)

## Critères d'acceptation

- [ ] Refus si une inscription commence avant le nouveau début ou après la nouvelle fin ; rien n'est modifié
- [ ] Une période vide (fin = début) ne bloque pas

## Tests attendus

- Tests de données (`seasonsRepo.update`) ; test d'écran du message
