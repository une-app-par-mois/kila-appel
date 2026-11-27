# 029 — Relance : réglage et demande de permission

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (demande de permission du système, EX-29, ABS-07) · Trivial : non

Dépend de : 028a (adaptateur `src/data/expoNotifications.ts`, `reminderPermission` ; pas le 028b, décision du porteur du 2026-11-27) · Fichiers touchés : `src/app/relance.tsx` (nouveau), `src/app/permission-notifications.tsx` (nouveau), `src/hooks/useReminderSettings.ts` (nouveau), `src/app/(tabs)/parametres.tsx`, `src/config/libelles/relance.ts`, `src/appTests/reminderSettings.test.tsx` (nouveau), `src/appTests/notificationPermission.test.tsx` (nouveau), `src/data/expoNotifications.ts` (fonction de demande juste après `reminderPermission`), `src/__fixtures__/expoModules.ts` (faux module, même placement), `src/data/expoNotificationsPermission.test.ts` (nouveau : le test actuel de l'adaptateur fait 300 lignes), `src/config/libelles/commun.ts` et `src/config/libelles/alertes.ts` (`alerts.settingsSection` déplacé vers `labels.settings`, avec sa référence dans `src/appTests/alerts.test.tsx`) — environ 12 fichiers, gardé entier (décision du porteur du 2026-11-27)

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

EX-29 : la permission n'est demandée qu'à l'activation de la relance, et le réglage affiche l'état effectif (préférence et permission du système). Maquettes « Réglage de la relance », « Demande de permission de notification », ligne « Relance » de Paramètres.

## À lire

- `design/maquettes/` : écrans ci-dessus (notes : « L'interrupteur montre l'état effectif », « Affiché à l'activation de la relance, juste avant la demande du système »)
- `docs/PRD.md` : EX-28, EX-29 ; tickets 026 à 028
- `src/data/expoNotifications.ts` (028a), `src/app/(tabs)/parametres.tsx`, `src/ui/Select.tsx`

## Ce qui change

- `src/app/relance.tsx` : « Me relancer si l'appel n'est pas fait » (interrupteur), « Notification sur cet appareil, jamais envoyée ailleurs » ; « Après [30 min ▾] le début du créneau » ; si la préférence est active mais la permission refusée : bandeau « Notifications refusées dans les réglages du téléphone », « La relance est activée ici mais ne peut pas s'afficher. », « Ouvrir les réglages du téléphone » (`Linking.openSettings` de React Native, sans réseau).
- `src/app/permission-notifications.tsx` : texte de la maquette ; « Continuer » → demande du système ; « Pas maintenant » → retour, relance non activée.
- Parcours (décision du porteur du 2026-11-27) : interrupteur activé → permission déjà accordée : activée tout de suite ; `canAskAgain: false` : pas d'écran de permission, préférence active et bandeau ; sinon écran de permission → accordée : activée ; refusée au dialogue : préférence active, bandeau « ne peut pas s'afficher » avec « Ouvrir les réglages du téléphone » (accordée ensuite dans les réglages : la relance marche sans autre manipulation). Permission jamais demandée (`undetermined`, par exemple après une sauvegarde restaurée) : interrupteur éteint, sans bandeau. Désactiver ne demande rien.
- `src/app/relance.tsx` : sous « Notification sur cet appareil, jamais envoyée ailleurs », en texte secondaire, « Le nom du groupe s'affiche sur l'écran verrouillé. » (écart de maquette accepté par le porteur le 2026-11-27).
- `src/data/expoNotifications.ts` : fonction de demande (`requestPermissionsAsync`, iOS `allowAlert: true, allowSound: true, allowBadge: false`), placée juste après `reminderPermission` ; même placement dans `src/__fixtures__/expoModules.ts` ; testée dans `src/data/expoNotificationsPermission.test.ts`. Clés de `relance.ts` ajoutées après le bloc `reminder` (le 028b ajoute `channel` en première clé de `reminder`). Imports dans l'ordre alphabétique.
- `alerts.settingsSection` (« Réglages ») déplacé de `src/config/libelles/alertes.ts` vers `labels.settings` (`src/config/libelles/commun.ts`).
- `src/hooks/useReminderSettings.ts` : préférence (027), permission relue à l'ouverture et au retour au premier plan (l'encadrant revient des réglages du téléphone) ; écrire la préférence émet `notifyDataChanged` (reprogrammation, 028).
- Paramètres : ligne « Relance · Activée · 30 min » ou « Désactivée » (ou « Refusée par le téléphone »), au-dessus de « Alertes d'assiduité » (section « Réglages » posée au 022).

## Critères d'acceptation

- [ ] EX-29 : aucune demande de permission avant l'activation de l'interrupteur (test : l'adaptateur simulé n'est jamais appelé à l'ouverture de l'appli ni de Paramètres).
- [ ] EX-29 : l'interrupteur montre l'état effectif : préférence active et permission refusée → bandeau, interrupteur tel que la maquette le montre.
- [ ] Retour des réglages du téléphone avec la permission accordée : le bandeau disparaît sans relancer l'écran.
- [ ] Délai modifié : reprogrammation (028) ; ligne de Paramètres à jour.
- [ ] NF-06 : interrupteur et liste lisibles par le lecteur d'écran (rôle, état) ; zones d'appui de 44 pt.
- [ ] CONV-03, CONV-16 ; écarts avec la maquette listés dans la PR.

## Tests attendus

- `src/appTests/reminderSettings.test.tsx`, `src/appTests/notificationPermission.test.tsx` : accordée, refusée, déjà refusée (`canAskAgain: false`, écran de permission sauté), jamais demandée avec la préférence active (interrupteur éteint, sans bandeau), « Pas maintenant », retour au premier plan, mention « écran verrouillé » ; `src/data/expoNotificationsPermission.test.ts` : fonction de demande (iOS `allowBadge: false`).
- À la main (téléphone Android 13 ou plus, prétest) : boîte du système, refus puis réglages du téléphone, relance reçue.

## Hors périmètre

- Alarme exacte et son réglage spécial (ticket 026, réservé au porteur).

## Questions prévues

- Plan à valider à la séance de lancement (zone sensible).
- Interrupteur quand la permission est refusée : la maquette le montre activé avec le bandeau ; garder cette lecture (préférence active, affichage impossible) sauf avis contraire.

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.

Reports de l'intégration du lot J2-2 (2026-11-27) :

- une sauvegarde restaurée avec `reminder_enabled = 1` alors que la permission n'est pas accordée doit afficher l'état réel (EX-29) (027).
- la clé `alerts.settingsSection` (« Réglages », `src/config/libelles/alertes.ts`) est à déplacer quand la section reçoit la ligne Relance (022).
- section « Réglages » de Paramètres (022) : une seule ligne aujourd'hui, « Alertes d'assiduité · Après N absences » ; la ligne Relance s'ajoute au-dessus (maquette Paramètres).
- sous le réglage, la mention « le nom du groupe s'affiche sur l'écran verrouillé » (027, revue de sécurité ; `docs/IDEES.md`).

Reports de l'intégration du lot J2-3 (2026-11-27) :

- le 029 dépend seulement du 028a (décision du porteur du 2026-11-27) : il peut avancer dans le même lot que le 028b, qui branche la reprogrammation ; « Délai modifié : reprogrammation » se vérifie par `notifyDataChanged` émis, la reprogrammation elle-même étant testée au 028b.
- `requestPermissionsAsync` est permis par la liste fermée de l'adaptateur mais ni importé ni exposé au 028a : l'ajouter dans `src/data/expoNotifications.ts` avec `ios: { allowAlert: true, allowSound: true, allowBadge: false }` (alerte et son, sans pastille, réponse du porteur au 026) ; le contrôle `src/staticChecksNotifications.test.ts` l'accepte déjà dans l'adaptateur seulement (028a).
- quand la lecture de la permission échoue, `reminderPermission` rend `canAskAgain: false` (code `REMINDER_PERMISSION_FAILED`) : ne pas afficher alors « Notifications refusées dans les réglages du téléphone » (028a).

Séance de lancement du lot J2-4 (2026-11-27), réponses du porteur :

- **Plan validé par le porteur le 2026-11-27** (zone sensible) : la permission n'est demandée qu'à l'activation, après l'écran « Autoriser les notifications ? » ; iOS avec `allowBadge: false` ; permission relue au retour au premier plan ; bouton « Ouvrir les réglages du téléphone ».
- Questions posées au porteur au QCM, toutes tranchées le 2026-11-27 :
  - **Taille** : gardé entier, à environ 12 fichiers (fonction de demande dans l'adaptateur, faux module, nouveau fichier de test de l'adaptateur, déplacement de `alerts.settingsSection`).
  - **Refus au dialogue et permission jamais demandée** : on montre l'état effectif, avec un bandeau. Refus : la préférence reste active, le bandeau « ne peut pas s'afficher » propose d'ouvrir les réglages ; accordée ensuite dans les réglages, la relance marche sans autre manipulation. `canAskAgain: false` : on saute l'écran « Autoriser les notifications ? », la préférence passe à active et le bandeau s'affiche. Jamais demandée (`undetermined`, par exemple après une sauvegarde restaurée) : interrupteur éteint, sans bandeau ; l'activer suit le parcours normal.
  - **Mention « écran verrouillé »** : écart de maquette accepté ; « Le nom du groupe s'affiche sur l'écran verrouillé. » en texte secondaire, sous « Notification sur cet appareil, jamais envoyée ailleurs », sur l'écran Relance.
- Placement pour éviter les conflits avec le 028b : clés de `relance.ts` après le bloc `reminder` ; fonction de demande juste après `reminderPermission` dans l'adaptateur et le faux module ; imports dans l'ordre alphabétique.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Distinguer « jamais demandée », « refusée », « refusée sans redemande » et « lecture en échec » | modifier `reminderPermission` (utilisé par le 028b) ; nouvelle fonction de lecture à côté | nouvelle fonction `reminderPermissionState` (`granted`, `undetermined`, `denied`, `blocked`, `unknown`), juste après `reminderPermission` | `reminderPermission` ne distingue ni `undetermined` ni l'échec ; ne pas toucher au contrat utilisé par le 028b en parallèle | à relire |
| Interrupteur activé alors que la lecture de la permission échoue | activer sans demander ; passer par l'écran de permission | écran « Autoriser les notifications ? » puis demande | on ne sait pas si elle est accordée : la demande tranche, et le parcours reste celui de la maquette | à relire |
| Préférence active, permission refusée mais encore redemandable (Android, `denied` avec `canAskAgain`) | bandeau ; pas de bandeau | interrupteur allumé et bandeau, comme `blocked` ; le réactiver repasse par l'écran de permission | même état effectif que le refus décidé par le porteur : la relance ne peut pas s'afficher | à relire |
| Ligne de Paramètres quand la préférence est active mais la permission jamais demandée, ou illisible | suivre la préférence ; suivre l'interrupteur | suit l'interrupteur : « Désactivée » si jamais demandée, « Activée · N min » si illisible | la ligne et l'écran disent la même chose | à relire |
| Demande du système en échec (exception, pas un refus) | préférence active (comme un refus) ; préférence inchangée | préférence active ; la permission restant `undetermined`, l'interrupteur s'affiche éteint, sans bandeau | « un échec vaut non accordée » (consigne) et le refus active la préférence (décision du porteur) ; facile à défaire (un réglage, sans migration) | en attente du porteur |
| Nom de la clé déplacée `alerts.settingsSection` | `labels.settings.settingsSection` ; `labels.settings.preferences` | `labels.settings.preferences` (« Réglages ») | les autres sections de `labels.settings` portent un nom court (`organisation`, `data`, `about`) | à relire |
| Délai réglable quand la relance est désactivée | toujours ; seulement activée | toujours | la maquette montre la ligne du délai sans condition | à relire |
| Échec de `Linking.openSettings` | rien ; message | code `OPEN_SETTINGS_FAILED` au journal et « L’opération a échoué. Réessayez. » | CONV-15, ABS-04 : un code seul | à relire |
| Relire la permission au retour au premier plan | exposer un rechargement dans `useLoaded` ; compteur de retours en dépendance de la lecture | compteur `AppState` dans `useReminderSettings`, lecture gardée pendant la relecture (`keepPrevious`), `biome-ignore` ciblé comme `useRecovery.ts` | pas de changement du hook partagé ; le bandeau disparaît sans vider l'écran ; la ligne de Paramètres suit aussi | à relire |

Écarts avec la maquette (à lister dans la PR) :

- mention « Le nom du groupe s’affiche sur l’écran verrouillé. » sous « Notification sur cet appareil, jamais envoyée ailleurs » (acceptée par le porteur le 2026-11-27) ;
- apostrophes typographiques (’) au lieu de l'apostrophe droite, comme tous les libellés du projet ;
- titre de la liste des délais, « Délai après le début du créneau », absent de la maquette (même principe que « Nombre d’absences de suite » au 022) ;
- interrupteur natif (`Switch` de React Native, couleurs Encre et Quadrillage, pouce blanc) : son dessin suit le système ;
- message d'échec de l'ouverture des réglages du téléphone, non maquetté.

## Questions pour le porteur

- **Sécurité, à confirmer à la revue (non bloquant pour ce ticket, préexistant au 028a)** : importer `expo-notifications` exécute son module `DevicePushTokenAutoRegistration.fx` (écouteur de jeton push, qui n'envoie rien tant qu'aucun enregistrement serveur n'est activé, ce que l'appli ne fait jamais). Avec le 029, Paramètres importe l'adaptateur : le module est chargé dès l'ouverture de l'appli. Options : (1, recommandé) garder, avec la permission INTERNET absente du binaire (ABS-01) et aucune fonction push importée (contrôle `staticChecksNotifications`), et le noter à `/security-review` ; (2) charger l'adaptateur seulement à l'ouverture de l'écran Relance, mais la ligne de Paramètres ne pourrait plus afficher « Refusée par le téléphone ».

## À reporter

- CHANGELOG : Paramètres : réglage de la relance (activation, délai), demande de permission seulement à l'activation, état réel affiché (F-06, EX-28, EX-29).
- Architecture : écrans `relance.tsx`, `permission-notifications.tsx` ; `src/hooks/useReminderSettings.ts` (préférence et état de la permission, relue au retour au premier plan) ; adaptateur : `reminderPermissionState` et `requestReminderPermission` (seule demande de permission, iOS sans pastille) ; `labels.settings.preferences` remplace `alerts.settingsSection`.
- Tests : dans Jest, les tests d'écran qui ouvrent Paramètres sans imiter `expo-notifications` passent par la lecture en échec (`REMINDER_PERMISSION_FAILED`, journal imité) : ligne « Désactivée », sans effet sur leurs assertions.
