# 028 — Relance : programmation sur l'appareil

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (notifications, ABS-01 : aucune fonction réseau d'expo-notifications ; ABS-04 ; effacement : Tout effacer annule les relances) · Trivial : non

Dépend de : 026 (dépendance installée), 027 (calcul et réglages) · Fichiers touchés : `src/data/expoNotifications.ts` (nouveau), `src/hooks/useReminders.ts` et son test (nouveaux), `src/app/_layout.tsx`, `src/hooks/useErase.ts`, `src/staticChecksFiles.test.ts`, `src/__fixtures__/expoModules.ts`, `src/config/licences.json`, `src/hooks/useEraseAll.test.tsx` — 9 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

Programmer sur l'appareil les relances calculées par le 027 : tout annuler puis reprogrammer à chaque écriture, à l'ouverture et au retour au premier plan (ADR-007). Un appui sur la notification ouvre l'appel du créneau. Tout effacer doit annuler les relances (`docs/IDEES.md`, note du porteur du 2026-11-27, ticket 015f).

## À lire

- ADR-007 ; `docs/ARCHITECTURE.md` §5 ; `docs/SECURITE.md` SEC-01, SEC-03, SEC-12 ; ticket 026 (relevé du paquet, plan validé)
- `src/data/expoFiles.ts` et `src/staticChecksFiles.test.ts` (modèle : un seul fichier importe le module, liste fermée des fonctions)
- `src/hooks/dataChanged.ts` (`notifyDataChanged`, `useErasedCount`), `src/hooks/useLocalNow.ts`, `src/hooks/useErase.ts` (`useEraseAll`), `src/app/_layout.tsx`
- `design/maquettes/` : « Relance sur l'écran verrouillé » (« Un appui ouvre l'appel. »)

## Ce qui change

- `src/data/expoNotifications.ts`, **seul fichier qui importe expo-notifications**, en imports nommés seulement : `scheduleNotificationAsync` (déclencheur à date fixe), `cancelAllScheduledNotificationsAsync`, `getPermissionsAsync`, `requestPermissionsAsync` (alerte et son, sans pastille), `setNotificationChannelAsync` (canal Android « Relances »), `setNotificationHandler`, `addNotificationResponseReceivedListener`, `getLastNotificationResponseAsync`. Conversion date et heure locales → `Date` ici seulement.
- `src/staticChecksFiles.test.ts` : expo-notifications importé par ce seul fichier ; `import *` refusé ; refusés partout : `getExpoPushTokenAsync`, `getDevicePushTokenAsync` (SEC-03, déjà), `setAutoServerRegistrationEnabledAsync`, `addPushTokenListener`, `unregisterForNotificationsAsync`, `registerTaskAsync`, `subscribeToTopicAsync`, `unsubscribeFromTopicAsync` (ABS-01).
- `src/hooks/useReminders.ts` : lit créneaux, séances et réglages, appelle `plannedReminders` (027), puis annule tout et reprogramme ; déclenché à l'ouverture, au retour au premier plan, à chaque `notifyDataChanged` et après un effacement ; une seule reprogrammation à la fois (la dernière gagne) ; échec journalisé par un code (`REMINDERS_SCHEDULE_FAILED`), sans nom (ABS-04) et sans bloquer l'appli.
- `src/app/_layout.tsx` : monte `useReminders` une fois la base prête ; appui sur une relance (ou appli lancée par elle) → `/appel?creneau=<slotId>&date=<date>` après validation des deux valeurs (CONV-14) ; valeurs invalides → accueil.
- `src/hooks/useErase.ts` : Tout effacer annule toutes les relances juste après l'effacement, sous le même verrou ; un échec est journalisé (`ERASE_REMINDERS_FAILED`) sans empêcher Bienvenue.
- Restauration (014e, 014f) : couverte par `notifyDataChanged` déjà émis après une restauration réussie (vérifié par un test).
- `src/config/licences.json` régénéré par `scripts/licences.js` (EX-42) : expo-notifications, expo-application, badgin, abort-controller.

## Critères d'acceptation

- [ ] EX-28 : relance activée, créneau dans 1 h → une notification programmée à début + délai (test sur l'adaptateur simulé, puis sur le téléphone).
- [ ] Enregistrer l'appel annule la relance de cette séance ; modifier ou supprimer un créneau, un groupe, la saison, la reprogramme.
- [ ] Relance désactivée ou permission refusée : rien n'est programmé, tout est annulé.
- [ ] Tout effacer : plus aucune relance programmée (IDEES, SEC-11) ; restauration : relances recalculées sur les données restaurées.
- [ ] Appui sur la notification : l'appel du créneau à la bonne date s'ouvre ; données hors format refusées.
- [ ] SEC-01 et SEC-03 : contrôles statiques étendus, chacun vu en échec sur un exemple.
- [ ] ABS-04 : aucun nom dans le journal ni dans la notification.

## Tests attendus

- `src/hooks/useReminders.test.tsx` : adaptateur simulé (`src/__fixtures__/expoModules.ts`) : ouverture, écriture, désactivation, permission refusée, échec de programmation, courses entre deux reprogrammations.
- `src/hooks/useEraseAll.test.tsx` : annulation après Tout effacer ; `src/staticChecksFiles.test.ts`.
- À la main (téléphone, prétest du jalon) : relance reçue écran verrouillé, sans nom de membre ; appui → appel ; relance reçue après un redémarrage du téléphone ; mode avion.

## Hors périmètre

- Écrans de réglage et de permission (029).
- Alarme exacte (refusée sauf décision du porteur, ticket 026).

## Questions prévues

- Plan à valider à la séance de lancement (zone sensible).
- Comportement quand l'appli est au premier plan au moment de la relance : proposé, afficher la notification quand même (`setNotificationHandler`), car l'encadrant peut être sur un autre écran.

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.
- Autorisation iOS : alerte et son, sans pastille (réponse sur le 026).

Reports de l'intégration du lot J2-1 (2026-11-27) :

- le contrôle statique (SEC-01, SEC-03) refuse, en plus de l'import d'expo-notifications hors de `src/data/expoNotifications.ts` : `getExpoPushTokenAsync`, `getDevicePushTokenAsync`, `subscribeToTopicAsync`, `unsubscribeFromTopicAsync`, `setAutoServerRegistrationEnabledAsync`, `registerTaskAsync`, `setBadgeCountAsync`, `getExactAlarmPermissionsAsync`, `requestExactAlarmPermissionsAsync`, et tout import d'`expo-application` (décision du porteur du 2026-11-27, 026) ;
- régénérer `src/config/licences.json` (EX-42) quand le paquet entre dans le bundle JavaScript (026).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Tout effacer et relances | Laisser la reprogrammation s'en charger ; annuler explicitement | Annuler explicitement dans `useEraseAll`, puis la reprogrammation trouve des réglages vides | Note du porteur (IDEES, 015f) ; ne dépend pas d'un ordre de rechargement | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Relance : notifications locales programmées pour les 7 jours à venir, annulées dès que l'appel est enregistré et par Tout effacer ; un appui ouvre l'appel (F-06, EX-28, ABS-04).
- Architecture : `src/data/expoNotifications.ts` (seul importeur d'expo-notifications), `src/hooks/useReminders.ts` ; Tout effacer annule les relances.
- SECURITE : SEC-01 et SEC-03, liste des fonctions d'expo-notifications refusées ; SEC-12, test du texte des notifications (027).
- IDEES : la ligne « Tout effacer devra annuler les relances » passe à « faite (ticket 028) ».
