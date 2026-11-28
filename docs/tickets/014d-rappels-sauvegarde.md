# 014d — Invitation et bandeau de sauvegarde

Statut : fait (PR #63 vers `main` ; PR #49, 2026-11-27 ; invitation et bandeau pas encore vus sur l'A55) · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : 014, 014b, 013 · Fichiers touchés : `src/app/invitation-sauvegarde.tsx` (nouveau), `src/hooks/useBackupReminder.ts` (nouveau), `src/hooks/useSavedReturn.ts`, `src/app/(tabs)/index.tsx`, `src/data/sessionsRepo.ts` (`firstRecordedDate`), `src/config/libelles/accueil.ts`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Inviter à sauvegarder après le premier appel, et rappeler après 30 jours sans sauvegarde (EX-21).

## À lire

- Maquettes : Invitation à sauvegarder, Accueil

## Ce qui change

- Invitation unique après le premier appel enregistré ; bandeau sur l'accueil

## Critères d'acceptation

- [x] Invitation après le premier appel, une seule fois, s'il n'y a aucune sauvegarde (EX-21)
- [x] Bandeau après 30 jours sans sauvegarde, jamais pendant Bienvenue (EX-21)

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Rien de plus que les critères

## Questions prévues

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur : sans aucune sauvegarde, les 30 jours du bandeau comptent depuis la plus ancienne séance enregistrée (nouvelle requête `firstRecordedDate`) ; texte de la maquette (« Pas de sauvegarde depuis N jours ») ; aucun réglage nouveau.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Qu'est-ce que le « premier appel » ? | nombre de séances enregistrées ; tout enregistrement par `appel.tsx` sans invitation vue ni sauvegarde | tout enregistrement réussi passé par `appel.tsx` et `useSavedReturn`, si `backup_invite_seen` n'est pas posé et qu'aucune date de sauvegarde n'existe | une seule fois grâce au réglage (pré-analyse) ; une base restaurée a une date de sauvegarde (`backup.ts` écrit `last_backup_at` dans la copie) et ne voit donc pas l'invitation, ce qui est voulu (corrigé après revue) | à relire |
| Moment de l'invitation | tout de suite ; après « Appel enregistré » | « Appel enregistré » 1,2 s, puis l'invitation à la place du retour à l'Historique ; réglages lus pendant les 1,2 s, en course avec ce délai : lecture pas finie à 1,2 s = retour sans invitation cette fois-ci, code `BACKUP_INVITE_LOAD_SLOW` ; base pas encore ouverte = retour sans invitation | la confirmation de l'appel reste vue (maquette Appel) ; le retour n'attend jamais la lecture (revue). Course choisie plutôt que « naviguer puis ouvrir l'invitation » : l'écran d'appel est démonté par le retour, et une invitation ouverte plus tard sur un autre écran surprendrait | à relire (course : changée après revue) |
| Quand l'invitation est-elle « vue » ? | à l'affichage ; au choix d'un bouton | dès qu'elle s'affiche | une fermeture de l'appli sur l'invitation ne la remontre pas : « une seule fois » (EX-21) | à relire |
| Navigation de l'invitation | — | ouverte par-dessus l'Historique (retour à l'Historique, puis l'invitation au-dessus) ; « Plus tard » et le retour du système ramènent à l'Historique ; « Sauvegarder maintenant » remplace l'invitation par `/donnees`, dont le retour ramène à l'Historique ; pas de flèche de retour (maquette) | la pile donne ces retours sans toucher à `donnees.tsx` (modifié par 015b) | à relire |
| Échecs autour de l'invitation | — | réglages illisibles : pas d'invitation, retour à l'Historique, code `BACKUP_INVITE_LOAD_FAILED` ; « vue » non écrite : invitation affichée, code `BACKUP_INVITE_SAVE_FAILED` ; écran d'appel quitté pendant les 1,2 s : ni invitation ni retour ; invitation ouverte sans être due (lien profond, navigation restaurée) : l'écran revérifie au montage et va à l'Historique sans rien écrire | un appel enregistré n'est jamais bloqué ; ABS-04 : des codes seulement | à relire |
| Seuil et calcul du bandeau | — | `daysSince >= 30`, jour de `useLocalNow` ; sans sauvegarde, depuis la plus ancienne séance enregistrée (`sessionsRepo.firstRecordedDate`, réponse du porteur) ; date future : rien | EX-21 ; une horloge reculée ne doit pas afficher de nombre négatif | à relire |
| Place et forme du bandeau | — | en bas de l'accueil, `Card warning`, « Sauvegarder maintenant » en bouton secondaire (`btn-s` de la maquette) vers `/donnees` ; pas de bouton pour le fermer ; jamais pendant Bienvenue ; aussi avec un appel en cours ; rien tant que la date n'est pas lue ; lecture impossible : bandeau caché, code `BACKUP_BANNER_LOAD_FAILED`, rien d'autre de masqué sur l'accueil ; date mal formée : pas de bandeau | maquette Accueil ; pas d'élément absent de la maquette ; un rappel illisible ne doit pas masquer l'erreur d'une autre action de l'accueil | à relire (lecture impossible : changée après revue, avant : message `loadFailed`) |
| Tests existants qui enregistrent un appel (`rollCall`, `draft`, `freeRollCall`) | les laisser voir l'invitation ; poser `backup_invite_seen` dans leur préparation | poser `backup_invite_seen` | ils vérifient le retour à l'Historique, toujours valable après l'invitation vue ; l'invitation est testée dans `backupReminder.test.tsx` | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Rappels de sauvegarde (EX-21) : invitation unique après le premier appel enregistré, et bandeau sur l'accueil après 30 jours sans sauvegarde (depuis la plus ancienne séance s'il n'y en a jamais eu).
- Architecture : écran `src/app/invitation-sauvegarde.tsx` (ouvert par `useSavedReturn` par-dessus l'Historique) ; `src/hooks/useBackupReminder.ts` (`needsBackupInvite`, `useBackupBanner`) ; requête `sessionsRepo.firstRecordedDate`. Aucun réglage nouveau : `backup_invite_seen` et `last_backup_at` existaient (ABS-08 : rien à déclarer).
