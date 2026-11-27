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

Reports de l'intégration du lot J2-2 (2026-11-27) :

- sa liste de fichiers doit inclure `src/data/sessionsRepo.ts` (et son test) : `plannedReminders` attend les séances avec leur état (`{ slotId, date, state }`) ; la requête doit renvoyer `state` et inclure les séances futures annulées ou non planifiées (EX-38) (027).
- conversion des heures locales en `Date` : traiter l'heure absente au passage à l'heure d'été (02:00 à 03:00 le dernier dimanche de mars) et l'heure doublée au passage à l'heure d'hiver (dernier dimanche d'octobre), sans relance en double ; la fonction ne renvoie que des dates et heures locales en texte (027).
- au moment de programmer, écarter un déclencheur déjà passé : le calcul et la programmation n'ont pas lieu à la même minute (027).
- attraper l'erreur de `plannedReminders` (délai invalide) pour qu'un appel bien enregistré ne paraisse pas échoué (027).
- test « séance préparée → la relance part » qui passe par le dépôt (EX-36) ; le test SEC-12 du 027 marque pour l'instant toutes les séances lues comme `recorded` (027).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Tout effacer et relances | Laisser la reprogrammation s'en charger ; annuler explicitement | Annuler explicitement dans `useEraseAll`, puis la reprogrammation trouve des réglages vides | Note du porteur (IDEES, 015f) ; ne dépend pas d'un ordre de rechargement | à relire |
| Découpage | 028 entier ; 028a et 028b | **028a** : adaptateur et garde-fous ; **028b** (lot suivant, avec le 029) : `useReminders`, appui sur la notification, `_layout.tsx`, Tout effacer (`useErase.ts`, `tout-effacer.tsx`, `useEraseAll.test.tsx`), canal « Relances » dans `relance.ts` ; le 029 ne dépend que du 028a | décision du porteur | décidée par le porteur le 2026-11-27 |
| Contrôle statique (028a) | fichier existant ; nouveau fichier | nouveau `src/staticChecksNotifications.test.ts` ; refusés partout, appli et tests : `getExpoPushTokenAsync`, `getDevicePushTokenAsync`, `setAutoServerRegistrationEnabledAsync`, `addPushTokenListener`, `unregisterForNotificationsAsync`, `registerTaskAsync`, `unregisterTaskAsync`, `subscribeToTopicAsync`, `unsubscribeFromTopicAsync`, `setBadgeCountAsync`, `getExactAlarmPermissionsAsync`, `requestExactAlarmPermissionsAsync` ; tout import d'`expo-application`, tout sous-chemin `expo-notifications/…`, tout `import *` | les autres fichiers de contrôle sont pleins | décidée par le porteur le 2026-11-27 |
| Liste fermée de l'adaptateur | — | seul `src/data/expoNotifications.ts` importe expo-notifications, et seulement : programmer, annuler toutes les relances programmées, lire et demander la permission, créer le canal, `getLastNotificationResponse` (pas la variante `…Async`, obsolète), l'écouteur de réponse, `getPresentedNotificationsAsync`, `dismissNotificationAsync` ; constantes `SchedulableTriggerInputTypes` et `AndroidImportance` | plan ajusté | décidée par le porteur le 2026-11-27 |
| Canal Android | toujours ; seulement relance activée et permission accordée | créé seulement relance activée et permission accordée ; l'adaptateur offre `createReminderChannel`, l'appel est fait au 028b | plan ajusté | décidée par le porteur le 2026-11-27 |
| Demande de permission | 028 ; 029 | aucune demande au 028a ni au 028b ; elle n'arrive qu'au 029 (EX-29) | plan ajusté | décidée par le porteur le 2026-11-27 |
| Relances déjà affichées | les laisser ; retirer celles qui ne sont plus dues | l'adaptateur offre `dismissStaleReminders` (retire celles dont le couple `slotId`, `date` n'est plus dans la liste donnée) et `dismissAllReminders` (Tout effacer) ; branchement au 028b | plan ajusté ; voir « Questions pour le porteur » sur la liste à donner | décidée par le porteur le 2026-11-27 |
| Séances lues pour les relances | modifier `slotSessions` ; nouvelle méthode | `sessionsRepo.reminderSessions(seasonId)` : `{ slotId, date, state }` de tous les états, séances futures comprises ; `slotSessions` inchangé (F-13) | plan ajusté | décidée par le porteur le 2026-11-27 |
| `requestPermissionsAsync` au 028a | l'importer et l'exposer ; ne pas l'importer | permis par la liste fermée, mais ni importé ni exposé au 028a : le 029 l'ajoutera | aucune demande ne peut partir du 028a ; pas de code mort | à relire |
| Imports de types d'expo-notifications | permis ; refusés | refusés dans l'adaptateur comme tout nom hors liste ; les types sont déduits des fonctions importées | la liste fermée reste vérifiable nom par nom | à relire |
| Erreurs de l'adaptateur | lever ; journaliser et rendre une valeur sûre | aucune fonction ne lève : échec journalisé par un code (`REMINDER_DATE_INVALID`, `REMINDER_SCHEDULE_FAILED` avec `slotId`, `REMINDER_CANCEL_FAILED`, `REMINDER_DISMISS_FAILED`, `REMINDER_PERMISSION_FAILED`, `REMINDER_CHANNEL_FAILED`, `REMINDER_RESPONSE_FAILED`, `REMINDER_LISTEN_FAILED`), puis `false`, `0`, `null` ou « non accordée » ; une relance en échec n'empêche pas les autres | un échec de relance ne doit jamais bloquer l'appli ni faire paraître un appel échoué ; ABS-04 | à relire |
| Identifiant de la notification | laissé au système ; `relance-<slotId>-<date>` | `relance-<slotId>-<date>` | programmer deux fois la même séance remplace sa relance au lieu de la doubler ; identifiants seulement | à relire |
| Son | sans ; son par défaut | `sound: 'default'` | réponse du porteur au 026 (alerte et son, sans pastille) ; sur Android 8+, le canal décide | à relire |
| Canal : identifiant, importance, pastille, nom | — | identifiant `relances`, importance `HIGH` (bannière), `showBadge: false` ; le nom est passé en paramètre (le libellé « Relances » vient au 028b dans `relance.ts`) | une relance doit se voir pendant la séance ; sans pastille comme sur iOS. L'importance d'un canal ne change plus une fois créé sur l'appareil : à confirmer avant le 028b | en attente du porteur |
| Heure doublée (heure d'hiver) | choix du moteur JavaScript ; première occurrence imposée | première occurrence imposée (`firstOccurrence` cherche la même heure locale jusqu'à 3 h plus tôt) | V8 prend déjà la première, Hermes n'est pas vérifié ; une seule notification par séance | à relire |
| Heure absente (heure d'été) | décalage du moteur (02:30 → 03:30) ; première minute valide | première minute valide qui suit (02:30 → 03:00), cherchée minute par minute sur 3 h au plus ; la date construite est relue (jour, heures, minutes) | demande du porteur ; V8 décale d'une heure entière | à relire |
| Déclencheur passé | — | écarté s'il tombe avant ou dans la minute courante (`now` réel) ; après revue, l'horloge (`Date.now()`) est aussi relue juste avant chaque appel natif, et un déclencheur à moins de 5 s est écarté | le calcul et la programmation n'ont pas lieu à la même minute (027) ; iOS refuse un déclencheur passé et la relance serait perdue | à relire |
| Notification affichée sans cible lisible | la retirer ; la laisser | `dismissStaleReminders` la laisse ; `dismissAllReminders` retire tout | ne retirer que ce qu'on sait être une relance périmée | à relire |
| Appui : données hors format | ignorer ; signaler `null` | `lastReminderTarget` et l'écouteur rendent `null` (CONV-14 : `slotId` entier positif, `date` ISO valide) | le 028b renvoie alors à l'accueil | à relire |
| `reminderSessions` et appels sans créneau | inclus (`slotId` null) ; exclus | exclus (`slot_id IS NOT NULL`) | sans effet sur les relances (EX-39) | à relire |
| `moduleName` partagé | dupliqué ; partagé | déplacé de `staticChecksFiles.test.ts` vers `src/__fixtures__/expoAccess.ts`, importé par les deux contrôles | pas de doublon ; comportement inchangé (tests verts) | à relire |
| Taille du 028a | découper encore ; garder | gardé : 12 fichiers avec la fiche et `jest.config.js` (correction de revue), au-delà des environ 8 prévus et de la limite de 10 ; `expoAccess.ts` et `staticChecksFiles.test.ts` pour le partage de `moduleName` | une session ; compte corrigé après revue (il était annoncé à 10), question posée au porteur par l'intégration | à relire |
| Fuseau horaire des tests | `process.env.TZ` dans le fichier de test ; `jest.config.js` ; `globalSetup` | `process.env.TZ = 'Europe/Paris'` en tête de `jest.config.js`, avant le démarrage des workers ; test de garde sur le décalage de janvier et de juillet | posé dans un fichier de test, il était sans effet (chaque worker copie l'environnement) : 7 tests échouaient en UTC, le fuseau de la CI ; vérifié avec `TZ=UTC ./scripts/test.sh` et `TZ=America/New_York` | à relire |
| M1 d) import relatif hors de `src/` | parcourir les fichiers de la racine que Metro atteint ; refuser l'import | refuser tout import relatif qui sort de `src/`, sauf un fichier `.json` (données sans code : `app.json`, `design/jetons.json`, déjà importés) | plus simple et plus sûr : rien à parcourir, aucun code hors de `src/` n'est atteignable sans se voir | à relire |
| M1, autres trous | — | refusés partout : tout chemin contenant `node_modules/` ; `import N = require()` compté comme import ; clé écrite en chaîne (`{ 'nom': x }`, `{ ['nom']: x }`) comptée parmi les fonctions refusées ; `jest.requireActual` et `jest.mock` sans fabrique comptés comme des imports ; `jest.requireMock` aussi, sauf d'un module simulé par une fabrique dans le même fichier (il rend alors la simulation) ; test « seul importeur » appuyé sur `moduleName` | revue de sécurité du 028a ; l'exception de `requireMock` évite de réécrire les tests de l'adaptateur des fichiers, sans ouvrir le vrai module | à relire |

## Questions pour le porteur

Aucune ne bloque le 028a ; les deux sont à trancher avant le 028b.

- **Liste donnée pour retirer les relances affichées.** Si le 028b passe le plan des relances à venir (`plannedReminders`), une relance déjà affichée n'y figure plus, puisque son moment est passé : elle disparaîtrait à chaque reprogrammation (ouverture, retour au premier plan), alors que l'appel manque toujours.
  - Option A (recommandée) : passer les séances encore dues, c'est-à-dire les occurrences récentes sans séance enregistrée, annulée ou non planifiée (même règle que les appels manquants, EX-17, EX-36, EX-38) ; une relance n'est retirée que si l'appel est fait, la séance annulée, ou le créneau ou le groupe supprimé.
  - Option B : le plan au sens strict (relances à venir) ; toute relance affichée disparaît à la reprogrammation suivante.
  - L'adaptateur accepte les deux (il prend une liste) ; rien n'est branché au 028a.
- **Relance quand l'appli est au premier plan (cas réservé : liste fermée, SEC-03).** `setNotificationHandler` n'est pas dans la liste fermée validée : sans lui, une relance qui arrive appli ouverte ne s'affiche pas (iOS et Android).
  - Option A (recommandée) : l'ajouter à la liste au 028b, avec bannière, liste et son, sans pastille (question prévue de la fiche : l'encadrant peut être sur un autre écran).
  - Option B : ne rien afficher appli ouverte.

