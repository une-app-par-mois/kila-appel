# 005 — Domaine : occurrences des créneaux et appels manquants

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Calculer les séances à la volée (ADR-004), base de l'appel, de l'accueil et de l'historique.

## À lire

- ADR-004
- `docs/PRD.md` EX-08, EX-09, EX-17, RM-05

## Ce qui change

- `src/domain/occurrences.ts` : dates d'un créneau sur une période ; séance du moment ou la plus proche ; appels manquants

## Critères d'acceptation

- [ ] Un créneau hebdomadaire donne ses dates sur une période, sans aucune antérieure à sa création (EX-08)
- [ ] La séance proposée est celle du créneau en cours, sinon la plus proche du jour (EX-09)
- [ ] Une date passée sans séance enregistrée est un appel manquant (EX-17)
- [ ] L'heure est passée en paramètre (CONV-11)

## Tests attendus

- Tests unitaires : bornes de période, créneau créé en cours de saison, passage à l'heure d'hiver, plusieurs créneaux le même jour

## Hors périmètre

- Créneaux ponctuels (F-10, jalon 4) ; séances préparées ou annulées (F-13)
