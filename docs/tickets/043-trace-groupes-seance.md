# 043 — Trace des groupes d'une séance après la suppression d'un groupe

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (migration du schéma ; règle RM-03 des statistiques et de l'export, données de mineurs qui sortent de l'appareil) · Trivial : non

Dépend de : 036 (fusionné) · Fichiers touchés : `src/data/migrations.ts` et son test, `src/data/statsSql.ts`, `src/data/sessionsRepo.ts` ou le dépôt de l'appel (écriture de la trace à l'enregistrement), `src/data/backupRows.ts` (restauration d'une sauvegarde avec la nouvelle colonne ou table), `src/data/attendanceExportRepo.test.ts`, `src/data/statsRepo.test.ts` — environ 8 fichiers, à préciser à la pré-analyse

Créé le 2026-11-28 à l'intégration du lot J3-2 (réponse du porteur à la Q2 du 036).

## Contexte

Quand un groupe est supprimé, sa ligne de `session_groups` et les inscriptions de ses membres disparaissent (`ON DELETE CASCADE`). Une séance qui avait deux groupes ressemble alors à une séance d'un seul groupe, et le repli « un seul groupe » de RM-03 (`credits` de `src/data/statsSql.ts`) attribue au groupe restant les présences des membres du groupe supprimé. Exemple du jeu fictif : supprimer Vétérans fait compter le retard de Paul (inscrit aux seuls Vétérans) pour Benjamins, dans les statistiques comme dans l'export Benjamins. Le porteur a gardé ce comportement comme limite connue au 036 (décision du 2026-11-28) et demandé ce ticket séparé, avec migration.

## À lire

- Fiche 036, « Questions pour le porteur », Q2 (analyse et options) ; ticket 023 (RM-03, cas de secours du groupe unique)
- `docs/PRD.md` : RM-03, EX-27, EX-31 ; `docs/ARCHITECTURE.md` §4.1, §4.2 (migrations), §4.3 (sauvegarde et restauration)
- `docs/SECURITE.md` : SEC-05, SEC-10, SEC-11 ; `docs/CONFORMITE.md` (ABS-08 si une donnée nouvelle est stockée)
- `src/data/statsSql.ts` (`credits`), `src/data/attendanceExportRepo.ts`, `src/data/migrations.ts`

## Ce qui change

- Migration (à choisir au plan, recommandation à donner par la pré-analyse) :
  - option A : `sessions.group_count`, nombre de groupes de la séance figé à l'enregistrement de l'appel ;
  - option B : ligne de `session_groups` gardée avec `group_id` NULL (`ON DELETE SET NULL` au lieu de `CASCADE`), clé primaire à revoir.
- `src/data/statsSql.ts` : le repli « un seul groupe » de RM-03 ne vaut que si la séance n'a jamais eu qu'un groupe. La règle corrigée sert aux statistiques **et** à l'export (une seule règle, dans `credits`).
- Une présence qui ne compte plus pour aucun groupe : « Sans groupe » dans l'export « Tous les groupes », absente d'un export filtré et des statistiques du groupe restant (décision du porteur du 2026-11-28 au 036).
- Séances déjà enregistrées avant la migration : **non reconstituées** (aucune trace à retrouver) ; elles gardent le comportement actuel. À écrire comme limite.
- Sauvegarde et restauration : la nouvelle colonne ou table est sauvegardée et vérifiée à la restauration (SEC-10) ; une sauvegarde d'avant la migration reste lisible.

## Critères d'acceptation

- [ ] RM-03 : séance à deux groupes enregistrée après la migration, puis un groupe supprimé : la présence d'un membre du seul groupe supprimé ne compte plus pour le groupe restant, ni dans `statsRepo.overview`, ni dans l'export filtré ; elle sort en « Sans groupe » dans l'export « Tous les groupes ».
- [ ] RM-03 : séance d'un seul groupe : comportement inchangé (repli du groupe unique).
- [ ] Les tests « RM-03 Q2 » de `src/data/attendanceExportRepo.test.ts` sont **inversés** (ils fixent aujourd'hui le passage au groupe restant).
- [ ] Séance enregistrée avant la migration : comportement actuel, testé et écrit comme limite.
- [ ] Migration testée sur une base de la version précédente ; sauvegarde d'avant la migration restaurée sans perte.
- [ ] SEC-05 : requêtes paramétrées ; NF-08 : durées des statistiques et de l'export inchangées sur `volumeSeed` (< 2 s).

## Tests attendus

- `src/data/migrations.test.ts` (base de la version précédente migrée), `src/data/attendanceExportRepo.test.ts` (« RM-03 Q2 » inversés), `src/data/statsRepo.test.ts` (même cas dans les statistiques), test de restauration d'une sauvegarde d'avant la migration.

## Hors périmètre

- Reconstituer la trace des séances déjà enregistrées ; changer RM-03 pour les séances d'un seul groupe.

## Questions prévues

- Plan à valider à la séance de lancement (zone sensible, migration) : option A ou B.
- ABS-08 : une colonne d'organisation (nombre de groupes) n'est pas une donnée personnelle ; à confirmer pour la politique de confidentialité.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques et export : une présence d'un groupe supprimé ne compte plus pour l'autre groupe de la séance (RM-03).
- Architecture : §4.1 (colonne ou table nouvelle), §4.2 (migration), `statsSql.ts` (`credits`).
