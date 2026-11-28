# 044b — Saison, créneau, contact : refuser les caractères invisibles

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (validation des entrées, SEC-06 ; restauration refusée en entier, SEC-10 ; textes affichés à l'écran, dans l'export CSV et dans le rapport PDF) · Trivial : non

Dépend de : 044 (`validateGroupName`, même règle `NAME_INVALID_CHAR`) · Fichiers touchés : `src/domain/validation.ts` (`validateSeason`, `validateSlot`, `validateContact`) et un test du domaine, `src/data/backupRows.ts` et son test (règles `seasons`, `slots`, `emergency_contacts`), `src/data/seasonsRepo.test.ts`, `src/data/slotsRepo.test.ts`, `src/data/contactsRepo.test.ts`, `src/app/saisons/[id].tsx`, `src/app/contacts/[id].tsx`, éventuellement `src/app/creneaux/[id].tsx` et un test d'écran — environ 10 fichiers, à préciser à la pré-analyse (au-delà de 10, découper)

Créé le 2026-11-28 à la séance de lancement du lot J3-4 (décision du porteur : la règle du 044 s'étend à la saison, au créneau et au libellé de contact).

## Contexte

Le 044 refuse les caractères de contrôle et de sens d'affichage (liste de SEC-06) dans un nom de groupe. Le nom d'une saison, le nom et le lieu d'un créneau (`name`, `place`) et le libellé d'un contact d'urgence passent encore seulement par `validateName` ou `optional()` : un caractère comme U+202E y renverse l'affichage, à l'écran comme dans les fichiers exportés.

## À lire

- `docs/SECURITE.md` : SEC-06 (liste des caractères refusés), SEC-08, SEC-10 (restauration refusée en entier)
- Tickets 044 (règle des noms de groupe, décisions D1 à D7), 032 (noms de membre), 032b (erreur sous le champ)
- `src/domain/validation.ts` (`isInvisible`, `validateGroupName`, `optional`), `src/data/backupRows.ts` (`name`, `optionalLabel`)

## Ce qui change

- `src/domain/validation.ts` : `validateSeason` (nom), `validateSlot` (`name`, `place` quand ils sont remplis) et `validateContact` (libellé) refusent un caractère de la liste SEC-06 avec le code `NAME_INVALID_CHAR` ; `isInvisible` inchangé.
- `src/data/backupRows.ts` : les règles `seasons`, `slots` (`optionalLabel`) et `emergency_contacts` appliquent la même règle ; une sauvegarde hors règle est refusée en entier par le refus existant `INVALID_DATA`, sans dire quelle ligne (même décision du porteur que le 044).
- `src/app/saisons/[id].tsx` : `toErrors` traduit aussi `NAME_INVALID_CHAR`.
- `src/app/contacts/[id].tsx` : l'erreur du libellé s'affiche sous le champ, et non plus en haut du formulaire.
- Fiche créneau : l'erreur de `name` ou `place` s'affiche sous le champ concerné (à vérifier à la pré-analyse).

## Critères d'acceptation

- [ ] SEC-06 : un nom de saison, un nom ou un lieu de créneau, un libellé de contact fictifs contenant U+202E sont refusés à la création et à la modification ; un émoji avec U+200D reste accepté.
- [ ] SEC-06, SEC-10 : une sauvegarde avec un tel texte dans `seasons`, `slots` ou `emergency_contacts` est refusée en entier (`INVALID_DATA`).
- [ ] NF-06 : le message s'affiche sous le champ et est annoncé au lecteur d'écran.
- [ ] Aucun nom ni texte saisi dans le message d'erreur ni dans le journal (ABS-04).

## Tests attendus

- Test du domaine (nommé `SEC-06`) ; `src/data/seasonsRepo.test.ts`, `src/data/slotsRepo.test.ts`, `src/data/contactsRepo.test.ts` ; `src/data/backupRows.test.ts` (règles `seasons`, `slots`, `emergency_contacts`, tests nommés `SEC-10`) ; un test d'écran pour la saison et le contact.

## Hors périmètre

- Longueur maximale de ces textes ; migration des données déjà en base (décision du porteur du 044 : aucune migration, la prochaine modification force la correction).
- Numéro de téléphone (validé par sa propre règle).

## Questions prévues

- **Réservée (sécurité, zone sensible)** : plan à valider à la séance de lancement.
- Règle et refus de sauvegarde décidés par le porteur le 2026-11-28 (séance de lancement du lot J3-4).
- Points relevés par la pré-analyse du 044 :
  - `src/app/saisons/[id].tsx` traduit les codes un par un (`toErrors`) : y ajouter `NAME_INVALID_CHAR` ;
  - `src/app/contacts/[id].tsx` affiche l'erreur en haut du formulaire au lieu de la mettre sous le champ ;
  - les créneaux passent par `optional()` (domaine) et `optionalLabel` (sauvegarde) ;
  - tests à prévoir pour `seasonsRepo`, `slotsRepo`, `contactsRepo` et pour les règles `seasons`, `slots`, `emergency_contacts` de `backupRows` ;
  - au-delà de 10 fichiers, découper le ticket avant de commencer.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Textes concernés et refus de sauvegarde | — | Saison, créneau (`name`, `place`), libellé de contact ; même règle que le 044, sauvegarde refusée en entier par `INVALID_DATA` | Même règle partout (SEC-06, SEC-10) | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

## À reporter

- CHANGELOG : Saisons, créneaux, contacts : un nom ou un libellé avec un caractère invisible est refusé (SEC-06).
- Architecture : rien.
