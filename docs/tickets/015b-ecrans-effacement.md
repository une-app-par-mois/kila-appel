# 015b — Conservation et purge des anciennes saisons

Statut : à faire · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

Dépend de : 015, 014, 014b, 014e · Fichiers touchés : `src/data/purge.ts` et son test, `src/hooks/useErase.ts` (conservation et purge), `src/hooks/fileLock.ts` (tâche `'erase'`), `src/app/donnees.tsx`, `src/app/(tabs)/parametres.tsx`, `src/config/libelles/effacement.ts` (et `index.ts`), `scripts/maquettes.mjs`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 015, puis en 015b (conservation et purge) et 015f (Tout effacer) le même jour.

## Contexte

La conservation et la purge des anciennes saisons (EX-24). Tout effacer est au 015f.

## À lire

- Maquettes : Sauvegarde et données, Tout effacer, Purge des anciennes saisons

## Ce qui change

- `purgeCandidates` ne compte parmi les N saisons gardées que les saisons **commencées** (date de début ≤ aujourd'hui) ; une saison à venir est toujours gardée en plus (décision du porteur du 2026-11-27) ; `purge` reçoit la même date
- Réglage de conservation (dans `settings`, par `settingsRepo`), sans purge automatique ; candidates listées ; confirmation chiffrée de la purge ; purge sous le verrou commun ; ligne Conservation de Paramètres

## Critères d'acceptation

- [ ] Conservation de 1 à 3 saisons, 3 par défaut (EX-24)
- [ ] Confirmation de la purge qui liste ce qui part, membres compris (EX-24)
- [ ] Une saison à venir n'est jamais purgée et ne compte pas parmi les N ; une saison commencée aujourd'hui compte ; purge refusée (rien effacé) si la date change la liste

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Tout effacer (015f)

## Questions prévues

Séance du 2026-11-27 : conservation de 1 à 3 saisons. Clôture du 2026-11-27 : seules les saisons commencées comptent parmi les gardées.

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur :
  - découpage en 015b et 015f ;
  - confirmation de la purge chiffrée par `purgeImpact` : « Seront effacés définitivement : la saison 2023-2024, ses 3 groupes, 2 créneaux, 31 séances et 412 présences. » puis « 12 membres qui ne figurent plus dans aucune saison conservée seront aussi effacés. », plus « L'appel en cours (<groupe>) sera aussi effacé. » s'il appartient à une saison purgée ; maquette annotée ;
  - plan validé.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
