# 044 — Noms de groupe : refuser les caractères invisibles

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (validation des entrées, SEC-06 ; nom de groupe affiché à l'écran, dans l'export CSV et dans le rapport PDF) · Trivial : non

Dépend de : aucun (039 fusionné) · Fichiers touchés : `src/domain/validation.ts` et `src/domain/validation.test.ts`, `src/data/groupsRepo.ts` et son test, `src/data/backupRows.ts` et son test (restauration), éventuellement `src/config/libelles/` (texte d'erreur de la fiche groupe) — environ 6 fichiers, à préciser à la pré-analyse

Créé le 2026-11-28 à l'intégration du lot J3-3 (« À reporter » de la fiche 039, revue de sécurité du 039).

## Contexte

`isInvisible` (`src/domain/validation.ts`) refuse les caractères de contrôle et de sens d'affichage dans un nom de membre (SEC-06, ticket 032), mais un nom de groupe ne passe que par `validateName` (non vide, `trim()`). Un caractère de contrôle bidirectionnel comme U+202E renverse alors l'affichage du nom du groupe dans le rapport PDF (039) et à l'écran.

## À lire

- `docs/SECURITE.md` : SEC-06 (liste des caractères refusés), SEC-08, SEC-10 (restauration refusée en entier)
- Tickets 032 (règle des noms de membre), 006 et 006d (groupes), 039 (rapport)
- `src/domain/validation.ts` (`isInvisible`, `validateMemberName`), `src/data/groupsRepo.ts`, `src/data/backupRows.ts`

## Ce qui change

- `src/domain/validation.ts` : une règle de nom de groupe qui applique `isInvisible` (même liste que les noms de membre), à la création et au renommage d'un groupe.
- `src/data/backupRows.ts` : une sauvegarde dont un nom de groupe est hors de cette règle est refusée, comme pour les noms de membre (à confirmer à la pré-analyse).
- Fiche groupe : texte d'erreur si le nom contient un caractère invisible.

## Critères d'acceptation

- [ ] SEC-06 : un nom de groupe fictif contenant U+202E (ou un autre caractère de la liste de SEC-06) est refusé à la création et au renommage ; U+200D reste accepté.
- [ ] SEC-06, SEC-10 : une sauvegarde avec un tel nom de groupe est refusée en entier (si retenu).
- [ ] Aucun nom dans le message d'erreur ni dans le journal (ABS-04).

## Tests attendus

- `src/domain/validation.test.ts`, `src/data/groupsRepo.test.ts`, `src/data/backupRows.test.ts` (tests nommés `SEC-06`).

## Hors périmètre

- Longueur maximale d'un nom de groupe (question à poser à la pré-analyse si besoin) ; noms de saison et de créneau.

## Questions prévues

- **Réservée (sécurité, données)** : plan à valider à la séance de lancement (zone sensible).
- **Réservée** : une sauvegarde existante avec un nom de groupe hors règle : refusée en entier (comme les membres) ou nom nettoyé ; recommandation : refusée en entier, même règle que SEC-10 pour les membres.
- Groupe déjà en base avec un caractère invisible (recette) : l'appli n'est pas publiée, aucune migration prévue.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Groupes : un nom de groupe avec un caractère invisible est refusé (SEC-06).
- Architecture : rien.
