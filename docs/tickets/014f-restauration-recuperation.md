# 014f — Restaurer depuis l'écran de récupération

Statut : en cours (branche poussée, à intégrer) · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014c, 014e · Fichiers touchés : `src/hooks/restoreFlow.ts` (nouveau), `src/hooks/useRestore.ts`, `src/hooks/useRecovery.ts` (nouveau), `src/ui/Recovery.tsx`, résumé partagé avec `src/app/restauration.tsx`, libellés, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014c.

## Contexte

Depuis l'écran « Base illisible », restaurer une sauvegarde alors que la base de l'appareil ne s'ouvre pas (EX-22, EX-20).

## Ce qui change

- Le cycle de `useRestore` (choix, vérification, confirmation) est partagé ; `useRestore` garde `draftGroupName` (seul importateur, contrôle EX-14)
- Variante abîmée : bouton « Restaurer une sauvegarde » ; choix et vérification sur une copie (le fichier abîmé n'est pas touché) ; confirmation « Les données abîmées seront effacées définitivement. », sans ligne d'appel en cours ; puis suppression du fichier abîmé, base neuve, `restoreBackup` en une transaction, sous le verrou commun

## Critères d'acceptation

- [ ] Refus ou Annuler : le fichier abîmé est intact
- [ ] Réussite : données identiques à la sauvegarde, puis accueil
- [ ] Échec de la recopie après la suppression : base neuve vide ouverte, message « La restauration n'a pas abouti », « Choisir un fichier… » et moyen de continuer avec une base vide ; dit dans la PR et dans SEC-11

## Questions prévues

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur : restauration « vérifier d'abord, puis remplacer » (option recommandée) ; reprend les états de l'écran Restauration (maquette annotée par 014c).
- Séance de lancement du lot 014f-015f-014g (2026-11-27), réponses du porteur :
  - vérification, refus et confirmation sur l'écran de récupération, sans navigation : « Vérification du fichier… » ; refus = message 014e ; confirmation = carte de résumé de l'écran Restauration, avec « Les données abîmées seront effacées définitivement. », « Annuler » et « Remplacer mes données » ; une seule confirmation ; maquette annotée ;
  - échec de la recopie après la suppression : « La restauration n'a pas abouti. Les données abîmées ont été effacées. Choisissez un autre fichier, ou repartez de zéro. » ; « Choisir un fichier… » (principal) et « Repartir de zéro » (vers Bienvenue, sans confirmation, la base étant vide) ;
  - ticket gardé entier (environ 15 fichiers, tests compris) ;
  - plan validé : `replaceDamagedDatabase` dans `useDatabase` (abîmée seulement ; base neuve non publiée avant la fin de la recopie), cycle partagé `restoreFlow`, verrou tenu du choix du fichier à la fin de la recopie, après le nettoyage du démarrage ; refus ou Annuler ne touchent jamais au fichier abîmé ; retour Android bloqué pendant la suppression et la recopie ; « Restaurer une sauvegarde » en bouton principal, au-dessus de « Réessayer » ; recette sur l'A55 indispensable.
- Report de l'intégration du lot 014c-014d-015b (2026-11-27), depuis le 014c :
  - la variante abîmée de `src/ui/Recovery.tsx` a maintenant « Réessayer » (bouton principal) au-dessus de « Repartir de zéro » (secondaire) ; « Restaurer une sauvegarde » s'ajoute au-dessus de « Repartir de zéro » et devient le bouton principal (maquette), « Réessayer » passe alors en secondaire ;
  - le texte « Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro. » est gardé tel quel jusqu'au 014f (réponse 3 du porteur) : le 014f le rend vrai sur l'écran même ;
  - la base abîmée n'est pas ouverte (`useDatabase` en état `failed`, cause `damaged`) : la restauration doit d'abord supprimer le fichier (`resetDatabase()` / `deleteAppDatabase()`) et ouvrir une base neuve, puis `restoreBackup` ;
  - le vidage des dossiers de `useRestore` se fait déjà sous le verrou `'restore'`, au début de chaque restauration ; le nettoyage au démarrage prend `'cleanup'` : la pile n'est montée qu'après sa fin, l'écran de récupération aussi doit l'attendre avant d'ouvrir le sélecteur ;
  - `resetDatabase()` est sans effet hors d'une base abîmée (garde du 014c) : à garder pour le chemin de restauration.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Carte de résumé de la variante abîmée | Phrase des données abîmées à la place de « Toutes les données actuelles… seront remplacées » ; en plus | En plus : « remplacées par celles de ce fichier. », puis « Les données abîmées seront effacées définitivement. » | Lecture de la réponse du porteur (« la carte de résumé … avec … ») : la carte reste celle de l'écran Restauration ; les deux phrases sont vraies | en attente du porteur |
| Écran pendant la confirmation | Carte et deux boutons seuls ; carte sous le texte de la variante et ses trois boutons | Carte de résumé, « Annuler » et « Remplacer mes données » seuls (même titre) | Comme l'écran Restauration ; une seule décision à l'écran | à relire |
| Affichage d'un refus ou d'un échec avant l'effacement | Au-dessus des trois boutons ; à la place | Carte du refus (message 014e, « Rien n'a été modifié. Choisissez un autre fichier. ») sous le texte de la variante, au-dessus des trois boutons, qui restent actifs | « Restaurer une sauvegarde » sert de « Choisir un fichier… » ; rien n'a été touché | à relire |
| Titre après une recopie en échec | Même titre ; titre propre | Même titre, « Vos données ne peuvent pas être ouvertes » | Une seule maquette ; le message dit ce qui s'est passé | à relire |
| Effacement en échec pendant une restauration | Message propre ; message du 014c | « L'effacement n'a pas abouti. Réessayez. » sous les trois boutons (état `resetFailed` du 014c) | Même effacement que « Repartir de zéro » ; rien n'est modifié | à relire |
| Nouvelle recopie après un échec | Fonction à part ; `replaceDamagedDatabase` | `replaceDamagedDatabase` remplit la base vide déjà ouverte quand l'état est `restoreFailed`, sans effacer ; `restoreFailed` porte `pending` (nouvelle recopie en cours : `acceptEmptyDatabase` et un second appel sans effet) | Un seul point d'entrée pour publier une base restaurée ; aucun effacement possible hors de la base abîmée (tests de mutation) | à relire |
| Confirmation après un échec | Celle de la variante abîmée ; celle de l'écran Restauration | Celle de l'écran Restauration (sans la phrase des données abîmées), sans ligne d'appel en cours (base vide) | Plan validé : restauration normale sur la base vide | à relire |
| Lieu de `useRecovery` | Dans `Recovery.tsx` ; dans le layout racine | Layout racine (comme `useDatabaseState` et le nettoyage), passé à `Recovery` en propriété | Son état survit au passage de la variante abîmée à la variante « recopie en échec » ; `Recovery.tsx` reste sans navigation ni adaptateur de fichiers | à relire |
| Garde du double appui | Ref par écran ; verrou commun | Verrou commun seul : `choose` attend le nettoyage, puis seul le premier appel prend `'restore'` | Le verrou suffit (test de mutation) ; une ref en plus serait du code qu'aucun test ne peut distinguer | à relire |
| Journal | Codes dans `useRecovery` ; dans `useDatabase` | `RECOVERY_RESTORE_DONE` et `RECOVERY_RESTORE_FAILED` écrits par `replaceDamagedDatabase`, avec `DB_RESET_DONE` ou `DB_RESET_FAILED` pour l'effacement, et `DB_OPEN_*` si la base neuve ne s'ouvre pas ; ceux du 014e (`RESTORE_*`) inchangés ; codes seuls | ABS-04 ; l'effacement est le même que celui de « Repartir de zéro » | à relire |
| Retour Android | Pendant la recopie seule ; dès la confirmation | `BackHandler` bloqué tant que l'état est `restoring` : de « Remplacer mes données » à la fin du cycle (effacement, recopie, effacement des copies) | Plan validé ; l'accueil peut s'afficher quelques millisecondes avant la fin de l'effacement des copies, retour bloqué pendant ce temps | à relire |
| Éléments partagés avec l'écran Restauration | Copier ; partager | `src/ui/RestoreSummary.tsx` : `RestoreSummary` (propriété `erase`), `RestoreActions`, `RestoreRefusal`, `RestoreVerifying`, `refusalOf` ; `restauration.tsx` les utilise, rendu inchangé (tests 014e verts) | Plan validé (résumé partagé) ; une seule table des messages de refus | à relire |
| Fichiers | Découper ; garder | 15 fichiers, tests compris : `restoreFlow.ts`, `useRecovery.ts`, `RestoreSummary.tsx`, `recoveryEnv.ts` (fixture), `useDatabaseReplace.test.tsx`, `recoveryRestore.test.tsx`, `recoveryRestoreFailure.test.tsx` (nouveaux) ; `useDatabase.ts`, `useRestore.ts`, `Recovery.tsx`, `recovery.test.tsx`, `restauration.tsx`, `_layout.tsx`, `recuperation.ts`, `scripts/maquettes.mjs` | Ticket gardé entier par le porteur (environ 15 fichiers) | à relire |

