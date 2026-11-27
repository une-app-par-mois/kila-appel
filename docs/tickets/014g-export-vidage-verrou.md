# 014g — Vidage du dossier d'export sous le verrou commun

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014b, 014c, 014e · Fichiers touchés : `src/hooks/useBackupExport.ts`, `src/hooks/useBackupExport.test.tsx`, tests

Créé le 2026-11-27 à l'intégration du lot 014c-014d-015b, depuis la section « À reporter » du ticket 014c (revue de sécurité).

## Contexte

`useBackupExport` vide encore `cache/sauvegardes/` au montage de l'écran Sauvegarde sans prendre le verrou commun (`fileLock`) : il se contente de ne rien faire si le verrou est tenu par `'export'`. Le vidage peut donc tomber pendant le nettoyage au démarrage (`'cleanup'`), une restauration (`'restore'`) ou une purge (`'erase'`). Le 014c a aligné `useRestore` (vidage sous `'restore'`, au début de chaque restauration) ; l'export doit suivre la même règle (SEC-10).

## À lire

- Ticket 014c, décision « Vidage des dossiers par `useRestore` » et section « À reporter »
- `docs/SECURITE.md`, SEC-10 ; `src/hooks/fileLock.ts`, `src/hooks/useRestore.ts`

## Ce qui change

- Le vidage de `cache/sauvegardes/` se fait sous le verrou `'export'`, au début de chaque export (avant `newDir`), et plus au montage de l'écran, comme `useRestore`
- La promesse `clearing` et le vidage au montage disparaissent s'ils ne servent plus

## Critères d'acceptation

- [ ] Aucun vidage de `cache/sauvegardes/` hors du verrou commun ; plus de vidage au montage de l'écran Sauvegarde (SEC-10)
- [ ] Chaque export commence par vider le dossier, sous `'export'` ; un échec du vidage est journalisé (`BACKUP_CLEAR_FAILED`, sans détail, ABS-04) sans empêcher l'export
- [ ] Un écran Sauvegarde monté pendant une restauration, une purge ou le nettoyage au démarrage ne touche à aucun dossier

## Tests attendus

- Tests du hook : vidage appelé une fois par export, sous le verrou ; aucun vidage au montage ; montage pendant chaque autre tâche du verrou sans vidage ; échec du vidage journalisé, export poursuivi
- Tests existants de l'export (`useBackupExport.test.tsx`, `appTests/backupExportDevice.test.tsx`) toujours verts

## Hors périmètre

- Nettoyage au démarrage (014c), restauration (014e, 014f), Tout effacer (015f)

## Questions prévues

- Plan de zone sensible : à valider à la séance de lancement de son lot.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
