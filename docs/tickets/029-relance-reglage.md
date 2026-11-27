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

## Questions pour le porteur

## À reporter

- CHANGELOG : Paramètres : réglage de la relance (activation, délai), demande de permission seulement à l'activation, état réel affiché (F-06, EX-28, EX-29).
- Architecture : écrans `relance.tsx`, `permission-notifications.tsx` ; `src/hooks/useReminderSettings.ts`.
