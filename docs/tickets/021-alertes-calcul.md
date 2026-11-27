# 021 — Alertes d'assiduité : calcul et données

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (calcul affiché : séries d'absences et alertes, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/domain/absenceStreak.ts` et son test (nouveaux), `src/data/alertsRepo.ts` et son test (nouveaux), `src/data/settingsRepo.ts`, `src/data/settingsRepo.test.ts`, `src/hooks/useAlerts.ts` et son test (nouveaux) — 8 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

F-04 : un membre dont la série d'absences atteint le seuil apparaît sur l'accueil ; « Marquer comme traitée » la retire jusqu'à ce que la série s'allonge. Ce ticket pose le calcul (domaine pur), la lecture en base et le hook ; les écrans viennent au 022. La table `alert_acks` existe déjà (migration 1, ADR-003) : aucune migration.

## À lire

- `docs/PRD.md` : EX-25, EX-26, RM-02 ; `docs/CADRAGE.md` : glossaire (série d'absences, alerte d'assiduité, archiver), « Données manipulées »
- `docs/ARCHITECTURE.md` §4.1 (`alert_acks`, `sessions.state`, `attendances`), ADR-003, ADR-004
- `docs/CONVENTIONS.md` §5.2 (RM-02 avec bornes : série interrompue, que des excusés)
- `src/data/settingsRepo.ts` (`SETTING_KEYS`, `isValidSetting`, lu aussi par `src/data/backupRows.ts`), `src/data/sessionsRepo.ts`, `src/hooks/dataChanged.ts`, `src/hooks/useLoaded.ts`

## Ce qui change

- `src/domain/absenceStreak.ts` : `absenceStreak(statuses)` (RM-02 : statuts d'un membre dans l'ordre des séances enregistrées ; Absent allonge, Excusé est ignoré sans remettre à zéro, Présent ou Retard remet à zéro) ; `streakStart` (date de la première absence de la série en cours) ; `isAlertShown({ streak, start, threshold, acks })` (EX-25, EX-26).
- `src/data/alertsRepo.ts` : statuts des membres sur les séances `recorded` de la saison active, triées par date puis heure (requête paramétrée, agrégée en SQL pour NF-08) ; `acknowledge(memberId, streakLength, today)` dans `alert_acks` (`ON CONFLICT DO NOTHING`, jamais `INSERT OR REPLACE`) ; dernières séances d'un membre pour l'écran d'alerte (6 statuts, la plus récente d'abord).
- `src/data/settingsRepo.ts` : clé `alert_threshold` (de 2 à 10, 3 par défaut, valeur illisible = 3) dans `SETTING_KEYS` et `isValidSetting` (une sauvegarde qui la contient reste valide).
- `src/hooks/useAlerts.ts` : `useAlerts(today)` (liste des alertes, rechargée par `dataChanged`), `useAlert(memberId)`, `acknowledge`, `useAlertThreshold`.

### Plan à valider (zone sensible)

1. Seules les séances `recorded` de la **saison active** comptent, dans l'ordre (date, heure) ; une séance où le membre n'a pas de présence ne change rien à sa série.
2. Une alerte n'est montrée que pour un membre non archivé, inscrit aujourd'hui à un groupe non archivé de la saison active.
3. Groupe affiché sous le nom : celui de la séance la plus récente du membre.
4. Tri : série la plus longue d'abord, puis nom et prénom.
5. Alerte traitée : une ligne `alert_acks (membre, longueur)` masque l'alerte tant que la série ne dépasse pas cette longueur **et** que la date de traitement est postérieure ou égale à la première absence de la série en cours. Ainsi une série retombée à zéro puis revenue au seuil réapparaît, même si la même longueur avait été traitée avant.
6. Une correction ou une suppression d'appel passé (EX-18) recalcule la série au chargement suivant : rien n'est stocké d'autre que la longueur traitée.

## Critères d'acceptation

- [ ] RM-02 : A A E A → 3 ; A A P A → 1 ; E E E → 0 ; aucune séance → 0 ; R remet à zéro (tests du domaine, noms avec `RM-02`).
- [ ] EX-25 : un membre à 3 absences de suite (seuil par défaut) est dans la liste ; à 2, il n'y est pas ; seuil réglé à 5 : il n'y est plus.
- [ ] EX-26 : traitée à 3, l'alerte disparaît ; une 4e absence la fait réapparaître ; un Présent puis 3 nouvelles absences la font réapparaître aussi.
- [ ] Membre archivé, membre sans inscription courante, groupe archivé : aucune alerte (point 2 du plan).
- [ ] Séances `prepared`, `cancelled`, `unscheduled` ignorées (préparées pour F-13, déjà possibles dans le schéma).
- [ ] Supprimer le membre efface ses alertes traitées (cascade existante, SEC-11) : vérifié par un test.
- [ ] `alert_threshold` : valeurs 2 à 10 acceptées, toute autre refusée (`ALERT_THRESHOLD_INVALID`) ; une sauvegarde qui contient la clé passe `isValidSetting`.
- [ ] Requêtes paramétrées (SEC-05), test avec un nom contenant `'` et `;` ; aucun nom dans un journal (ABS-04).
- [ ] NF-08 : 500 membres, 3 saisons, liste des alertes calculée sans boucle de requêtes par membre (une requête, test sur le jeu de volume).

## Tests attendus

- `src/domain/absenceStreak.test.ts` : RM-02 et EX-26 avec bornes, vus en échec d'abord.
- `src/data/alertsRepo.test.ts` sur `node:sqlite` (ADR-008) : jeu fictif de `src/__fixtures__/seed.ts`, ordre des séances le même jour (heure), saison inactive ignorée, traitement, cascade.
- `src/data/settingsRepo.test.ts` : nouvelle clé ; `src/hooks/useAlerts.test.tsx` : rechargement après `notifyDataChanged`.

## Hors périmètre

- Écrans de l'accueil, de l'alerte et du réglage (022).
- Alertes dans les statistiques ou la frise (F-12, F-14).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Portée de la série (membre tous groupes confondus, comme le dit le glossaire, ou membre par groupe) : le glossaire dit « d'un membre » ; appliqué tel quel.
- `alert_acks` n'apparaît pas dans le tableau « Données manipulées » du cadrage (voir les questions du découpage).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Valeurs du seuil (maquette « 3 ▾ ») | 2 à 5 ; 2 à 10 | 2 à 10, 3 par défaut | Assez large pour un groupe qui se réunit deux fois par semaine ; 1 ferait une alerte à chaque absence | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Assiduité : calcul des séries d'absences et des alertes (F-04, EX-25, EX-26, RM-02).
- Architecture : `src/domain/absenceStreak.ts`, `src/data/alertsRepo.ts`, `src/hooks/useAlerts.ts` ; réglage `alert_threshold` (2 à 10, 3 par défaut).
