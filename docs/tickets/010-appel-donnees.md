# 010 — Appel : données

Statut : fusionné dans le groupe · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) : 010 (données et hooks), 010b (écran d'appel), 010c (appel sans créneau, ajout d'un membre pendant l'appel).

## Contexte

Le cœur de l'appli : faire l'appel en moins de 30 s (NF-01).

## À lire

- `docs/PRD.md` EX-09, EX-10, EX-13, EX-15, EX-39, RM-03, RM-05
- `src/domain/occurrences.ts` (`proposedSession`, ticket 005)

## Ce qui change

- Dépôt `sessionsRepo` : enregistrer une séance d'un bloc (séance `recorded`, groupes figés, une présence par membre, commentaire facultatif) ; savoir si une séance de créneau est déjà enregistrée à une date
- Commentaire de séance : 500 caractères au plus (décision du porteur du 2026-11-27)
- Revue (décisions du porteur du 2026-11-27) : une séance de créneau tombe un jour du créneau, à son heure, et n'est jamais future ; changer le groupe d'un créneau avance sa date d'effet comme le jour ou l'heure
- Contrôles : groupe de la saison active, date dans la saison, membres inscrits au groupe à la date (RM-03), une séance par créneau et par date (RM-05)
- Hooks : liste de l'appel (inscrits à la date, triés par nom), séance proposée (EX-09), enregistrement

## Critères d'acceptation

- [x] Séance et présences enregistrées d'un bloc, ou rien (EX-15)
- [x] Une seule séance par créneau et par date (RM-05) ; appel sans créneau possible (EX-39)
- [x] Liste de l'appel : inscrits au groupe à la date de la séance, triés par nom (EX-09)

## Tests attendus

- Tests de données, de validation et de hooks

## Hors périmètre

- Écrans (010b, 010c) ; brouillon (011) ; correction d'une séance enregistrée (EX-18, ticket 013)
