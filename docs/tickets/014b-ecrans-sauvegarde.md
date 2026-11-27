# 014b — Écran Sauvegarde : export

Statut : développé sur `ticket/014b-export`, à relire (revue, revue de sécurité, porteur) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

Dépend de : 014, 013 · Fichiers touchés : `package.json`, `package-lock.json`, `src/config/licences.json`, `src/data/expoFiles.ts` (nouveau), `src/data/expoDb.ts`, `src/hooks/useBackupExport.ts` (nouveau), `src/app/donnees.tsx` (nouveau), `src/app/(tabs)/parametres.tsx`, libellés, `src/staticChecks.test.ts`, `jest.setup.js`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014, puis en 014b (export) et 014e (restauration) le même jour.

## Contexte

L'écran de la sauvegarde (EX-19) sur le code de données du 014. La restauration est au 014e.

## À lire

- Maquettes : Sauvegarde et données, Paramètres
- `docs/SECURITE.md` SEC-09 ; ABS-01, ABS-06, ABS-07
- Fiche 014, section « À reporter » : contrat de l'appelant (chemins sans `file://`, ouverture brute de la copie, copie temporaire effacée dans un `finally`, dossier cache, nom unique, `today`, `SAME_PATH`)

## Ce qui change

- Dépendances **expo-file-system 58.0.14** et **expo-sharing 58.0.23** (MIT, versions du SDK 58), épinglées, sans plugin dans `app.json` ; `licences.json` régénéré
- `src/data/expoFiles.ts` : seul fichier qui importe expo-file-system (`BackupFiles`, sous-dossier dédié du cache, conversion d'URI en chemin, nettoyage) ; `expoDb.ts` : ouverture brute d'une copie par son chemin (sans `prepareDatabase` ni migrations)
- `useBackupExport` : chemin neuf, `exportBackup`, `verifyBackup` sur le fichier produit, partage, date notée, copie effacée dans un `finally`
- Écran « Sauvegarde » (`/donnees`) : avertissement SEC-09 complet au-dessus du bouton, dernière sauvegarde ; ligne « Sauvegarde et restauration » dans Paramètres

## Critères d'acceptation

- [ ] Export d'un fichier `.db` avec l'avertissement complet avant (EX-19, SEC-09, ABS-06)
- [ ] La copie exportée est effacée dès que le partage se termine (succès ou échec) ; le dossier dédié est vidé à chaque ouverture de l'écran
- [ ] Date de dernière sauvegarde notée quand le partage se termine sans erreur, affichée tout de suite
- [ ] expo-file-system importé dans le seul `expoFiles.ts`, `expo-file-system/legacy` et ses fonctions réseau refusés par le contrôle statique ; APK sans INTERNET (audit)

## Tests attendus

- Tests d'écran (avertissement au caractère près, date notée après le partage seulement, échec sans date, copie effacée dans tous les cas) ; conversion d'URI ; contrôles statiques ; audit de l'APK ; à la main sur l'A55 : export vers Drive et Gmail

## Hors périmètre

- Restauration (014e), base illisible (014c), rappels (014d), Conservation et Tout effacer (015b)

## Questions prévues

- Séance du 2026-11-27 (lot 013-014-015) : expo-file-system accepté, avec ses fonctions réseau verrouillées (ABS-01, contrôle statique et audit de l'APK) ; un seul bouton d'export, par le partage du système.
- Séance de lancement du lot 014b-015c (2026-11-27), réponses du porteur :
  - découpage en 014b (export) et 014e (restauration) ;
  - copie exportée effacée dès la fin du partage, dossier dédié vidé à chaque ouverture de l'écran ; si l'envoi vers Drive ou Gmail échoue sur l'A55 parce que le fichier a disparu, reposer la question (option suivante : effacée à la prochaine ouverture de l'écran) ;
  - un partage annulé ne se détecte pas : la date est comptée quand la feuille se ferme sans erreur et affichée aussitôt (« Dernière sauvegarde : aujourd'hui ») ; limite notée ;
  - plan validé.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Versions des dépendances | Celles de `npx expo install` (58.0.15, 58.0.24, plugin `expo-sharing` ajouté à `app.json`) ; celles acceptées | 58.0.14 et 58.0.23 épinglées (versions du SDK dans `bundledNativeModules.json`), plugin retiré de `app.json` | Versions acceptées par le porteur ; aucun plugin (consigne) ; le module de partage d'Android sert le cache (`cache-path`) sans réglage | à relire |
| Chemin neuf à chaque export, nom lisible | Date et heure dans le nom ; sous-dossier neuf | Sous-dossier neuf `cache/sauvegardes/<horodatage>-<n>/` qui contient `kila-sauvegarde-AAAA-MM-JJ.db` et la copie de vérification ; le sous-dossier entier est effacé dans le `finally` (copie, `-wal`, `-shm`, `-journal`) | Nom d'ARCHITECTURE §4.3 gardé pour le destinataire ; contrat du 014 (chemin neuf, nom unique, cache) | à relire |
| Vérifier le fichier produit | Non ; `verifyBackup` avant le partage | `verifyBackup` sur une seconde copie ; refus = échec, rien n'est partagé ni noté | Prévu par la fiche : on ne partage pas une sauvegarde qui ne se restaurerait pas | à relire |
| Vidage du dossier dédié à l'ouverture | Sans attente ; l'export attend la fin du vidage | L'export attend le vidage lancé à l'ouverture | Un vidage tardif effacerait la copie en cours de partage | à relire |
| Type de fichier partagé | `application/x-sqlite3` ; UTI `public.database` ; `application/octet-stream` | `application/octet-stream`, sans UTI ni titre de feuille | Sur iOS, un type connu ajoute son extension (« .db.sqlite ») ; type générique accepté par Drive et Gmail (à vérifier sur l'A55) | à relire |
| Contrôle statique (renforcé) | Liste de la consigne ; liste élargie | Liste de la consigne, plus `createDownloadTask`, `DownloadTask`, `upload` (méthode d'envoi de `File`), `getResolvedSharedPayloadsAsync` (expo-sharing : « peut demander le réseau ») ; `expo-file-system/next` refusé comme `legacy` ; expo-sharing aussi réservé à `expoFiles.ts` ; import, `export … from`, `require`, `import()`, `import('…')` de type couverts, aussi par `obj['…']` | ABS-01 : toutes les fonctions réseau de la version installée ; renforcement seul | à relire |
| Fichier du contrôle | `src/staticChecks.test.ts` ; nouveau fichier | `src/staticChecksFiles.test.ts` | `staticChecks.test.ts` a déjà 306 lignes (au-delà de 300 avant ce ticket) | à relire |
| Chemins | Confiance ; validés | Chemin absolu sans `file://`, `.`, `..` ni segment vide (`checkSystemPath`, `uriToPath`, `pathToUri`) ; `removeDir` n'efface qu'un sous-dossier direct du dossier dédié ; erreur « Chemin de fichier refusé », sans le chemin | « Toute entrée est validée » ; ABS-04 | à relire |
| Ouverture brute de la copie | Nouvel adaptateur ; dans `expoDb.ts` | `openExpoCopy(path)` dans `expoDb.ts` : `openDatabaseAsync(nom, undefined, dossier)`, `':memory:'` à part ; test de bout en bout `NOT_A_BACKUP` sur une version 0 | Contrat de l'appelant du 014 | à relire |
| Date affichée | Date ; jours écoulés | « aujourd'hui », « hier », « il y a N jours » ; date à venir (horloge changée) : « le JJ/MM/AAAA » ; aucune : « Aucune sauvegarde pour l'instant. » (écran) et « Aucune sauvegarde » (Paramètres) | Maquette (« il y a 34 jours ») ; cas absents de la maquette | à relire |
| Message d'échec | — | « La sauvegarde n'a pas pu être exportée. Réessayez. », sous le bouton | Absent de la maquette ; sans terme technique (CONV-15) | à relire |
| Double appui | — | Bouton désactivé pendant l'export et le partage, second appui ignoré | Un seul fichier à la fois | à relire |
| Apostrophe de l'avertissement | `'` de la maquette ; `’` des libellés | `’`, comme tous les libellés ; le reste au caractère près | Typographie du projet ; aucun mot changé | à relire |
| Contenu de l'écran et de Paramètres | Toutes les sections de la maquette ; celles qui existent | Écran : avertissement, bouton, dernière sauvegarde. Paramètres : section « Données » avec la seule ligne « Sauvegarde et restauration » | Restauration (014e), Conservation et Tout effacer (015b) à venir ; règle du ticket 012 : seules les lignes qui mènent à un écran existant | à relire |
| Journal | — | `BACKUP_SHARED`, `BACKUP_EXPORT_FAILED`, `BACKUP_CLEANUP_FAILED`, `BACKUP_CLEAR_FAILED`, `LAST_BACKUP_LOAD_FAILED`, sans détail | ABS-04, SEC-12 | à relire |
| Fichiers au-delà de la liste | Découper ; garder | Gardés : `src/config/libelles/donnees.ts` et `commun.ts`, `index.ts` ; `src/domain/formats.ts` (`daysSince`) et son test ; `src/staticChecksFiles.test.ts` ; `src/data/expoFiles.test.ts`, `expoDbCopy.test.ts` ; `src/__fixtures__/backupFiles.ts` (`nodeStorage`) ; `src/node.d.ts` ; `jest.setup.js` non touché | Ajouts mécaniques et tests ; une seule session | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Écran Sauvegarde : export d'une copie datée de la base par le partage du système, avertissement complet « fichier non protégé » avant l'export, date de la dernière sauvegarde notée à la fin du partage et affichée dans l'écran et dans Paramètres ; copie effacée dès la fin du partage (EX-19, EX-21, SEC-09, ABS-06 ; ticket 014b).
- Architecture (§4.3 et couches) : `src/data/expoFiles.ts`, seul fichier qui importe expo-file-system et expo-sharing (contrôle `src/staticChecksFiles.test.ts`, qui refuse aussi `expo-file-system/legacy` et `/next` et leurs fonctions réseau) : dossier dédié `cache/sauvegardes/`, un sous-dossier neuf par export effacé dès la fin du partage et vidé à chaque ouverture de l'écran, conversion URI ↔ chemin, partage en `application/octet-stream` ; `src/data/expoDb.ts` : `openExpoCopy(path)`, ouverture brute d'une copie sans migration, et `checkSystemPath` ; `src/hooks/useBackupExport.ts` : `exportBackup`, `verifyBackup` du fichier produit, partage, date notée quand la feuille se ferme sans erreur (accès aux fichiers et au partage passés en paramètre : node:fs et node:sqlite dans les tests) ; écran `src/app/donnees.tsx`.
- SECURITE.md, SEC-01 (vérification) : ajouter « expo-file-system et expo-sharing importés par `src/data/expoFiles.ts` seul ; `expo-file-system/legacy` et `/next`, `downloadFileAsync`, `downloadAsync`, `uploadAsync`, `upload`, `createDownloadResumable`, `createUploadTask`, `createDownloadTask`, `DownloadResumable`, `UploadTask`, `DownloadTask`, `getResolvedSharedPayloadsAsync` refusés (`src/staticChecksFiles.test.ts`, ticket 014b) ».
- CONFORMITE et ABS-08 : aucune donnée nouvelle ; le fichier ne quitte l'appareil que par le partage choisi par l'encadrant (déjà décrit par EX-19) : politique et déclarations inchangées, à confirmer à l'intégration.
- Limites : un partage annulé compte comme une sauvegarde (décision du porteur) ; `VACUUM INTO`, `ATTACH` et l'ouverture par dossier jamais essayés sur expo-sqlite natif ; export vers Drive et Gmail à essayer sur l'A55 (si le fichier a disparu avant l'envoi, reposer la question : effacement à la prochaine ouverture de l'écran).
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
