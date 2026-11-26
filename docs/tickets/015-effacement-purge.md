# 015 — Tout effacer et purge

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

Effacement réel et conservation bornée (EX-23, EX-24, ABS-05).

## À lire

- `docs/PRD.md` EX-23, EX-24
- Maquettes : Tout effacer, Purge des anciennes saisons

## Ce qui change

- Réglage de conservation (table `settings`), purge, tout effacer

## Critères d'acceptation

- [ ] Tout effacer après double confirmation vide la base et les réglages (EX-23, SEC-11)
- [ ] Purge des saisons au-delà de la durée réglée, jamais la saison active ; confirmation qui liste ce qui part (EX-24)

## Tests attendus

- Tests de données (comptes de lignes avant et après)

## Hors périmètre

- Rien de plus que les critères ci-dessus.
