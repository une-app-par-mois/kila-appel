# 023 — Statistiques : calcul et données

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (calcul affiché : taux de présence, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/domain/attendanceRate.ts` et son test (nouveaux), `src/domain/statsPeriod.ts` et son test (nouveaux), `src/data/statsRepo.ts` et son test (nouveaux), `src/hooks/useStats.ts` et son test (nouveaux) — 8 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

F-05 : taux de présence par groupe et par membre sur une période choisie, avec le détail par statut. Ce ticket pose les règles (domaine pur), les agrégats SQL et le hook ; les écrans viennent aux 024 et 025. Critère de sortie du jalon : « taux exacts sur un jeu fictif vérifié à la main ».

## À lire

- `docs/PRD.md` : EX-27, RM-01, RM-03, RM-04, NF-08 ; `docs/CADRAGE.md` : glossaire (taux de présence, séance enregistrée, archiver)
- `docs/ARCHITECTURE.md` §4.1 (`sessions`, `session_groups`, `attendances`, `enrollments` : fin exclue) et §10 (NF-08 : agrégats en SQL, index)
- `design/maquettes/` : « Statistiques », « Choix d'une période », « Statistiques d'un groupe », « Statistiques d'un membre »
- `src/domain/attendance.ts` (`countStatuses`), `src/domain/history.ts`, `src/data/sessionsRepo.ts` (281 lignes : ne pas y ajouter, d'où `statsRepo.ts`)

## Ce qui change

- `src/domain/attendanceRate.ts` : `attendanceRate(counts)` (RM-01 : (Présent + Retard) / (Présent + Retard + Absent), `null` sans dénominateur) ; `formatRate` (« 87 % », « — » pour `null`) ; parts de la barre par statut.
- `src/domain/statsPeriod.ts` : `season` (début de la saison active → aujourd'hui, borné à sa fin), `month` (1er du mois → aujourd'hui), `custom(from, to)` validé (RM-04, `from` ≤ `to`).
- `src/data/statsRepo.ts` : agrégats en SQL, une requête par écran (NF-08) :
  - synthèse de la période (taux, nombre de séances enregistrées) ;
  - par groupe (comptes par statut, nombre de séances) ;
  - par membre d'un groupe (comptes, trié par nom) ;
  - séance par séance d'un membre dans un groupe (statut, ou « hors inscription »).
- `src/hooks/useStats.ts` : `useStats(period)`, `useGroupStats(groupId, period)`, `useMemberStats(memberId, groupId, period)`, rechargés par `dataChanged`.

### Plan à valider (zone sensible)

1. Seules les séances `recorded` comptent (glossaire) ; `prepared`, `cancelled`, `unscheduled` jamais.
2. RM-03 : une présence compte pour le groupe de la séance (`session_groups`) auquel le membre était inscrit à la date de la séance (début inclus, fin exclue). Si aucun ne correspond (inscription modifiée après coup) et que la séance n'a qu'un groupe, la présence compte pour ce groupe. Elle compte toujours dans la synthèse.
3. Synthèse = toutes les présences des séances enregistrées de la période ; « Séances » = nombre de séances enregistrées de la période.
4. Groupes listés : ceux de la saison active, plus tout groupe (archivé ou d'une autre saison) qui a une séance dans la période.
5. Membres d'un groupe : inscrits au groupe à un moment de la période, archivés compris s'ils y ont une présence.
6. Arrondi : à l'entier le plus proche, sauf que « 100 % » et « 0 % » sont réservés aux valeurs exactes (99,6 % s'affiche « 99 % », 0,4 % s'affiche « 1 % »).
7. Période par défaut : la saison active.

## Critères d'acceptation

- [ ] RM-01 : 6 P, 1 R, 1 E, 4 A → 7/11 = « 64 % » ; que des excusés → « — » ; aucune séance → « — », jamais « 0 % » (tests nommés `RM-01`).
- [ ] RM-03 : un membre passé de « Poussins » à « Benjamins » en cours de période compte pour chacun selon la date de la séance.
- [ ] EX-27 : synthèse, par groupe et par membre sur la saison, le mois, des dates libres ; détail par statut (comptes exacts).
- [ ] **Jeu fictif vérifié à la main** : un fichier de `src/__fixtures__/` (nouveau ou `seed.ts`) donne des taux attendus écrits en clair dans le test, recalculés à la main dans la PR (tableau), réutilisé par la campagne Maestro (030).
- [ ] Bornes de période : séance le premier et le dernier jour comprise ; `from` > `to` refusé.
- [ ] Requêtes paramétrées (SEC-05) ; NF-08 : 500 membres et 3 saisons, chaque écran en une requête, durée mesurée dans le test.

## Tests attendus

- `src/domain/attendanceRate.test.ts`, `src/domain/statsPeriod.test.ts` : RM-01, arrondi, périodes (fin de mois, 29 février, fin de saison).
- `src/data/statsRepo.test.ts` sur `node:sqlite` : RM-03, états de séance, groupes archivés, jeu de volume.
- `src/hooks/useStats.test.tsx` : rechargement après `notifyDataChanged`.

## Hors périmètre

- Écrans (024, 025) ; podium (F-14, jalon 5) ; export CSV et rapport PDF (F-08, F-09, jalon 3).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible), notamment les points 2 (présence sans inscription correspondante) et 6 (arrondi).

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.
- Points 2 (présence sans inscription correspondante : groupe unique de la séance) et 6 (arrondi, 0 % et 100 % réservés aux valeurs exactes) acceptés tels quels.
- RM-01 fait foi sur la maquette : « Statistiques d'un membre » corrigée de 58 % à 64 % (7 sur 11).
- Groupes archivés ou d'une autre saison : listés après les autres avec « Archivé », s'ils ont une séance dans la période ; ils comptent dans la synthèse (point 4 du plan).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Bornes de « Ce mois » | Mois entier ; du 1er à aujourd'hui | Du 1er à aujourd'hui | Aucune séance enregistrée n'est future (EX-07, EX-09) : même résultat, période affichée exacte | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : calcul des taux de présence par groupe et par membre, sur la saison, le mois ou des dates libres (F-05, EX-27, RM-01, RM-03).
- Architecture : `src/domain/attendanceRate.ts`, `src/domain/statsPeriod.ts`, `src/data/statsRepo.ts`, `src/hooks/useStats.ts`.