## À reporter

- CHANGELOG : Relance : notifications locales programmées pour les 7 jours à venir, annulées dès que l'appel est enregistré et par Tout effacer ; un appui ouvre l'appel (F-06, EX-28, ABS-04).
- Architecture : `src/data/expoNotifications.ts` (seul importeur d'expo-notifications), `src/hooks/useReminders.ts` ; Tout effacer annule les relances.
- SECURITE : SEC-01 et SEC-03, liste des fonctions d'expo-notifications refusées ; SEC-12, test du texte des notifications (027).
- IDEES : la ligne « Tout effacer devra annuler les relances » passe à « faite (ticket 028) ».

Reports du 028a (2026-11-27) :

- CHANGELOG : Relance : adaptateur des notifications locales (date fixe, heures d'été et d'hiver, annulation, retrait des relances affichées), contrôle statique d'expo-notifications, séances lues avec leur état (F-06, EX-28, ABS-01, ABS-04, SEC-03).
- Architecture : `src/data/expoNotifications.ts`, seul importeur d'expo-notifications, en liste fermée (`scheduleReminders`, `cancelAllReminders`, `dismissStaleReminders`, `dismissAllReminders`, `reminderPermission`, `createReminderChannel`, `lastReminderTarget`, `onReminderTarget`) ; canal Android `relances` ; `sessionsRepo.reminderSessions` ; contrôle `src/staticChecksNotifications.test.ts` ; codes de journal `REMINDER_*_FAILED`, `REMINDER_DATE_INVALID` ; tests à l'heure de Paris, fixée par `jest.config.js` (CONVENTIONS §5).
- SECURITE : SEC-01 et SEC-03, vérification par `src/staticChecksNotifications.test.ts` (12 fonctions refusées partout, y compris par une clé en chaîne, `expo-application`, sous-chemins, `import *`, chemins vers `node_modules/`, imports relatifs hors de `src/` sauf JSON, `import N = require()`, `jest.requireActual`, liste fermée de l'adaptateur, types compris) ; SEC-12, la limite « le test ne lit pas `state` » est levée (`reminderSessions`), test EX-36 et EX-38 par le dépôt ajouté.
- Licences : `src/config/licences.json` gagne `expo-application` et `expo-notifications` (liés automatiquement). L'adaptateur n'est importé par aucun écran au 028a, donc absent du bundle : `abort-controller` et `event-target-shim` (importés au chargement d'expo-notifications par `DevicePushTokenAutoRegistration.fx.js`) entreront au 028b, qui régénère le registre.
- À faire au **028b** :
  - `src/hooks/useReminders.ts` et son test : lire créneaux, groupes, saison, `reminderSessions`, réglages et permission ; `plannedReminders` dans un `try` (délai invalide) ; `cancelAllReminders` puis `scheduleReminders(planned, new Date())` ; à l'ouverture, au retour au premier plan, à chaque `notifyDataChanged`, après un effacement ; la dernière reprogrammation gagne ; `REMINDERS_SCHEDULE_FAILED` sans bloquer.
  - créer le canal (`createReminderChannel(labels…)`) seulement relance activée et permission accordée ; libellé « Relances » dans `src/config/libelles/relance.ts`.
  - brancher `dismissStaleReminders` (liste à donner : voir « Questions pour le porteur ») ;
  - `src/app/_layout.tsx` : `lastReminderTarget` et `onReminderTarget` → `/appel?creneau=<slotId>&date=<date>` ; `null` → accueil ;
  - Tout effacer : `useErase.ts` (`cancelAllReminders` puis `dismissAllReminders` sous le même verrou, `ERASE_REMINDERS_FAILED`), `tout-effacer.tsx`, `useEraseAll.test.tsx` ;
  - `setNotificationHandler` (appli au premier plan) : selon la réponse du porteur ;
  - régénérer `src/config/licences.json` (abort-controller, event-target-shim, badgin s'il entre), reconstruire l'APK et l'auditer (B4) ;
  - ne programmer que si `createReminderChannel` a rendu `true` : sans canal, Android crée un canal de repli « Divers » ;
  - B1 : lire `lastReminderTarget()` une seule fois, au démarrage à froid ; une cible périmée pourrait sinon rouvrir le mauvais appel après Tout effacer ou une restauration ;
  - B2 : appeler `dismissAllReminders` après une restauration ;
  - B3 : ajouter aux limites de SEC-11 la copie des relances programmées dans les SharedPreferences d'Android (expo-notifications les y garde pour les reprogrammer après un redémarrage) ;
  - une relance retardée par Doze et ouverte pendant ce retard peut être supprimée par la reprogrammation : à traiter avec la liste donnée à `dismissStaleReminders` ;
  - essai « appui sur la notification » appli fermée (type de `slotId` au démarrage à froid).
- À faire au **029** : `requestPermissionsAsync` avec `ios: { allowAlert: true, allowSound: true, allowBadge: false }` ; quand la lecture de la permission échoue (`reminderPermission` rend `canAskAgain: false`), ne pas afficher « refusées dans les réglages ».
- Relevé du 2026-11-27 (028a), APK de production construit dans le worktree (`expo prebuild --platform android --no-install --clean`, `gradlew assembleRelease`, `TMPDIR` local) : `node scripts/audit-apk.js` « conforme (SEC-02) » ; permissions `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, INTERNET absente ; émulateur `emulator-5554` : désinstallé, installé, lancé, `DB_READY` (version 1), aucun plantage, aucune ligne Firebase, FCM ou datatransport dans `logcat --pid`. Le binaire n'exécute pas encore l'adaptateur (absent du bundle).
