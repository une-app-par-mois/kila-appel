# 009 — Créneaux récurrents

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Déclarer quand les groupes se réunissent (EX-07).

## À lire

- `docs/PRD.md` EX-07
- Maquettes : Créneaux, Créneau récurrent, Modification d'un créneau

## Ce qui change

- Dépôts `slots`, `slot_groups`
- Écrans liste, création, modification, suppression

## Critères d'acceptation

- [ ] Jour, heure, durée, lieu et nom facultatifs, groupe (EX-07)
- [ ] Modifier ou supprimer un créneau ne modifie aucune séance enregistrée (EX-07)

## Tests attendus

- Tests de données (séances intactes après modification)

## Hors périmètre

- Ponctuels (F-10), plusieurs groupes à l'écran (F-11) — le schéma les permet déjà
