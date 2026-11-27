# 009 — Créneaux récurrents : données

Statut : fusionné dans le groupe · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) : 009 (données et hooks), 009b (écrans).

## Contexte

Déclarer quand les groupes se réunissent (EX-07).

## À lire

- `docs/PRD.md` EX-07, RM-05
- `docs/ARCHITECTURE.md` §4 (`slots`, `schedule_from`, jamais de `REPLACE INTO`)
- Maquettes : Créneaux, Créneau récurrent, Modification d'un créneau

## Ce qui change

- Dépôt `slotsRepo` (`slots`, `slot_groups`) : créneaux hebdomadaires de la saison (jour, début, durée, lieu et nom facultatifs, un groupe), lire, créer, modifier, supprimer
- `slots.schedule_from` : date du jour à la création ; avancée à la date du jour quand le jour ou l'heure changent, jamais reculée (EX-07, ticket 005) ; jamais de `REPLACE INTO`
- Validation (`validateSlot`) et hooks `useSlots`, `useSlot`
- Groupe : un seul, de la saison du créneau, non archivé quand il est choisi

## Critères d'acceptation

- [x] Jour, heure, durée, lieu et nom facultatifs, groupe (EX-07)
- [x] Modifier ou supprimer un créneau ne modifie aucune séance enregistrée (EX-07)

## Tests attendus

- Tests de données (séances intactes après modification et suppression, `schedule_from`), validation, hooks

## Hors périmètre

- Écrans (009b) ; ponctuels (F-10), plusieurs groupes à l'écran (F-11) — le schéma les permet déjà
