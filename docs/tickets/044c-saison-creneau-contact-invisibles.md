# 044c — Saison, créneau, contact : refuser les caractères invisibles

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (validation des entrées, SEC-06 ; restauration refusée en entier, SEC-10 ; textes affichés à l'écran, dans l'import, l'export CSV et le rapport PDF ; SEC-07) · Trivial : non

Dépend de : 044b (liste SEC-06 élargie) et **043** (passe après lui : tous deux modifient `src/data/backupRows.ts`) · Fichiers touchés : `src/domain/validation.ts` (`validateSeason`, `validateSlot`, `validateContact`) et un test du domaine, `src/data/backupRows.ts` et un test (règles `seasons`, `slots`, `emergency_contacts`), `src/data/seasonsRepo.test.ts`, `src/data/slotsRepo.test.ts`, `src/data/contactsRepo.test.ts`, `src/app/saisons/[id].tsx`, `src/app/contacts/[id].tsx`, éventuellement `src/app/creneaux/[id].tsx` et un test d'écran ; plus les deux écarts ci-dessous (`src/app/import/apercu.tsx`, `src/domain/csvWrite.ts` et leurs tests) — environ 12 fichiers, **à recompter à la pré-analyse** et à redécouper au-delà de 10

Créé le 2026-11-28 à la séance de lancement du lot J3-5 (découpage du 044b validé par le porteur) : reprend la partie « saison, créneau, contact » de l'ancienne fiche 044b et deux écarts hors périmètre relevés à sa pré-analyse.

## Contexte

Le 044 refuse les caractères de contrôle et de sens d'affichage (liste SEC-06, élargie au 044b) dans un nom de groupe. Le nom d'une saison, le nom et le lieu d'un créneau (`name`, `place`) et le libellé d'un contact d'urgence passent encore seulement par `validateName` ou `optional()` : un caractère comme U+202E y renverse l'affichage, à l'écran comme dans les fichiers exportés.

## À lire

- `docs/SECURITE.md` : SEC-06 (liste des caractères refusés), SEC-07 (CSV), SEC-08, SEC-10 (restauration refusée en entier)
- Tickets 044 (règle des noms de groupe, décisions D1 à D9), 044b (liste élargie), 032 (noms de membre), 032b (erreur sous le champ), 035 (aperçu de l'import), 036 (`csvWrite.ts`), 043 (`backupRows.ts`)
- `src/domain/validation.ts` (`isInvisible`, `validateGroupName`, `optional`), `src/data/backupRows.ts` (`optionalLabel`)

## Ce qui change

- `src/domain/validation.ts` : `validateSeason` (nom), `validateSlot` (`name`, `place` quand ils sont remplis) et `validateContact` (libellé) refusent un caractère de la liste SEC-06 avec le code `NAME_INVALID_CHAR` ; `isInvisible` inchangé (liste du 044b).
- `src/data/backupRows.ts` : les règles `seasons`, `slots` (`optionalLabel`) et `emergency_contacts` appliquent la même règle ; une sauvegarde hors règle est refusée en entier par le refus existant `INVALID_DATA`, sans dire quelle ligne (même décision du porteur que le 044).
- `src/app/saisons/[id].tsx` : `toErrors` traduit aussi `NAME_INVALID_CHAR`.
- `src/app/contacts/[id].tsx` : l'erreur du libellé s'affiche sous le champ, et non plus en haut du formulaire.
- Fiche créneau : l'erreur de `name` ou `place` s'affiche sous le champ concerné (à vérifier à la pré-analyse).
- **Écart 1, aperçu de l'import** (ajouté par le porteur le 2026-11-28) : `src/app/import/apercu.tsx` affiche tel quel un nom de groupe inconnu lu dans le CSV (`unknownGroup`, `unknownGroups`), et U+202E y renverse l'affichage. Correction à proposer à la pré-analyse (nom neutralisé à l'affichage, ou ligne signalée sans le nom).
- **Écart 2, export CSV** (ajouté par le porteur le 2026-11-28) : la classe d'invisibles de `src/domain/csvWrite.ts` (SEC-07, neutralisation des formules) ne contient pas la liste élargie du 044b ; à aligner sur elle, en gardant un test qui fixe chaque caractère ajouté devant `=`, `+`, `-`, `@`.

## Critères d'acceptation

- [ ] SEC-06 : un nom de saison, un nom ou un lieu de créneau, un libellé de contact fictifs contenant U+202E (et un caractère de la liste élargie) sont refusés à la création et à la modification ; un émoji avec U+200D reste accepté.
- [ ] SEC-06, SEC-10 : une sauvegarde avec un tel texte dans `seasons`, `slots` ou `emergency_contacts` est refusée en entier (`INVALID_DATA`).
- [ ] SEC-06 : un nom de groupe inconnu contenant U+202E, lu dans un CSV fictif, ne renverse pas l'affichage de l'aperçu de l'import.
- [ ] SEC-07 : une cellule commençant par un caractère de la liste élargie suivi de `=` est neutralisée dans l'export CSV.
- [ ] NF-06 : le message s'affiche sous le champ et est annoncé au lecteur d'écran.
- [ ] Aucun nom ni texte saisi dans le message d'erreur ni dans le journal (ABS-04).

## Tests attendus

- Test du domaine (nommé `SEC-06`) ; `src/data/seasonsRepo.test.ts`, `src/data/slotsRepo.test.ts`, `src/data/contactsRepo.test.ts` ; règles `seasons`, `slots`, `emergency_contacts` de `backupRows` (tests nommés `SEC-10`) ; un test d'écran pour la saison et le contact ; aperçu de l'import ; `src/domain/csvWrite.test.ts` (`SEC-07`).

## Hors périmètre

- Longueur maximale de ces textes ; migration des données déjà en base (décision du porteur du 044 : aucune migration, la prochaine modification force la correction).
- Numéro de téléphone (validé par sa propre règle).

## Questions prévues

- **Réservée (sécurité, zone sensible)** : plan à valider à la séance de lancement de son lot.
- Points relevés par la pré-analyse du 044 :
  - `src/app/saisons/[id].tsx` traduit les codes un par un (`toErrors`) : y ajouter `NAME_INVALID_CHAR` ;
  - `src/app/contacts/[id].tsx` affiche l'erreur en haut du formulaire au lieu de la mettre sous le champ ;
  - les créneaux passent par `optional()` (domaine) et `optionalLabel` (sauvegarde) ;
  - au-delà de 10 fichiers, découper le ticket avant de commencer.
- Limite probable, à reposer : comme au 044 et au 044b, une saison, un créneau ou un contact déjà en base avec un tel caractère bloquera la sauvegarde.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Textes concernés et refus de sauvegarde | — | Saison, créneau (`name`, `place`), libellé de contact ; même règle que le 044, sauvegarde refusée en entier par `INVALID_DATA` | Même règle partout (SEC-06, SEC-10) | décidée par le porteur le 2026-11-28 |
| Création du ticket et ordre | — | Découpé du 044b ; dépend du 044b ; passe après le 043 (`backupRows.ts`) | Plus de 10 fichiers en zone sensible ; un seul ticket à la fois sur `backupRows.ts` | décidée par le porteur le 2026-11-28 |
| Écarts de l'aperçu de l'import et de `csvWrite.ts` | Ticket à part ; ajoutés au 044c | Ajoutés au 044c | Même liste SEC-06, même famille de textes | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

## À reporter

- CHANGELOG : Saisons, créneaux, contacts : un nom ou un libellé avec un caractère invisible est refusé (SEC-06).
- SECURITE.md (intégration) : SEC-10, refus de sauvegarde pour la saison, le créneau et le contact ; SEC-07, classe d'invisibles alignée sur la liste élargie.
- Architecture : rien.
