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

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques, export et rapport : une présence d'un groupe supprimé ne compte plus pour l'autre groupe de la séance (RM-03).
- Architecture : `statsSql.ts` (`credits`) lit `sessions.group_count`.
