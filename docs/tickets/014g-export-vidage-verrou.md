# 014g — Vidage du dossier d'export sous le verrou commun

Statut : en revue · Jalon : 1 · Zone sensible : oui · Trivial : non

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

- Séance de lancement du lot 014f-015f-014g (2026-11-27), réponses du porteur : plan validé — plus de vidage au montage de l'écran ; vidage au début de chaque export, sous le verrou `'export'` ; échec journalisé (`BACKUP_CLEAR_FAILED`) sans empêcher l'export ; règle ajoutée à SEC-10 (à l'intégration) ; tests : vidage sous verrou, rien au montage, rien pendant une restauration, une purge ou un nettoyage, copie en cours de partage jamais effacée. Fusionné en premier.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Tests de vidage sous le verrou : où les écrire ? | Dans `useBackupExport.test.tsx` ; fichier voisin | Fichier voisin `src/hooks/useBackupExportClear.test.tsx` ; les deux tests du montage de `useBackupExport.test.tsx` réécrits pour la nouvelle règle | Plafond de 300 lignes, un fichier par sujet | à relire |
| Tests d'écran qui supposaient le vidage à l'ouverture (`src/appTests/backupExport.test.tsx`, `src/appTests/restoreDevice.test.tsx`) | Les supprimer ; les adapter | Adaptés : « vidé au début de l'export, pas à l'ouverture » (fichier ancien gardé à l'ouverture, effacé après l'export) ; dans `restoreDevice`, l'attente du vidage à l'ouverture retirée, la fin du test vérifie toujours que la restauration ne touche pas `cache/sauvegardes/` | Ils encodaient l'ancien comportement que le ticket supprime ; fichiers de test hors de la liste nominative (« tests » y figure) | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : « Sauvegarde : le dossier d'export est vidé au début de chaque export, sous le verrou commun, et plus à l'ouverture de l'écran (SEC-10, ticket 014g). »
- Architecture : ligne 183 de `docs/ARCHITECTURE.md` (ticket 014b), remplacer « vidé à chaque ouverture de l'écran » par « vidé au début de chaque export, sous le verrou commun (`'export'`), jamais à l'ouverture de l'écran (ticket 014g) ».
- SEC-10 (`docs/SECURITE.md`), après « jamais au montage de l'écran ; » : « l'export vide `cache/sauvegardes/` sous le verrou commun (`'export'`), au début de chaque export, jamais au montage (ticket 014g) ; » ; colonne Vérification : ajouter `src/hooks/useBackupExportClear.test.tsx` (vidage sous le verrou, avant le sous-dossier, rien au montage ni pendant `'restore'`, `'erase'`, `'cleanup'`, échec journalisé).
