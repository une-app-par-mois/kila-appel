# 014e — Écran Restauration

Statut : à faire · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

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

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
