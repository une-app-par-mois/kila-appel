# 023 — Statistiques : calcul et données

Statut : fusionné dans le groupe (PR #70) · Jalon : 2 · Zone sensible : **oui** (calcul affiché : taux de présence, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

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

- [x] RM-01 : 6 P, 1 R, 1 E, 4 A → 7/11 = « 64 % » ; que des excusés → « — » ; aucune séance → « — », jamais « 0 % » (tests nommés `RM-01`).
- [x] RM-03 : un membre passé de « Poussins » à « Benjamins » en cours de période compte pour chacun selon la date de la séance.
- [x] EX-27 : synthèse, par groupe et par membre sur la saison, le mois, des dates libres ; détail par statut (comptes exacts).
- [x] **Jeu fictif vérifié à la main** : un fichier de `src/__fixtures__/` (nouveau ou `seed.ts`) donne des taux attendus écrits en clair dans le test, recalculés à la main dans la PR (tableau), réutilisé par la campagne Maestro (030) — `src/__fixtures__/statsSeed.ts`, tableau dans « À reporter » et dans la PR #70 ; réutilisation par Maestro à faire au 030.
- [x] Bornes de période : séance le premier et le dernier jour comprise ; `from` > `to` refusé.
- [x] Requêtes paramétrées (SEC-05) ; NF-08 : 500 membres et 3 saisons, chaque écran en une requête, durée mesurée dans le test — valeurs liées par `?n`, morceaux SQL constants (revue) ; durées mesurées en `node:sqlite` sur le poste ; non vérifié avec expo-sqlite (`+e.group_id`, plan de requête) ni sur le téléphone (030).

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
- Séance de lancement du lot J2-1 (2026-11-27), réponses du porteur :
  - membres listés dans un groupe : aussi tout membre dont au moins une présence compte pour le groupe (cas de secours du point 2), pour que le taux du groupe corresponde à sa liste ;
  - maquette : une case par séance enregistrée du groupe dans la période, et le nombre de séances suit ; sous-titre de « Statistiques d'un groupe » corrigé en « 13 séances » (fait au lancement) ;
  - file du porteur (appliqué, en attente du porteur) : sans saison active, `season` vaut `null`, période par défaut « Ce mois », seuls les groupes ayant une séance dans la période sont listés (avec « Archivé ») ;
  - reporté au 025 : affichage d'une séance où le membre était inscrit sans statut (le 023 renvoie `status: null` avec `enrolled`) ;
  - fichiers partagés avec 021 : ne pas modifier `src/__fixtures__/seed.ts` ni `src/data/errors.ts` ; jeux dans `src/__fixtures__/statsSeed.ts` (nouveau).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Bornes de « Ce mois » | Mois entier ; du 1er à aujourd'hui | Du 1er à aujourd'hui | Aucune séance enregistrée n'est future (EX-07, EX-09) : même résultat, période affichée exacte | à relire |
| Sans saison active (file du porteur) | Période « Ce mois », `season` nul ; message seul | `season` nul, période par défaut « Ce mois » (aussi si « Saison » est demandé) ; seuls les groupes ayant une séance dans la période, « Archivé » | Réponse du porteur au lancement du lot J2-1 | en attente du porteur |
| Séance où le membre était inscrit sans statut | Case vide ; « hors inscription » | Le 023 renvoie `status: null` et `enrolled: true` ; affichage décidé au 025 | Réponse du porteur au lancement | en attente du porteur |
| Taux d'un groupe | Somme des comptes puis RM-01 ; moyenne des taux des membres | Somme des comptes puis RM-01 | Pré-analyse : un membre à 1 séance ne pèse pas autant qu'un membre à 13 | à relire |
| Arrondi | Entier, moitié vers le haut ; autre | Entier, moitié vers le haut, en nombres entiers (pas de virgule flottante) ; 0 % et 100 % seulement exacts (99,5 → 99, 0,4 → 1) | Plan point 6 validé ; calcul exact | à relire |
| Parts de la barre | Plus forts restes ; arrondi simple | Plus forts restes sur les 4 statuts, total 100 ; à reste égal, le statut le plus nombreux, puis l'ordre de la barre ; tout statut non nul a au moins 1 point, pris sur la plus grande part (299 P, 1 A → 99, 0, 0, 1) | Règle d'égalité simple et prévisible, qui donne 50, 8, 8, 34 pour la maquette (6 P, 1 R, 1 E, 4 A) ; le minimum de 1 point garde visible un statut rare | changée après contradiction |
| Présences d'une séance sans groupe (groupe supprimé) | Synthèse seulement ; ignorées | Synthèse seulement | Plan point 3 : toutes les présences de la période | à relire |
| Séance de plusieurs groupes | Chaque groupe d'inscription ; le premier | Compte pour chaque groupe où le membre était inscrit, une seule fois dans la synthèse | RM-03 | à relire |
| Saison à venir ou finie | Bornée à ses dates ; jusqu'à aujourd'hui | Bornée : finie → jusqu'à sa fin ; à venir → son premier jour seul | Aucune séance hors de la saison ; période affichée exacte | à relire |
| Filtre « Saison » | Par les dates ; par `season_id` | Séances de la saison active (`sessions.season_id`) et dans ses dates ; « Ce mois » et dates libres : dates seules, toutes saisons | Réponse du porteur (deux saisons qui se chevauchent) | décidée par le porteur le 2026-11-27 |
| Suppression d'un groupe d'une séance commune | Figer les groupes crédités ; documenter | Comportement actuel documenté et figé par un test : la séance n'a plus qu'un groupe, les présences de l'autre groupe passent au groupe restant par le cas de secours (RM-03) ; revu au jalon 4 (F-11) | Réponse du porteur ; aucune séance commune n'existe avant F-11 | décidée par le porteur le 2026-11-27 |
| Dates libres invalides | Codes existants ; code nouveau | `DATE_INVALID` ou `END_BEFORE_START` (existants), revalidés dans le dépôt avant la requête | `errors.ts` partagé avec le lot ; aucun code nouveau | à relire |
| État vide | Indicateur ; liste vide | `anyRecorded` : au moins une séance enregistrée, toutes périodes confondues | Maquette « Pas encore de statistiques » | à relire |
| Tri | Collator ; SQL | `Intl.Collator('fr')` : membres par nom puis prénom ; groupes actifs puis archivés, par nom | Comme le reste de l'appli (accents) | à relire |
| Séance par séance | Plus ancienne d'abord ; plus récente d'abord | De la plus ancienne à la plus récente, puis par heure | Maquette (cases de gauche à droite) | à relire |
| Indicateur « Archivé » | Membre et groupe ; groupe seul | `archived` pour un membre, et pour un groupe archivé ou hors de la saison active | Réponse du porteur (groupes) ; membres archivés listés avec présence | à relire |
| Membres listés | Inscription qui recoupe la période ; inscrits aujourd'hui | Inscription non vide qui recoupe la période (archivés exclus), plus tout membre dont une présence compte pour le groupe | Plan point 5 et réponse du lancement | à relire |
| Jour courant | `useLocalNow` dans le hook ; paramètre | `useLocalNow` dans le hook (date seule) | Pré-analyse ; même horloge que l'accueil | à relire |
| Lecture de la saison active dans le hook | Requête à part ; dans l'agrégat | Une requête `getActive` à part, puis une seule requête d'agrégats par écran | NF-08 vise les agrégats ; requête triviale, déjà indexée | à relire |
| NF-08 mesure | Compteur ; durée | Compteur de requêtes (1 par écran) et durée < 2 s par écran : 500 membres, 3 saisons, 60 000 présences, plus une variante où toutes les séances ont deux groupes (120 000 présences) sur 3 saisons | Pré-analyse et revue : limite large, à l'abri des machines lentes de CI | à relire |
| Index | Aucun ; nouveaux | Aucun ajouté. Le test d'inscription écrit `+e.group_id` pour que SQLite passe par `enrollments_member` et non `enrollments_group` : synthèse de la variante à deux groupes de 1,2 s à 0,2 s | ARCHITECTURE §10 ; aucun index ni migration | à relire |
| Affichage du taux | « 64 % » espace insécable ; espace simple | Espace insécable avant « % », constante exportée `NBSP = '\u00a0'` (`attendanceRate.ts`), utilisée dans le code et les tests | Le taux ne se coupe jamais en fin de ligne ; caractère invisible écrit en clair | à relire |
| `ratePercent` hors domaine | Refuser ; laisser passer | Refuse `counted <= 0`, une valeur non entière, `attended` négatif ou plus grand que `counted` | Revue : un taux faux ne s'affiche jamais | à relire |
| Dates libres invalides dans `useStats` | Échec de lecture journalisé ; code de saisie | Choix validé avant la lecture ; `inputError` (`DATE_INVALID` ou `END_BEFORE_START`) rendu à l'écran, aucune lecture, aucun journal | Revue : une saisie à corriger n'est pas une panne | à relire |
| `member()` hors de la liste du groupe | Données vides ; `null` | `null` si le membre n'a ni inscription sur la période ni présence comptée pour le groupe (même règle que la liste du groupe) | Revue : un écran ne montre pas un membre absent de la liste | à relire |
| Découpage du dépôt et des tests | 10 fichiers ; 11 | `statsSql.ts` (morceaux SQL, tris) et `statsRepo.ts`, plus `statsVolume.test.ts` (NF-08) : 11 fichiers au total | Garde chaque fichier sous 300 lignes après les corrections de revue (comme `alertsVolume.test.ts` du 021) | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : calcul des taux de présence par groupe et par membre, sur la saison, le mois ou des dates libres (F-05, EX-27, RM-01, RM-03).
- Architecture : `src/domain/attendanceRate.ts` (RM-01, arrondi, parts de la barre), `src/domain/statsPeriod.ts` (saison, mois, dates libres), `src/data/statsRepo.ts` et `src/data/statsSql.ts` (agrégats SQL, une requête par écran, NF-08 ; « Saison » filtrée par `sessions.season_id`), `src/hooks/useStats.ts` ; jeu fictif `src/__fixtures__/statsSeed.ts` (réutilisé par la campagne Maestro, 030).
- Durées mesurées (node:sqlite, poste de développement, 3 passages ; limite du test : 2 s) :
  - un groupe par séance, période d'une saison (400 séances) : synthèse 11 à 19 ms, groupe 3 à 7 ms, membre 0 à 1 ms ;
  - deux groupes par séance, période de 3 saisons (1 200 séances, 120 000 présences) : synthèse 174 à 281 ms, groupe 12 à 20 ms, membre 0 à 1 ms (avant `+e.group_id` : synthèse 958 à 1 252 ms).
- Pour le 030 : mesurer sur l'appareil avec `volumeSeed` (variante `twoGroups` comprise).
- Pour 024, 025 et 030 : le taux s'écrit avec l'espace insécable `NBSP` (`src/domain/attendanceRate.ts`) ; `getByText` et Maestro doivent l'utiliser (`64\u00a0%`), un « 64 % » tapé avec une espace simple ne correspond pas.
- Pour 024 et 025 : `useStats` rend `inputError` pour des dates libres invalides (afficher le message de saisie, pas l'erreur de lecture).
- Pour le ticket F-11 du jalon 4 : figer les groupes crédités d'une séance avant que les séances communes existent (aujourd'hui, supprimer un groupe d'une séance commune fait passer ses présences au groupe restant ; test « EX-02 RM-03 comportement actuel » dans `statsRepo.test.ts`).
- Tableau pour la PR (jeu `statsSeed.ts`, recalculé à la main ; taux = (P + R) / (P + R + A)) :

| Période | Portée | Séances | P | R | E | A | Taux |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Saison (01/09 → 27/11) | Synthèse | 21 | 45 | 2 | 3 | 7 | 47/54 = 87 % |
| Saison | Poussins | 13 | 37 | 1 | 3 | 5 | 38/43 = 88 % |
| Saison | Benjamins | 7 | 7 | 0 | 0 | 2 | 7/9 = 78 % |
| Saison | Vétérans (archivé) | 1 | 0 | 1 | 0 | 0 | 1/1 = 100 % |
| Saison | Adultes | 0 | 0 | 0 | 0 | 0 | — |
| Saison | Poussins · Hugo Moreau | 13 cases | 6 | 1 | 1 | 4 | 7/11 = 64 % (barre 50, 8, 8, 34) |
| Saison | Poussins · Jules Lefebvre (archivé) | | 11 | 0 | 0 | 1 | 11/12 = 92 % |
| Saison | Poussins · Emma Durand | | 0 | 0 | 2 | 0 | — |
| Saison | Benjamins · Léa Michel (RM-03) | | 6 | 0 | 0 | 1 | 6/7 = 86 % (Poussins : 7/7 = 100 %) |
| Saison | Benjamins · Nour Garcia (cas de secours) | | 1 | 0 | 0 | 1 | 1/2 = 50 % |
| Ce mois (01/11 → 27/11) | Synthèse | 9 | 11 | 0 | 2 | 4 | 11/15 = 73 % |
| Ce mois | Poussins | 4 | 7 | 0 | 2 | 3 | 7/10 = 70 % |
| Ce mois | Benjamins | 4 | 3 | 0 | 0 | 1 | 3/4 = 75 % |
| 01/03 → 31/03/2026 | Synthèse (Anciens, archivé) | 1 | 1 | 0 | 0 | 1 | 1/2 = 50 % |