## Questions pour le porteur

Aucune question réservée. Une décision attend le porteur dans la file (« en attente du porteur ») : la phrase des données abîmées, en plus ou à la place de « Toutes les données actuelles … seront remplacées ».

## À reporter

- CHANGELOG : Écran « Base illisible » : « Restaurer une sauvegarde » (bouton principal) ; le fichier est vérifié sur l'écran même, puis résumé avec « Les données abîmées seront effacées définitivement. » ; refus ou Annuler ne touchent pas au fichier abîmé ; après la confirmation, effacement, base neuve et recopie en une transaction, puis l'accueil ; si la recopie échoue, base vide ouverte, « Choisir un fichier… » ou « Repartir de zéro » ; retour Android sans effet pendant l'effacement et la recopie (EX-22, EX-20, SEC-10, SEC-11 ; ticket 014f).
- Architecture (§4.1 et §4.3) :
  - `src/hooks/useDatabase.ts` : état `restoreFailed` (base neuve vide ouverte, non publiée, `pending`) ; `replaceDamagedDatabase(fill)` (base abîmée seulement : effacement, base neuve non publiée, `fill`, puis `ready` ; effacement en échec : `resetFailed` ; recopie en échec : `restoreFailed` ; ouverture en échec : cause classée ; depuis `restoreFailed` : nouvelle recopie sur la même base, sans effacement ; ne rejette jamais) ; `acceptEmptyDatabase()` (`restoreFailed` vers `ready`) ;
  - `src/hooks/restoreFlow.ts` : cycle commun (vidage, sélecteur, `verifyBackup` sur une copie sans la base de l'appli, confirmation, étape finale `apply` injectée, copies effacées dans un `finally`), utilisé par `useRestore` (qui seul lit l'appel en cours, EX-14) et `useRecovery` ;
  - `src/hooks/useRecovery.ts`, appelé par le layout racine : attend `cleanupAtStartup()`, tient `fileLock` (`'restore'`) du choix du fichier à la fin de la recopie, étape finale `replaceDamagedDatabase(db => restoreBackup(db, backup))`, `notifyDataChanged` après une réussite, `BackHandler` bloqué pendant `restoring` ;
  - `src/ui/Recovery.tsx` : propriétés `database`, `restore`, `cleaned`, `onAcceptEmpty` ; `src/ui/RestoreSummary.tsx` partagé avec `src/app/restauration.tsx`.
