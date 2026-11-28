# 043b — Trace des groupes d'une séance : règle RM-03

Statut : à faire (plan validé par le porteur le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (calcul affiché : règle RM-03 des statistiques ; export et rapport, données de mineurs qui sortent de l'appareil) · Trivial : non

Dépend de : 043 (colonne `sessions.group_count`, s'enchaîne dans le lot J3-5) · Fichiers touchés : `src/data/statsSql.ts` (`credits`), `src/data/statsRepo.ts` et son test, `src/data/attendanceExportRepo.test.ts`, `src/data/reportRepo.test.ts`, `src/data/reportGridRepo.test.ts`, `src/__fixtures__/statsSeed.ts` — 7 fichiers

Créé le 2026-11-28 à la séance de lancement du lot J3-5 (découpage du 043 validé par le porteur).

## Contexte

Quand un groupe est supprimé, sa ligne de `session_groups` et les inscriptions de ses membres disparaissent (`ON DELETE CASCADE`). Une séance qui avait deux groupes ressemble alors à une séance d'un seul groupe, et le repli « un seul groupe » de RM-03 (`credits` de `src/data/statsSql.ts`) attribue au groupe restant les présences des membres du groupe supprimé (exemple du jeu fictif : supprimer Vétérans fait compter le retard de Paul pour Benjamins). Le 043 fige le nombre de groupes de la séance dans `sessions.group_count` ; ce ticket s'en sert dans la règle.

## À lire

- Fiche 043 (schéma, remplissage, limite des séances anciennes) ; fiche 036, Q2 ; ticket 023 (RM-03, cas de secours du groupe unique)
- `docs/PRD.md` : RM-03, EX-27, EX-31, EX-32, NF-08
- `src/data/statsSql.ts` (`credits`), `src/data/statsRepo.ts` (`MEMBER`), `src/data/attendanceExportRepo.ts`, `src/data/reportRepo.ts`, `src/data/reportGridRepo.ts`

## Ce qui change

- `src/data/statsSql.ts` : le repli « un seul groupe » de RM-03 ne vaut que si la séance n'a jamais eu qu'un groupe : `COALESCE(rs.group_count, compte actuel) = 1`. **Une seule règle**, dans `credits`, pour les statistiques, l'export CSV, le rapport et sa grille.
- `src/data/statsRepo.ts` : `MEMBER` ne recopie plus `x.groups = 1` hors de `credits` ; il passe par la règle unique.
- Une présence qui ne compte plus pour aucun groupe : « Sans groupe » dans l'export « Tous les groupes », absente d'un export filtré et des statistiques du groupe restant (décision du porteur du 2026-11-28 au 036).
- `src/__fixtures__/statsSeed.ts` : `group_count = 2` pour les séances à deux groupes du jeu fictif.

## Critères d'acceptation

- [ ] RM-03 : séance à deux groupes enregistrée, puis un groupe supprimé : la présence d'un membre du seul groupe supprimé ne compte plus pour le groupe restant, ni dans `statsRepo.overview` et `statsRepo.member`, ni dans l'export filtré, ni dans le rapport et sa grille ; elle sort en « Sans groupe » dans l'export « Tous les groupes ».
- [ ] RM-03 : séance d'un seul groupe : comportement inchangé (repli du groupe unique).
- [ ] Les tests « RM-03 Q2 » de `attendanceExportRepo.test.ts` et de `reportRepo.test.ts` sont **inversés** (ils fixent aujourd'hui le passage au groupe restant) ; `reportGridRepo.test.ts` suit (oracle `statsRepo.member`, décision 11 du 039b).
- [ ] Séance dont `group_count` est `NULL` : compte actuel des groupes (comportement d'avant le 043), testé et écrit comme limite.
- [ ] SEC-05 : requêtes paramétrées ; NF-08 : durées des statistiques, de l'export et du rapport inchangées sur `volumeSeed` (< 2 s).

## Tests attendus

- `src/data/statsRepo.test.ts`, `src/data/attendanceExportRepo.test.ts` (« RM-03 Q2 » inversés), `src/data/reportRepo.test.ts` (« RM-03 Q2 » inversé), `src/data/reportGridRepo.test.ts`.

## Hors périmètre

- Schéma, écriture et sauvegarde de `group_count` (043) ; reconstituer la trace des séances déjà enregistrées.

## Questions prévues

- Plan et découpage validés par le porteur le 2026-11-28 (séance de lancement du lot J3-5) ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- Décisions automatiques prévues par la pré-analyse (« à relire ») : `COALESCE(rs.group_count, compte actuel)`, une seule règle ; `statsSeed` à `group_count = 2` pour les séances à deux groupes.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Découpage | Un ticket ; 043 et 043b | 043b : règle RM-03 et tests « RM-03 Q2 » inversés, après le 043 dans le même lot | Plus de 10 fichiers en zone sensible | décidée par le porteur le 2026-11-28 |
| Nombre de groupes d'une séance | `group_count` seul ; `COALESCE(rs.group_count, compte actuel)` | `COALESCE` | Les séances `NULL` gardent le comportement d'avant le 043 ; limite provisoire jusqu'au 043c, testée (« RM-03 limite ») | à relire (prévue par la pré-analyse) |
| Une seule règle | `MEMBER` garde `x.groups = 1` avec la nouvelle expression ; prédicat commun | Prédicat `countsFor(membre, groupe, rs)` dans `statsSql.ts`, utilisé par `credits` et par `MEMBER` ; `groupCount` n'est plus exporté | Une seule écriture de RM-03 : la case d'un membre et les comptes ne peuvent plus diverger | à relire |
| Jeu fictif `statsSeed` | `group_count` sur toutes les séances ; seulement les séances à deux groupes | B2 seulement (`group_count = 2`) ; les autres restent `NULL` (compte actuel, même résultat) | Consigne du ticket ; un test pose `group_count = 1` pour vérifier le cas de secours inchangé | à relire (prévue par la pré-analyse) |
| NF-08 : remplir la colonne | Dans `volumeSeed` ; aide `fillGroupCount` appelée par les tests de volume | `fillGroupCount` (même requête que la migration 2), appelée après `volumeSeed` | `volumeSeed` sert aussi sur une base de version 1 (test de migration), sans la colonne | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques, export et rapport : une présence d'un groupe supprimé ne compte plus pour l'autre groupe de la séance (RM-03).
- Architecture : `statsSql.ts` : RM-03 s'écrit une fois, `countsFor` (lit `sessions.group_count`, compte actuel si `NULL`), utilisé par `credits` et par « Statistiques d'un membre ».
- NF-08 (jeu de volume, séances à deux groupes sur 3 saisons, colonne remplie, poste de dev) : synthèse 170 → 137 ms, export « Tous les groupes » 600 → 527 ms, export filtré 44 ms (inchangé), rapport 525 → 425 ms, grille 370 → 335 ms, membre et groupe ≈ 1 et 10 ms. Colonne `NULL` : durées d'avant.
- Pour le 043c : `alertsRepo.ts` (`GROUP_NAME`) applique encore l'ancienne règle `COUNT(*) = 1` ; à faire passer par la règle commune `COALESCE(s.group_count, compte actuel) = 1`, avec un test (Paul, inscrit aux Vétérans seulement ; Vétérans supprimé : son alerte affiche aujourd'hui « Benjamins »).
- Pour le 043c : `src/__fixtures__/e2eBackup.ts` (`writeVolumeBackup`) doit appeler `fillGroupCount(db)` après `volumeSeed` ; sinon la mesure NF-08 sur le téléphone ne passe que par le cas `NULL`.
- Pour l'intégration (`docs/ARCHITECTURE.md`, entrée du 036) : la « limite connue (Q2) » est levée par le 043b, sauf pour les séances dont `group_count` est `NULL` (jusqu'au 043c). Limite définitive : séance dont un groupe a été supprimé avant la migration 2, nombre de groupes figé après la suppression.
