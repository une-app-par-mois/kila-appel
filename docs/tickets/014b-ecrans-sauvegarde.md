# 014b — Écran Sauvegarde : export

Statut : à faire · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

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

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
