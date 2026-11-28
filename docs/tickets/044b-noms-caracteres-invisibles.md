# 044b — Saison, créneau, contact : refuser les caractères invisibles

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (validation des entrées, SEC-06 ; restauration refusée en entier, SEC-10 ; textes affichés à l'écran, dans l'export CSV et dans le rapport PDF) · Trivial : non

Dépend de : 044 (`validateGroupName`, même règle `NAME_INVALID_CHAR`) · Fichiers touchés : `src/domain/validation.ts` (`validateSeason`, `validateSlot`, `validateContact`) et un test du domaine, `src/data/backupRows.ts` et son test (règles `seasons`, `slots`, `emergency_contacts`), `src/data/seasonsRepo.test.ts`, `src/data/slotsRepo.test.ts`, `src/data/contactsRepo.test.ts`, `src/app/saisons/[id].tsx`, `src/app/contacts/[id].tsx`, éventuellement `src/app/creneaux/[id].tsx` et un test d'écran — environ 10 fichiers, environ 15 avec la liste élargie (décision du porteur du 2026-11-28) : découpage proposé en 044b et 044c ci-dessous

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
- **Liste SEC-06 élargie** (décision du porteur du 2026-11-28, intégration du lot J3-4) : `isInvisible` refuse aussi U+00AD, U+034F, U+115F, U+1160, U+180E, U+2060 à U+2064, U+3164, U+FFA0, U+FFF9 à U+FFFB et U+E0000 à U+E007F, **pour tous les noms** (membre, groupe, saison, créneau, libellé de contact), à la saisie, dans le dépôt, à l'import CSV (même `validateMember`) et à la restauration ; U+200D et U+FE0F restent acceptés ; une sauvegarde qui contient un de ces caractères est refusée en entier (`INVALID_DATA`), comme pour la liste actuelle. Le commentaire de `isInvisible` et la ligne SEC-06 de `docs/SECURITE.md` (intégration) suivent.

## Critères d'acceptation

- [ ] SEC-06 : un nom de saison, un nom ou un lieu de créneau, un libellé de contact fictifs contenant U+202E sont refusés à la création et à la modification ; un émoji avec U+200D reste accepté.
- [ ] SEC-06, SEC-10 : une sauvegarde avec un tel texte dans `seasons`, `slots` ou `emergency_contacts` est refusée en entier (`INVALID_DATA`).
- [ ] NF-06 : le message s'affiche sous le champ et est annoncé au lecteur d'écran.
- [ ] Aucun nom ni texte saisi dans le message d'erreur ni dans le journal (ABS-04).
- [ ] SEC-06, liste élargie : chaque caractère ajouté (bornes des plages comprises : U+2060, U+2064, U+FFF9, U+FFFB, U+E0000, U+E007F) est refusé dans un nom de membre et de groupe, à la saisie (message sous le champ) et dans le dépôt (`NAME_INVALID_CHAR`, rien d'écrit) ; un nom de membre fictif importé par CSV qui en contient est refusé sur sa ligne.
- [ ] SEC-06, SEC-10 : une sauvegarde dont un nom de membre ou de groupe contient un caractère ajouté est refusée en entier (`INVALID_DATA`).
- [ ] SEC-06 : un émoji composé avec U+200D (famille) et un émoji avec U+FE0F (cœur rouge) restent acceptés à la saisie, dans le dépôt et à la restauration ; un caractère voisin non listé (par exemple U+205F, espace mathématique moyenne) reste accepté.

## Tests attendus

- Liste élargie : test du domaine de `isInvisible` par `validateMemberName` et `validateGroupName` (tests nommés `SEC-06`, chaque caractère ajouté et les bornes des plages, émojis avec U+200D et U+FE0F acceptés) ; dépôt : `src/data/membersRepo.test.ts` et `src/data/groupsRepo.test.ts` ; saisie : `src/appTests/membersNameLength.test.tsx` (un caractère ajouté → message) ; restauration : `src/data/backupRows.test.ts` (nom de membre et de groupe, tests nommés `SEC-10`) ; import : `src/domain/memberImport.test.ts`.
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

**Découpage proposé** (intégration du lot J3-4, 2026-11-28) : avec la liste élargie, l'estimation passe à environ 15 fichiers (10 pour la saison, le créneau et le contact, 5 de plus pour la liste : un test du domaine, `membersRepo.test.ts`, `groupsRepo.test.ts`, `membersNameLength.test.tsx`, `memberImport.test.ts`). Zone sensible : le découpage attend la validation du porteur à la séance de lancement. Recommandation :

- **044b — liste SEC-06 élargie** (à faire en premier) : `src/domain/validation.ts` (`isInvisible` et son commentaire), un nouveau test du domaine (`src/domain/validationInvisible.test.ts`), `src/data/membersRepo.test.ts`, `src/data/groupsRepo.test.ts`, `src/data/backupRows.test.ts`, `src/appTests/membersNameLength.test.tsx`, `src/domain/memberImport.test.ts` — 7 fichiers. Les membres et les groupes reçoivent la liste élargie d'un coup, puisqu'ils partagent `isInvisible`.
- **044c — saison, créneau, contact** (dépend de 044b) : le reste de cette fiche (« Ce qui change » sauf la liste élargie, critères et tests de la saison, du créneau et du contact) — environ 10 fichiers, à recompter à la pré-analyse ; il reprend directement la liste élargie.
- Si le découpage est retenu : jalon 3 à 18 tickets, total jusqu'au jalon 6 à 57 (`docs/PLAN.md`, à l'intégration suivante).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Textes concernés et refus de sauvegarde | — | Saison, créneau (`name`, `place`), libellé de contact ; même règle que le 044, sauvegarde refusée en entier par `INVALID_DATA` | Même règle partout (SEC-06, SEC-10) | décidée par le porteur le 2026-11-28 |
| Liste SEC-06 des caractères refusés | Liste du 032 ; liste élargie | Élargie pour tous les noms : U+00AD, U+034F, U+115F, U+1160, U+180E, U+2060 à U+2064, U+3164, U+FFA0, U+FFF9 à U+FFFB, U+E0000 à U+E007F ; U+200D et U+FE0F acceptés ; sauvegarde qui en contient refusée de la même façon | Caractères invisibles ou de remplissage qui trompent l'affichage ; émojis composés gardés | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

## À reporter

- CHANGELOG : Saisons, créneaux, contacts : un nom ou un libellé avec un caractère invisible est refusé (SEC-06). Noms : la liste des caractères invisibles refusés est élargie (SEC-06).
- SECURITE.md : SEC-06, la liste élargie passe de « prévue » à « codée » (avec les tests) ; SEC-10, refus de sauvegarde pour la saison, le créneau et le contact.
- Architecture : rien.
