# 014e — Écran Restauration

Statut : en attente du porteur (une question, ci-dessous ; code poussé sur `ticket/014e-restauration`) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

Dépend de : 014, 014b · Fichiers touchés : `src/data/expoFiles.ts`, `src/staticChecksFiles.test.ts`, `scripts/maquettes.mjs`, `package.json`, `package-lock.json`, `src/config/licences.json`, `src/hooks/useRestore.ts` (nouveau), `src/app/restauration.tsx` (nouveau), `src/app/donnees.tsx`, libellés, `jest.setup.js`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014b.

## Contexte

La restauration d'une sauvegarde (EX-20, NF-04) sur le code de données du 014 et l'accès aux fichiers du 014b.

## À lire

- Maquettes : Sauvegarde et données, Restauration
- `docs/SECURITE.md` SEC-10 ; fiche 014 « À reporter » (contrat de l'appelant)

## Ce qui change

- Dépendance **expo-document-picker 58.0.5** (MIT), sans plugin ; sélecteur `copyToCacheDirectory: true`, type `*/*`
- `useRestore` : choix, `verifyBackup` (avec `today` local), confirmation, `restoreBackup` ; copie et fichiers `-wal`, `-shm`, `-journal` effacés dans un `finally` qui couvre aussi Annuler et la fermeture de l'écran
- Écran « Restaurer ? » : résumé, confirmation, puis accueil

## Critères d'acceptation

- [ ] Fichier vérifié, résumé, confirmation ; fichier invalide = message clair, données intactes (EX-20)
- [ ] Quatre messages de refus (ci-dessous), chacun suivi de « Rien n'a été modifié. Choisissez un autre fichier. »
- [ ] La confirmation dit « L'appel en cours (<groupe>) sera aussi remplacé. » s'il y en a un
- [ ] Copies temporaires supprimées dans tous les cas ; APK sans INTERNET

## Tests attendus

- Tests d'écran (version 0 refusée, fichier texte ou tronqué, résumé, Annuler efface la copie) ; à la main sur l'A55 : export, Tout effacer ou désinstaller, restauration identique (NF-04)

- Le choix du fichier passe par `src/data/expoFiles.ts` (seul fichier autorisé à importer expo-file-system et expo-sharing, contrôle `src/staticChecksFiles.test.ts`) ou élargit sa liste ; `openExpoCopy` (014b) ouvre la copie sur une connexion neuve

## Hors périmètre

- Base illisible (014c)

## Questions prévues

- Séance de lancement du lot 014b-015c (2026-11-27), réponses du porteur :
  - messages : « Ce fichier n'est pas une sauvegarde Ki&La » (`NOT_SQLITE`, `NOT_A_BACKUP`, `TOO_LARGE`) ; « Cette sauvegarde est abîmée ou a été modifiée » (`DAMAGED`, `INVALID_DATA`) ; « Cette sauvegarde vient d'une version plus récente de l'appli : mettez l'appli à jour » (`NEWER_VERSION`) ; « La restauration n'a pas abouti » (`RESTORE_FAILED`) ; maquette à annoter ;
  - la confirmation nomme l'appel en cours remplacé ; maquette à annoter.
- Séance de lancement du lot 014e (2026-11-27), réponses du porteur :
  - « Choisir un fichier… » ouvre `/restauration`, qui lance le sélecteur ; sélecteur annulé = retour à Sauvegarde ; un refus s'affiche sur l'écran Restauration avec le message, « Rien n'a été modifié. Choisissez un autre fichier. » et un bouton « Choisir un fichier… » (écart de maquette à annoter) ;
  - ticket gardé entier (14 fichiers, dont tests et libellés) ;
  - plan validé : expo-document-picker importé dans `expoFiles.ts` seul (contrôle statique) ; copie du sélecteur (`cache/DocumentPicker/`) et copie vérifiée (dossier à part `cache/restauration/`) effacées dans tous les cas ; une restauration à la fois ; après réussite, `notifyDataChanged` puis accueil, sans message.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Version et réglage d'expo-document-picker | `npx expo install` ; version épinglée | `npm install --save-exact expo-document-picker@58.0.5` (MIT), sans plugin dans `app.json` ; `licences.json` régénéré par `scripts/licences.js` | Plan validé ; le module n'ajoute aucune permission Android, seulement une déclaration `<queries>` pour l'intention `OPEN_DOCUMENT` (visibilité des applis, pas une permission) | à relire |
| Contrôle statique | Liste du 014b ; liste élargie | expo-document-picker ajouté aux modules réservés à `expoFiles.ts` ; ses sous-chemins (`build/…`, `src/…`) refusés partout, adaptateur compris ; tests : import, `export * from`, `require`, `import()`, sous-chemin ; vérifié qu'un import ailleurs fait échouer le contrôle | Plan validé ; ABS-01 | à relire |
| Dossiers dédiés | Un dossier ; deux | `expoStorage(nom)` : `cache/sauvegardes/` (export) et `cache/restauration/` (copie vérifiée, `restauration.db` dans un sous-dossier neuf `<horodatage>-<n>`), jamais vidés l'un par l'autre (test) ; `removeDir` refuse un sous-dossier de l'autre dossier | Plan validé : un export ne doit pas effacer une restauration en cours, ni l'inverse | à relire |
| Copie du sélecteur | Confiance ; contrôlée | `pickBackupFile` refuse une copie hors de `cache/DocumentPicker/` (sous-dossier direct) ; `removePickedFile` n'efface qu'un fichier direct de ce dossier ; `clearPicked` vide ce dossier seul ; erreur « Chemin de fichier refusé », sans le chemin | « Toute entrée est validée » ; ABS-04 | à relire |
| Lecture de l'appel en cours | — | `draftsRepo(db).get()` après la vérification ; seul le nom du groupe est gardé (`draft: { groupName }`), jamais les statuts ; une lecture en échec donne « La restauration n'a pas abouti » | Décision du porteur (la confirmation nomme l'appel en cours) ; voir la question ci-dessous pour le contrôle EX-14 | en attente du porteur |
| Écran pendant le choix et la vérification | Texte d'attente ; rien | Rien sous le titre « Restaurer ? » (le sélecteur du système couvre l'écran ; la vérification est courte) | La maquette n'a pas d'état d'attente : rien n'est ajouté sans validation | à relire |
| Échec du sélecteur, de la lecture ou de la restauration | Message seul ; comme un refus | Même présentation qu'un refus : « La restauration n'a pas abouti », « Rien n'a été modifié. Choisissez un autre fichier. », bouton « Choisir un fichier… » | Réponse du porteur : chacun des quatre messages est suivi de cette phrase ; la restauration est une seule transaction, rien n'a changé | à relire |
| Bouton retour pendant la restauration | Actif ; caché | Caché pendant « restoring » ; Annuler et « Remplacer mes données » désactivés. Le retour du système ferme l'écran : la restauration se termine, sans navigation | « Les boutons sont désactivés pendant une opération » | à relire |
| Second écran Restauration pendant une restauration | Attendre ; repartir | Il ne vide rien, ne lance pas le sélecteur et revient en arrière | Verrou au niveau du module (plan validé) ; cas qui ne se produit pas par l'interface | à relire |
| Garde du double appui | Verrou du module seul ; ref en plus | Ref par écran (le sélecteur n'est lancé qu'une fois), vérifiée avant le verrou : un second appui sur le même écran ne déclenche pas le retour | Revue de mutation : sans la ref, un double appui renvoyait à Sauvegarde | à relire |
| Journal | — | `RESTORE_PICKED`, `RESTORE_PICK_FAILED`, `RESTORE_CANCELLED` (sélecteur annulé, Annuler, retour, fermeture), `RESTORE_CLEANUP_FAILED` ; ceux du 014 (`RESTORE_VERIFIED`, `RESTORE_REJECTED_*`, `RESTORE_DONE`, `RESTORE_FAILED`) ; un échec de `newDir` ou de la lecture de l'appel en cours n'a pas de code propre | ABS-04, SEC-12 ; plan validé | à relire |
| Bouton « Choisir un fichier… » de Sauvegarde | Toujours actif ; désactivé pendant un export | Désactivé pendant un export | Une opération sur les fichiers à la fois | à relire |
| Textes | `'` de la maquette ; `’` | `’` comme tous les libellés ; « 1 séance », « 0 membre » (`plural`) ; date « JJ/MM/AAAA » par `toDisplayDate` ; nombres en IBM Plex Mono | Typographie du projet (décision du 014b) ; maquette (`l-sous mono`) | à relire |
| Fichiers au-delà de la liste | Découper ; garder | Gardés : `src/staticChecks.test.ts` (liste EX-14, à 300 lignes), `src/data/expoFiles.test.ts` et `src/appTests/backupExportDevice.test.tsx` (imitation du sélecteur), `src/__fixtures__/backupFiles.ts` (`nodePicker`), `expoModules.ts` (`fakeDocumentPicker`, `File.delete`), `restoreFiles.ts` (nouveau) ; tests `src/data/expoFilesRestore.test.ts`, `src/hooks/useRestore.test.tsx`, `src/appTests/restore.test.tsx`, `restoreDevice.test.tsx` ; `design/maquettes/index.html` régénéré ; `jest.setup.js` non touché | Ajouts mécaniques et tests ; une session | à relire |

## Questions pour le porteur

1. **EX-14 : la restauration lit l'appel en cours (zone sensible, contrôle issu de la revue de sécurité du 011).** Pour écrire « L'appel en cours (<groupe>) sera aussi remplacé. », `src/hooks/useRestore.ts` lit le brouillon par `draftsRepo(db).get()` et ne garde que le nom du groupe. Le contrôle `src/staticChecks.test.ts` « seuls l'appel et l'accueil lisent le brouillon » a une liste blanche : il faut y ajouter `src/hooks/useRestore.ts`, comme le 012b l'a fait pour l'accueil.
   - **A (recommandé, appliqué)** : ajouter `useRestore.ts` à la liste blanche, avec sa raison en commentaire. La règle protège les statistiques, et la restauration n'en est pas une. Le contrôle reste entier pour tout autre fichier.
   - B : ajouter à `draftsRepo` une fonction étroite qui ne rend que le nom du groupe. Elle touche le dépôt du brouillon (ADR-006), et la liste blanche s'allonge quand même.
   - C : retirer la ligne de l'appel en cours. Cela contredit la réponse du porteur au lancement du lot.

## À reporter

- CHANGELOG : Écran Restauration : choix d'un fichier par le sélecteur du système, vérification sur une copie à part, résumé (date, membres, groupes, séances) et appel en cours remplacé annoncés, confirmation « Remplacer mes données », puis accueil ; quatre messages de refus clairs, rien n'est modifié ; copies temporaires effacées dans tous les cas (EX-20, NF-04, SEC-10 ; ticket 014e).
- Architecture (§4.3 et couches) : `src/data/expoFiles.ts` importe aussi expo-document-picker (seul fichier autorisé, contrôle `src/staticChecksFiles.test.ts`) : `pickBackupFile` (copie dans `cache/DocumentPicker/`, chemin contrôlé), `removePickedFile`, `clearPicked`, fabrique `expoStorage('sauvegardes' | 'restauration')` (dossiers dédiés séparés), `expoRestoreDeps` ; `src/hooks/useRestore.ts` : verrou au niveau du module (une restauration à la fois), dossiers vidés au montage sauf pendant une restauration, sélecteur, `verifyBackup` (jour local), copie du sélecteur effacée juste après, confirmation par une promesse (« non » par Annuler, le retour ou la fermeture), `restoreBackup`, sous-dossier de la copie vérifiée effacé dans un `finally`, `notifyDataChanged` puis accueil si l'écran est ouvert (accès passés en paramètre : node:fs et node:sqlite dans les tests) ; écran `src/app/restauration.tsx` ; section « Restaurer » de `src/app/donnees.tsx`.
- SECURITE.md, SEC-01 (vérification) : compléter la ligne du 014b : « expo-file-system, expo-sharing et expo-document-picker importés par `src/data/expoFiles.ts` seul ; tout sous-chemin de ces modules refusé partout (ticket 014e) ».
- SECURITE.md, SEC-10 : la copie choisie (`cache/DocumentPicker/`) et la copie vérifiée (`cache/restauration/<sous-dossier>/`, avec `-wal`, `-shm`, `-journal`) sont effacées dans tous les cas : refus, Annuler, retour, fermeture de l'écran, échec, réussite (tests `src/hooks/useRestore.test.tsx`).
- Pour 014c : au démarrage de l'appli (layout racine), vider aussi `cache/restauration/` et `cache/DocumentPicker/` (arrêt brutal pendant une restauration), en plus de `cache/sauvegardes/` ; jamais pendant une restauration en cours (verrou de `useRestore`).
- CONFORMITE et ABS-08 : aucune donnée nouvelle ; le fichier est choisi par l'encadrant et lu sur l'appareil ; aucune permission ajoutée (le sélecteur du système passe par `OPEN_DOCUMENT`) : politique et déclarations inchangées, à confirmer à l'intégration. Registre des licences : expo-document-picker 58.0.5 (MIT).
- Limites et à vérifier sur appareil :
  - le sélecteur copie le fichier entier dans le cache avant le contrôle de taille (un très gros fichier est copié, puis refusé `TOO_LARGE` et effacé) ;
  - sur l'A55 : export, Tout effacer ou désinstallation, restauration identique (NF-04) ; choix depuis Drive et depuis Téléchargements ; APK sans INTERNET ;
  - sur un iPhone : le sélecteur peut laisser sa propre copie dans `tmp/` (hors de `Caches/DocumentPicker/`) ;
  - `ATTACH` et `restoreBackup` jamais essayés sur expo-sqlite natif.
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
