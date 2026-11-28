# 043 — Trace des groupes d'une séance : schéma, écriture et sauvegarde

Statut : à faire (plan validé par le porteur le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (migration du schéma ; sauvegarde et restauration) · Trivial : non

Dépend de : 036 (fusionné) · Fichiers touchés : `src/data/migrations.ts` et son test, `src/data/sessionsRepo.ts` et son test, `src/data/backupRows.ts` et son test, `src/data/backupCheck.test.ts`, `src/data/backup.test.ts` — 8 fichiers

Créé le 2026-11-28 à l'intégration du lot J3-2 (réponse du porteur à la Q2 du 036). Découpé le 2026-11-28 à la séance de lancement du lot J3-5 (décision du porteur) : **043** (schéma, écriture, sauvegarde) et **043b** (règle RM-03 et tests « RM-03 Q2 » inversés, `043b-regle-rm03-groupes.md`), qui dépend du 043 et s'enchaîne dans le même lot.

## Contexte

Quand un groupe est supprimé, sa ligne de `session_groups` et les inscriptions de ses membres disparaissent (`ON DELETE CASCADE`). Une séance qui avait deux groupes ressemble alors à une séance d'un seul groupe, et le repli « un seul groupe » de RM-03 (`credits` de `src/data/statsSql.ts`) attribue au groupe restant les présences des membres du groupe supprimé. Exemple du jeu fictif : supprimer Vétérans fait compter le retard de Paul (inscrit aux seuls Vétérans) pour Benjamins, dans les statistiques comme dans l'export Benjamins. Le porteur a gardé ce comportement comme limite connue au 036 (décision du 2026-11-28) et demandé ce ticket séparé, avec migration.

## À lire

- Fiche 036, « Questions pour le porteur », Q2 (analyse et options) ; ticket 023 (RM-03, cas de secours du groupe unique)
- `docs/PRD.md` : RM-03, EX-27, EX-31 ; `docs/ARCHITECTURE.md` §4.1, §4.2 (migrations), §4.3 (sauvegarde et restauration)
- `docs/SECURITE.md` : SEC-05, SEC-10, SEC-11 ; `docs/CONFORMITE.md` (ABS-08 si une donnée nouvelle est stockée)
- `src/data/statsSql.ts` (`credits`), `src/data/attendanceExportRepo.ts`, `src/data/migrations.ts`

## Ce qui change

Plan validé par le porteur le 2026-11-28 (option A, migration 2).

- `src/data/migrations.ts` : **migration 2** (et non une correction de la migration 1 ; ADR-003 et ARCHITECTURE §4.2 portent la mention datée) : colonne `sessions.group_count INTEGER CHECK (group_count IS NULL OR group_count >= 1)` ; remplissage à la migration : chaque séance existante reçoit le nombre actuel de ses lignes `session_groups` (`NULL` si elle n'en a plus aucune). Pas d'index.
- `src/data/sessionsRepo.ts` : `record` écrit `group_count`, figé à l'enregistrement de l'appel, **sans déclencheur** ; il ne change plus ensuite, même si un groupe est supprimé.
- `src/data/backupRows.ts` : `group_count` sauvegardé et vérifié à la restauration (SEC-10) ; **contrôle de cohérence** : une séance dont `group_count` est inférieur à son nombre de lignes `session_groups` est refusée par `INVALID_DATA` (sauvegarde refusée en entier, sans dire quelle ligne).
- Sauvegarde ancienne (version 1) : **migrée à la vérification** (`verifyBackup` applique la migration 2 sur la copie temporaire, ARCHITECTURE §4.3), puis restaurée sans perte.
- Séances déjà enregistrées avant la migration : la migration ne reconstitue pas un groupe déjà supprimé (aucune trace à retrouver) ; elles reçoivent le compte actuel. À écrire comme limite.

## Critères d'acceptation

- [ ] Migration 2 testée sur une base de la version 1 (`migrations.test.ts`) : colonne ajoutée, `group_count` égal au nombre de lignes `session_groups` de chaque séance ; schéma identique entre une base neuve et une base migrée (un test le vérifie).
- [ ] `CHECK` : `group_count` à 0 refusé ; `NULL` accepté.
- [ ] `sessionsRepo.record` : séance à deux groupes → `group_count = 2` ; après la suppression d'un groupe, `group_count` reste à 2.
- [ ] SEC-10 : sauvegarde avec `group_count` inférieur au nombre de groupes de la séance refusée en entier (`INVALID_DATA`) ; sauvegarde de la version 1 migrée puis restaurée sans perte ; sauvegarde de version future (`LATEST_VERSION + 1`) refusée.
- [ ] SEC-05 : requêtes paramétrées.

## Tests attendus

- `src/data/migrations.test.ts` (base de la version 1 migrée, schéma neuf égal au schéma migré), `src/data/sessionsRepo.test.ts`, `src/data/backupRows.test.ts` (cohérence, `SEC-10`), `src/data/backupCheck.test.ts` (sauvegarde ancienne migrée à la vérification), `src/data/backup.test.ts` (version future : `LATEST_VERSION + 1`).

## Hors périmètre

- Règle RM-03 des statistiques, de l'export et du rapport, et tests « RM-03 Q2 » inversés : ticket 043b.
- Reconstituer la trace des séances déjà enregistrées ; changer RM-03 pour les séances d'un seul groupe.

## Questions prévues

- ~~Plan à valider à la séance de lancement (zone sensible, migration) : option A ou B.~~ Option A, migration 2, plan validé par le porteur le 2026-11-28 ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- ~~ABS-08~~ : donnée d'organisation, non personnelle, stockée sur l'appareil et sauvegardée ; `docs/CADRAGE.md` (« Données manipulées ») et `docs/CONFORMITE.md` mis à jour le 2026-11-28 à la séance de lancement ; stores inchangés (« aucune donnée collectée »).
- Décisions automatiques prévues par la pré-analyse (« à relire ») : pas d'index ; `backup.test.ts` passe à `LATEST_VERSION + 1` ; un test vérifie que le schéma est identique entre une base neuve et une base migrée.

Reporté du lot J3-3 (2026-11-28, fiche 039) :

- Inverser le test « RM-03 Q2 séance à deux groupes dont l'un est supprimé : la présence passe au groupe restant (actuel) » de `src/data/reportRepo.test.ts`, comme ceux de `attendanceExportRepo.test.ts`. **Passé au 043b** (2026-11-28).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Forme de la trace | A : `sessions.group_count` ; B : `session_groups.group_id` NULL | A : `group_count INTEGER CHECK (group_count IS NULL OR group_count >= 1)`, figé par `sessionsRepo.record`, sans déclencheur | Une colonne, aucune clé primaire à revoir | décidée par le porteur le 2026-11-28 |
| Migration | Corriger la migration 1 ; migration 2 | Migration 2 ; ADR-003 et ARCHITECTURE §4.2 annotés ; sauvegardes antérieures migrées à la vérification | Décision datée du porteur | décidée par le porteur le 2026-11-28 |
| Remplissage et cohérence | — | Nombre actuel de lignes `session_groups` ; `group_count` inférieur au nombre de groupes refusé par `INVALID_DATA` (SEC-10) | Aucune trace à retrouver ; refus d'une sauvegarde incohérente | décidée par le porteur le 2026-11-28 |
| Découpage | Un ticket ; 043 et 043b | 043 : schéma, écriture, sauvegarde ; 043b : RM-03 | Plus de 10 fichiers en zone sensible | décidée par le porteur le 2026-11-28 |
| Index sur `group_count` (pré-analyse) | Index ; aucun | Aucun | Lu avec la séance, jamais filtré seul | à relire |
| Version future dans `backup.test.ts` (pré-analyse) | `2` en dur ; `LATEST_VERSION + 1` | `LATEST_VERSION + 1` | Reste juste après chaque migration | à relire |
| Schéma neuf = schéma migré (pré-analyse) | Pas de test ; test | Test dans `migrations.test.ts` (`sqlite_schema` trié, base v1 avec données migrée contre base neuve) | Le recontrôle de la restauration compare les schémas exactement | à relire |
| Critère « séance à deux groupes → `group_count = 2` » de `record` | Ajouter plusieurs groupes à `record` ; tester 2 par la migration | `record` ne prend qu'un groupe (`RollCallInput.groupId`) : il écrit `1` ; le cas « 2 » est testé par le remplissage de la migration et par la restauration v1 | Plusieurs groupes à l'appel n'existent pas encore (F-11 côté appel hors périmètre) | à relire |
| `group_count` NULL avec des groupes, à la restauration | Refuser ; accepter | Accepté (seul « inférieur » est refusé) | Lettre de la décision du porteur ; le 043b lit NULL comme « compte actuel » (`COALESCE`) ; un jeu fictif écrit en SQL brut laisse NULL | à relire |
| Où vit le contrôle de cohérence | `checkRows` ; contrôle à part dans `verifyBackup` | `checkRows` (règle `sessions`, sous-requête qualifiée par le schéma lu) | Joue aussi au recontrôle de la restauration (copie attachée), testé dans `backup.test.ts` | à relire |
| Tests rendus faux par la migration 2, hors liste de la fiche | Les laisser ; les ajuster | Ajustés : `slotsScheduleFrom.test.ts` (« `LATEST_VERSION` vaut 1 » devient « le déclencheur reste dans la migration 1 »), `backupExport.test.ts` (version `LATEST_VERSION`), `backupCheck.test.ts` (fausse migration 2 remplacée par la vraie, sur une sauvegarde v1 du jeu fictif) | Constats périmés par la décision du porteur ; 11 fichiers avec la fiche au lieu de 8 | à relire |
| Durée de la migration (NF-08) | Pas de test ; test | Test : base v1 de `volumeSeed` (1 200 séances à deux groupes) migrée en moins de 2 s | Première migration sur un appareil rempli | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : rien (visible au 043b).
- DECISIONS.md : les lignes « à relire » ci-dessus.
- Architecture : §4.1, colonne `sessions.group_count` (nombre de groupes figé à l'enregistrement) ; §4.2, migration 2.
- Reportés au 043b : tests « RM-03 Q2 » de `attendanceExportRepo.test.ts` et de `reportRepo.test.ts` à inverser ; requête de la grille du 039b (`reportGridRepo`) sous la même règle ; `MEMBER` de `src/data/statsRepo.ts` (`x.groups = 1` hors de `credits`) ramené dans la règle unique.
