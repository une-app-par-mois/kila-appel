# 044b — Noms : liste SEC-06 des caractères invisibles élargie

Statut : à faire (plan validé par le porteur le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (validation des entrées, SEC-06 ; restauration refusée en entier, SEC-10) · Trivial : non

Dépend de : 044 (fusionné : `validateGroupName`, même règle `NAME_INVALID_CHAR`) · Fichiers touchés : `src/domain/validation.ts` (`isInvisible` et son commentaire), `src/domain/validationInvisible.test.ts` (nouveau), `src/data/membersRepo.test.ts`, `src/data/groupsRepo.test.ts`, `src/data/backupRowsInvisible.test.ts` (nouveau ; `src/data/backupRows.test.ts` n'est pas touché), `src/appTests/membersNameLength.test.tsx`, `src/domain/memberImport.test.ts` — 7 fichiers

Créé le 2026-11-28 à la séance de lancement du lot J3-4 ; recentré sur la liste élargie seule à la séance de lancement du lot J3-5 (2026-11-28, découpage validé par le porteur). La saison, le créneau, le contact et deux écarts relevés à la pré-analyse passent au **044c** (`044c-saison-creneau-contact-invisibles.md`).

## Contexte

Le 044 refuse dans un nom de groupe, comme le 032 dans un nom de membre, les caractères de contrôle et de sens d'affichage de la liste SEC-06 (`isInvisible`). Le porteur a élargi cette liste le 2026-11-28 (intégration du lot J3-4) aux caractères invisibles ou de remplissage qui trompent l'affichage. Les membres et les groupes partagent `isInvisible` : ils reçoivent la liste élargie d'un coup.

## À lire

- `docs/SECURITE.md` : SEC-06 (liste des caractères refusés), SEC-10 (restauration refusée en entier)
- Tickets 032 (noms de membre), 032b (erreur sous le champ), 044 (décisions D1 à D9)
- `src/domain/validation.ts` (`isInvisible`, `validateMemberName`, `validateGroupName`), `src/data/backupRows.ts`

## Ce qui change

- `src/domain/validation.ts` : `isInvisible` refuse aussi U+00AD, U+034F, U+115F, U+1160, U+180E, U+2060 à U+2064, U+3164, U+FFA0, U+FFF9 à U+FFFB et U+E0000 à U+E007F, **pour tous les noms qui passent par lui** (membre, groupe), à la saisie, dans le dépôt, à l'import CSV (même `validateMember`) et à la restauration ; U+200D et U+FE0F restent acceptés. Le commentaire de `isInvisible` suit.
- Aucune autre ligne de code : `backupRows.ts`, les écrans et l'import utilisent déjà `isInvisible` par `validateMemberName` et `validateGroupName`.

## Critères d'acceptation

- [ ] SEC-06 : chaque caractère ajouté (bornes des plages comprises : U+2060, U+2064, U+FFF9, U+FFFB, U+E0000, U+E007F, plus U+E0061) est refusé dans un nom de membre et de groupe, à la saisie (message sous le champ) et dans le dépôt (`NAME_INVALID_CHAR`, rien d'écrit) ; un nom de membre fictif importé par CSV qui en contient est refusé sur sa ligne.
- [ ] SEC-06, SEC-10 : une sauvegarde dont un nom de membre ou de groupe contient un caractère ajouté est refusée en entier (`INVALID_DATA`).
- [ ] SEC-06 : un émoji composé avec U+200D (famille) et un émoji avec U+FE0F (cœur rouge) restent acceptés à la saisie, dans le dépôt et à la restauration ; des voisins non listés restent acceptés (U+00AC, U+00AE, U+205F, U+FFFC, 김민준).
- [ ] SEC-06 : un drapeau fait de tags (Écosse, Angleterre, Pays de Galles : U+1F3F4 suivi de caractères U+E0020 à U+E007F) est **refusé** ; un test fixe ce refus (décision du porteur du 2026-11-28).
- [ ] Aucun nom ni texte saisi dans le message d'erreur ni dans le journal (ABS-04).

## Tests attendus

- `src/domain/validationInvisible.test.ts` (nouveau, tests nommés `SEC-06`) : `isInvisible` par `validateMemberName` et `validateGroupName`, chaque caractère ajouté et les bornes des plages, émojis avec U+200D et U+FE0F acceptés, voisins acceptés, drapeau d'Écosse refusé.
- Dépôt : `src/data/membersRepo.test.ts`, `src/data/groupsRepo.test.ts` ; saisie : `src/appTests/membersNameLength.test.tsx` (un caractère ajouté → message) ; restauration : `src/data/backupRowsInvisible.test.ts` (nouveau, nom de membre et de groupe, tests nommés `SEC-10`) ; import : `src/domain/memberImport.test.ts`.

## Hors périmètre

- Saison, créneau, libellé de contact, aperçu de l'import et classe d'invisibles de `src/domain/csvWrite.ts` : ticket 044c.
- Migration ou nettoyage des noms déjà en base (décision du porteur du 044 : aucune migration).

## Limites connues (décisions du porteur du 2026-11-28)

- **Export bloqué par un nom déjà en base** : un nom de membre (comme un nom de groupe depuis le 044) enregistré avant ce ticket et qui contient l'un des caractères ajoutés fait échouer la sauvegarde et la restauration (`verifyBackup` → `checkRows`, `INVALID_DATA`) tant qu'il n'est pas corrigé. Acceptée : l'appli n'est pas publiée.
- **Drapeaux faits de tags refusés** : Écosse, Angleterre et Pays de Galles s'écrivent avec des caractères de la plage U+E0000 à U+E007F ; ils sont refusés dans un nom. À écrire dans SEC-06 (`docs/SECURITE.md`) à l'intégration.

## Questions prévues

- Plan et découpage validés par le porteur le 2026-11-28 (séance de lancement du lot J3-5) ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- Décisions automatiques prévues par la pré-analyse (« à relire ») : une condition par plage dans `isInvisible` ; tests écrits en clair, sans importer la liste ; bornes testées, plus U+E0061 ; voisins acceptés (U+00AC, U+00AE, U+205F, U+FFFC, 김민준, les émojis).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Textes concernés et refus de sauvegarde | — | Saison, créneau (`name`, `place`), libellé de contact ; même règle que le 044, sauvegarde refusée en entier par `INVALID_DATA` (passé au 044c) | Même règle partout (SEC-06, SEC-10) | décidée par le porteur le 2026-11-28 |
| Liste SEC-06 des caractères refusés | Liste du 032 ; liste élargie | Élargie pour tous les noms : U+00AD, U+034F, U+115F, U+1160, U+180E, U+2060 à U+2064, U+3164, U+FFA0, U+FFF9 à U+FFFB, U+E0000 à U+E007F ; U+200D et U+FE0F acceptés ; sauvegarde qui en contient refusée de la même façon | Caractères invisibles ou de remplissage qui trompent l'affichage ; émojis composés gardés | décidée par le porteur le 2026-11-28 |
| Découpage | Un ticket ; 044b et 044c | 044b : liste élargie seule (7 fichiers) ; 044c : saison, créneau, contact, après le 043 (`backupRows.ts`) | Plus de 10 fichiers en zone sensible | décidée par le porteur le 2026-11-28 |
| Export bloqué par un nom de membre déjà en base | Accepter ; nettoyer ou migrer | Accepté, comme pour les groupes au 044 | Appli non publiée | décidée par le porteur le 2026-11-28 |
| Drapeaux faits de tags | Accepter ; refuser | Refusés, limite écrite dans SEC-06 à l'intégration, un test fixe le refus | Plage U+E0000 à U+E007F refusée en entier | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

## À reporter

- CHANGELOG : Noms : la liste des caractères invisibles refusés est élargie (SEC-06).
- SECURITE.md (intégration) : SEC-06, la liste élargie passe de « prévue » à « codée » (avec les tests) ; limite des drapeaux faits de tags ; SEC-10, export bloqué par un nom de membre déjà en base.
- Architecture : rien.
