# 014e — Écran Restauration

Statut : fait (PR #63 vers `main` ; PR #46, relu et accepté par le porteur le 2026-11-27 ; recette sur l'A55 : export, désinstallation, restauration identique) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

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
| Contrôle statique | Liste du 014b ; liste élargie | expo-document-picker réservé à `expoFiles.ts`, sous-chemins refusés partout ; après revue, aussi refusés : la table des modules natifs `expo.modules` (point, crochets, déstructuration ; `globalThis.expo`, `global.expo`) partout, et les noms `ExpoDocumentPicker`, `FileSystem`, `ExpoSharing` (chaîne ou identifiant) hors de l'adaptateur ; après la seconde revue de sécurité, toute lecture de `globalThis.expo` ou `global.expo` (point, crochets, déstructuration) hors de l'adaptateur. Détecteurs dans `src/__fixtures__/expoAccess.ts` (le contrôle reste sous 300 lignes) | Plan validé ; ABS-01 ; revues du 014e | changée après revue |
| Dossiers dédiés | Un dossier ; deux | `expoStorage(nom)` : `cache/sauvegardes/` (export) et `cache/restauration/` (copie vérifiée, `restauration.db` dans un sous-dossier neuf `<horodatage>-<n>`), jamais vidés l'un par l'autre (test) | Plan validé | à relire |
| Copie du sélecteur sur Android | Confiance ; contrôlée | `copyToCacheDirectory: true` (l'URI d'origine est un `content://`) ; copie acceptée seulement si enfant direct de `cache/DocumentPicker/`, sinon ce dossier est vidé, puis l'erreur « Chemin de fichier refusé » (sans le chemin) ; taille annoncée au-delà de `MAX_BACKUP_BYTES` : refus `TOO_LARGE` tout de suite (journal `RESTORE_REJECTED_TOO_LARGE`), copie effacée, et si cet effacement échoue, dossiers du sélecteur vidés | « Toute entrée est validée » ; ABS-04 ; revue du 014e | changée après revue |
| Copie du sélecteur sur iOS | Garder `copyToCacheDirectory: true` et vider aussi l'Inbox ; `copyToCacheDirectory: false` et prendre la copie de l'Inbox | `copyToCacheDirectory: false` : le sélecteur (`asCopy: true`) dépose déjà sa copie dans `tmp/com.jitavision.kila-Inbox/`. Elle est acceptée seulement si elle est un enfant direct de ce dossier (déduit de `Library/Caches`, forme `/private/var` admise), puis effacée comme la copie du sélecteur. `clearPicked` vide l'Inbox et `cache/DocumentPicker/`. Le nom de l'Inbox est testé contre `app.json` | Option la plus sûre : une seule copie à suivre au lieu de deux. Une erreur de chemin échoue en refusant (fichier refusé, Inbox vidée) au lieu de laisser une copie en silence. Jamais essayée sur un iPhone | à relire |
| Lecture de l'appel en cours (EX-14) | Liste blanche pour `useRestore.ts` ; fonction étroite ; retirer la ligne | Module dédié `src/data/draftGroupName.ts` : une requête étroite qui ne rend que le nom du groupe (ou `null`). Ce fichier entre dans la liste EX-14 des tables du brouillon ; `useRestore.ts` n'est dans aucune liste. Titre du test corrigé (« importent le dépôt ou le hook du brouillon ») et précision « par son dépôt ou son hook » remise. Tests propres : seul `src/hooks/useRestore.ts` importe `draftGroupName` ; le fichier n'exporte que `draftGroupName` et `DraftGroup` | Réponse du porteur | répondue par le porteur (2026-11-27) |
| Écran pendant la vérification | Texte d'attente ; rien | « Vérification du fichier… » (état `verifying`) ; maquette annotée | Réponse du porteur | répondue par le porteur (2026-11-27) |
| Découpage du ticket | Découper ; garder | Gardé entier | Réponse du porteur | répondue par le porteur (2026-11-27) |
| Titre sans date dans le fichier | « Sauvegarde » ; « Sauvegarde sans date » | « Sauvegarde » | Le plus court ; la maquette ne prévoit que « Sauvegarde du JJ/MM/AAAA » | à relire |
| Appel en cours sans groupe | Ligne omise ; ligne sans nom | « L'appel en cours sera aussi remplacé. » | L'appel est bien remplacé ; le porteur veut qu'on le dise | à relire |
| Échec du sélecteur, de la lecture ou de la restauration | Message seul ; comme un refus | Même présentation qu'un refus : « La restauration n'a pas abouti », « Rien n'a été modifié. Choisissez un autre fichier. », bouton « Choisir un fichier… » | Réponse du porteur : chacun des quatre messages est suivi de cette phrase ; la restauration est une seule transaction | à relire |
| Quitter l'écran pendant la restauration | Bouton caché seul ; tout bloquer | Bouton retour caché, Annuler et « Remplacer mes données » désactivés, retour du système et geste bloqués (`usePreventRemove` d'expo-router). Un échec s'affiche donc toujours. Après une réussite, le blocage est levé avant d'aller à l'accueil | Revue : le retour du système fermait l'écran et un échec passait inaperçu | changée après contradiction |
| Verrou | Un par opération ; commun | Verrou commun `src/hooks/fileLock.ts` à l'export et à la restauration (même alias d'attache, même cache) : une seule opération à la fois ; une opération ne rend jamais le verrou de l'autre (test unitaire). Exporter et « Choisir un fichier… » sont désactivés pendant l'autre opération. Un second écran Restauration pendant une opération revient en arrière | Revue du 014e | changée après revue |
| Affichage d'un refus ou d'un échec | Tout de suite ; après le nettoyage | Après l'effacement des copies et le verrou rendu : « Choisir un fichier… » repart aussitôt | Revue : un appui rapide était ignoré | changée après revue |
| Garde du double appui | Verrou du module seul ; ref en plus | Ref par écran, vérifiée avant le verrou : un second appui sur le même écran ne déclenche pas le retour | Revue de mutation : sans la ref, un double appui renvoyait à Sauvegarde | à relire |
| Journal | — | `RESTORE_PICKED`, `RESTORE_PICK_FAILED`, `RESTORE_CANCELLED` (sélecteur annulé, Annuler, retour, fermeture), `RESTORE_CLEANUP_FAILED`, `RESTORE_UNEXPECTED` (toute erreur avant ou pendant la restauration : `newDir`, lecture de l'appel en cours, restauration), `RESTORE_PICK_PATH_REFUSED` (copie du sélecteur à un endroit inattendu, distinct de `RESTORE_PICK_FAILED`), `RESTORE_REJECTED_TOO_LARGE` (taille annoncée par le sélecteur) ; ceux du 014 (`RESTORE_VERIFIED`, `RESTORE_REJECTED_*`, `RESTORE_DONE`, `RESTORE_FAILED`) ; codes seuls | ABS-04, SEC-12 ; revue du 014e | changée après revue |
| Textes | `'` de la maquette ; `’` | `’` comme tous les libellés ; « 1 séance », « 0 membre » (`plural`) ; date « JJ/MM/AAAA » ; nombres en IBM Plex Mono | Typographie du projet (décision du 014b) ; maquette (`l-sous mono`) | à relire |
| Fichiers au-delà de la liste | Découper ; garder | Gardés (ticket gardé entier par le porteur) : `src/data/draftGroupName.ts`, `src/hooks/fileLock.ts` et son test, `src/hooks/useBackupExport.ts` (verrou commun), `src/__fixtures__/expoAccess.ts` (détecteurs du contrôle statique), `src/staticChecks.test.ts` (liste EX-14, à 300 lignes), `src/data/expoFiles.test.ts` et `src/appTests/backupExportDevice.test.tsx` (imitation du sélecteur), fixtures `backupFiles.ts`, `expoModules.ts` (disposition iOS, Inbox), `restoreFiles.ts` ; tests `draftGroupName.test.ts`, `expoFilesRestore.test.ts`, `expoFilesIos.test.ts`, `useRestore.test.tsx`, `useRestoreGuards.test.tsx`, `restore.test.tsx`, `restoreDevice.test.tsx` ; `design/maquettes/index.html` régénéré ; `jest.setup.js` non touché | Ajouts mécaniques et tests | à relire |

## Questions pour le porteur

Répondues par le porteur le 2026-11-27 : EX-14 par un module dédié (`draftGroupName.ts`), « Vérification du fichier… » pendant la vérification, ticket gardé entier.

Aucune autre.

## À reporter

- CHANGELOG : Écran Restauration : choix d'un fichier par le sélecteur du système, vérification sur une copie à part (« Vérification du fichier… »), résumé (date, membres, groupes, séances) et appel en cours remplacé annoncés, confirmation « Remplacer mes données », puis accueil ; quatre messages de refus clairs, rien n'est modifié ; l'écran ne se quitte pas pendant la restauration ; export et restauration jamais en même temps ; copies temporaires effacées dans tous les cas, sur Android et sur iOS (EX-20, NF-04, SEC-10 ; ticket 014e).
- Architecture (§4.3 et couches) :
  - `src/data/expoFiles.ts` importe aussi expo-document-picker (seul fichier autorisé) : `expoPicker(os)` (Android : copie dans `cache/DocumentPicker/` ; iOS : copie de l'Inbox `tmp/<identifiant>-Inbox/`, sans seconde copie ; chemins et taille annoncée contrôlés), fabrique `expoStorage('sauvegardes' | 'restauration')`, `expoRestoreDeps` ;
  - `src/data/draftGroupName.ts` : nom du groupe de l'appel en cours, seule lecture du brouillon par la restauration (EX-14) ;
  - `src/hooks/fileLock.ts` : verrou commun à l'export et à la restauration ;
  - `src/hooks/useRestore.ts` : dossiers vidés au montage sauf pendant une opération, sélecteur, `verifyBackup` (jour local), copie du sélecteur effacée juste après, confirmation par une promesse (« non » par Annuler, le retour ou la fermeture), `restoreBackup`, sous-dossier de la copie vérifiée effacé dans un `finally`, refus ou échec affiché après le nettoyage, `notifyDataChanged` puis accueil si l'écran est ouvert ;
  - écran `src/app/restauration.tsx` (retour bloqué par `usePreventRemove` pendant la restauration) ; section « Restaurer » de `src/app/donnees.tsx`.
- SECURITE.md, SEC-01 (vérification) : compléter la ligne du 014b : « expo-file-system, expo-sharing et expo-document-picker importés par `src/data/expoFiles.ts` seul ; tout sous-chemin de ces modules refusé partout ; la table des modules natifs `expo.modules` refusée partout ; la lecture de `globalThis.expo` ou `global.expo` et les noms `ExpoDocumentPicker`, `FileSystem`, `ExpoSharing` refusés hors de l'adaptateur (ticket 014e) ».
- SECURITE.md, SEC-10 : la copie du sélecteur (`cache/DocumentPicker/` sur Android, `tmp/<identifiant>-Inbox/` sur iOS) et la copie vérifiée (`cache/restauration/<sous-dossier>/`, avec `-wal`, `-shm`, `-journal`) sont effacées dans tous les cas : refus, Annuler, retour, fermeture de l'écran, échec, réussite (tests `src/hooks/useRestore.test.tsx`, `useRestoreGuards.test.tsx`).
- Pour 014c : au démarrage de l'appli (layout racine), vider `cache/restauration/`, `cache/DocumentPicker/` et, sur iOS, `tmp/com.jitavision.kila-Inbox/` (arrêt brutal pendant une restauration), en plus de `cache/sauvegardes/` ; jamais pendant une opération en cours (`fileLock`). `expoPicker(Platform.OS).clearPicked()` et `expoStorage(…).clear()` le font déjà.
- Pour le futur import CSV : il partagera `cache/DocumentPicker/` (et l'Inbox d'iOS). Il devra prendre le verrou commun `fileLock` ou avoir son propre sous-dossier, sinon le vidage au montage de l'un effacerait la copie de l'autre.
- CONFORMITE et ABS-08 : aucune donnée nouvelle ; le fichier est choisi par l'encadrant et lu sur l'appareil ; aucune permission ajoutée (le sélecteur du système passe par `OPEN_DOCUMENT`) : politique et déclarations inchangées, à confirmer à l'intégration. Registre des licences : expo-document-picker 58.0.5 (MIT).
- À vérifier sur l'A55 : export, Tout effacer ou désinstallation, restauration identique (NF-04) ; choix depuis Drive et depuis Téléchargements ; retour du système sans effet pendant la restauration.
- À vérifier sur un iPhone :
  - le chemin réel rendu par le sélecteur avec `copyToCacheDirectory: false` (attendu : `<conteneur>/tmp/com.jitavision.kila-Inbox/<nom>`), et sa forme `/private/var` ou `/var` ;
  - que le préfixe du cache (`Paths.cache`, expo-file-system) et celui du conteneur vu par expo-modules-core sont bien les mêmes (sinon tout fichier choisi est refusé : « La restauration n'a pas abouti ») ;
  - que l'Inbox est vide après une restauration, un refus et une annulation ;
  - le geste de retour bloqué pendant la restauration ;
  - **avant toute publication iOS** : une restauration réelle, puis `tmp/` vide (après un refus, une annulation et une réussite).
- Limites : sur Android, le sélecteur copie le fichier entier avant que l'adaptateur ne voie sa taille (un très gros fichier est copié, puis refusé et effacé) ; `ATTACH` et `restoreBackup` jamais essayés sur expo-sqlite natif.
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