- Journal (codes seuls, ABS-04) : `RECOVERY_RESTORE_DONE`, `RECOVERY_RESTORE_FAILED` ; `DB_RESET_DONE` et `DB_RESET_FAILED` aussi écrits par l'effacement de la restauration.
- SECURITE.md, SEC-11 (limites) : « Restaurer une sauvegarde » depuis l'écran de récupération (ticket 014f) efface la base abîmée comme « Repartir de zéro » (octets non écrasés, stockage privé chiffré par le système). Un arrêt brutal entre l'effacement et la fin de la recopie laisse une base vide : au démarrage suivant, Bienvenue ; la sauvegarde choisie n'est pas touchée et reste disponible pour une restauration depuis Paramètres › Sauvegarde. Une recopie en échec laisse aussi une base vide ouverte, avec « Choisir un fichier… » ou « Repartir de zéro ». Vérification : `src/hooks/useDatabaseReplace.test.tsx` (effacement seulement pour une base abîmée et après la confirmation, base non publiée avant la fin de la recopie, gardes vérifiées par mutation), `src/appTests/recoveryRestore.test.tsx` et `recoveryRestoreFailure.test.tsx` (fichier abîmé intact après un refus, Annuler ou le sélecteur fermé).
- SECURITE.md, SEC-10 : la restauration depuis l'écran de récupération efface ses copies comme celle de l'écran Restauration (même cycle, `src/hooks/restoreFlow.ts`) et n'ouvre le sélecteur qu'après le nettoyage du démarrage.
- CONFORMITE et ABS-08 : aucune donnée nouvelle, aucune dépendance, aucune permission (`BackHandler` fait partie de React Native) : politique et déclarations inchangées, à confirmer à l'intégration.
- Maquette : `scripts/maquettes.mjs` annoté (« Base illisible », deux paragraphes 014f) ; `design/maquettes/index.html` à régénérer une seule fois à l'intégration (`node scripts/maquettes.mjs`), avec le 015f.
- À vérifier sur l'A55 (APK de debug, recette indispensable) : base abîmée volontairement (`run-as`, voir la PR du 014c), « Restaurer une sauvegarde » depuis Drive et depuis Téléchargements, refus d'un fichier texte puis fichier abîmé intact, Annuler puis fichier abîmé intact, réussite puis accueil avec les données, retour Android sans effet pendant la recopie ; durée de la séquence avec une grosse base fictive.
- Non vérifié : `deleteDatabaseAsync` puis `openDatabaseAsync` du même nom sur expo-sqlite natif dans la même session (jamais essayé hors de Jest) ; `ATTACH` et `restoreBackup` sur expo-sqlite natif ; iPhone.
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
