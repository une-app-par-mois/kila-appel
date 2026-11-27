# 026 — Relance : expo-notifications et garde-fous du binaire

Statut : à faire (dépendance et permissions acceptées par le porteur le 2026-11-27) · Jalon : 2 · Zone sensible : **oui** (dépendance et permissions : règle « aucun réseau », `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `package.json`, `package-lock.json`, `app.json`, `plugins/withoutFirebase.js` (nouveau), `config/permissions-attendues.txt`, `scripts/audit-apk.js`, `scripts/audit-apk.test.js`, `README.md` (permissions), `docs/CONFORMITE.md` (§3 permissions, §8 inventaire natif) — 9 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

F-06 a besoin de notifications locales (ADR-007). expo-notifications est inscrit dans `docs/ARCHITECTURE.md` §2 (`~58.1.9`, « installé avec F-06 »), mais `CLAUDE.md` exige de proposer toute dépendance au porteur, et l'examen du paquet (2026-11-27) montre qu'il embarque **Firebase Cloud Messaging** sur Android, avec des bibliothèques capables d'émettre du réseau et des permissions en plus. Ce ticket installe la dépendance et verrouille le binaire ; le code qui programme vient au 028.

Relevé du 2026-11-27 (lecture seule, paquets npm et Maven) :

- `expo-notifications` 58.1.10 (dernière, dans la plage `~58.1.9` du SDK 58.0.26), MIT, publiée le 2026-11-26. Dépendances npm : `expo-application` 58.1.2 (MIT, 2026-11-25, **nouvelle**), `badgin` ^1.1.5 (MIT, dernière publication 2022, sert au web), `abort-controller` 3.0.0 (MIT), `@expo/image-utils` (déjà présente, outil de build), `expo-constants` (déjà présente).
- Manifeste d'expo-notifications : `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, un service `ExpoFirebaseMessagingService` (non exporté).
- Android : dépendance Gradle `com.google.firebase:firebase-messaging:25.0.1` (Apache-2.0), qui tire `firebase-installations`, `firebase-datatransport` (`transport-backend-cct` : envoi de mesures), `play-services-cloud-messaging`, `firebase-common` (fournisseur `FirebaseInitProvider` lancé au démarrage). Leurs manifestes ajoutent `INTERNET` (déjà bloquée), `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE`, et un récepteur **exporté** `FirebaseInstanceIdReceiver` (protégé par `c2dm.permission.SEND`, réservée aux services Google).
- `expo-application` tire `com.android.installreferrer:installreferrer:2.2` : permission `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`.
- Sans fichier `google-services.json`, Firebase ne s'initialise pas (aucun identifiant de projet) : aucun jeton, aucun envoi. Programmation locale : `AlarmManager` ; sans `SCHEDULE_EXACT_ALARM`, alarme inexacte (`setAndAllowWhileIdle`, retard possible de quelques minutes en veille).
- iOS : aucune dépendance Firebase ; option de l'extension `enableRemoteNotifications: false` pour ne pas ajouter l'habilitation `aps-environment` ; `PrivacyInfo.xcprivacy` : aucune donnée collectée, aucun suivi.
- Code JavaScript capable de réseau : `getExpoPushTokenAsync` (`fetch` vers Expo), l'enregistrement automatique du jeton (`setAutoServerRegistrationEnabledAsync`, effet au chargement seulement s'il a été activé), `subscribeToTopicAsync` (Firebase).

## À lire

- `CLAUDE.md` : ABS-01, ABS-04, ABS-07, ABS-08 ; « Avant d'ajouter une dépendance »
- ADR-007 ; `docs/ARCHITECTURE.md` §2, §5, §6 ; `docs/SECURITE.md` SEC-01 à SEC-03 ; `docs/CONFORMITE.md` §3, §4, §7, §8
- `app.json`, `plugins/withoutUrlScheme.js` (modèle d'extension), `scripts/audit-apk.js`, `scripts/audit-ios.js`, `config/permissions-attendues.txt`, `README.md` « Permissions demandées »
- Précédents : expo-font (003), react-native-svg (006b), react-native-worklets (008b), expo-file-system (014b), acceptés avec un contrôle de leurs fonctions réseau

## Ce qui change (plan validé par le porteur le 2026-11-27)

- `npx expo install expo-notifications` (version exacte, CONV-31) ; aucune autre dépendance directe.
- `app.json` : extension `["expo-notifications", { "enableRemoteNotifications": false }]` (pas d'`aps-environment`) ; `blockedPermissions` reçoit `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE`, `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE` ; ni `SCHEDULE_EXACT_ALARM` ni `USE_EXACT_ALARM`.
- `plugins/withoutFirebase.js` : retire du manifeste fusionné (`tools:node="remove"`) les composants Firebase et datatransport : `ExpoFirebaseMessagingService`, `FirebaseMessagingService`, `FirebaseInstanceIdReceiver`, `FirebaseInitProvider`, `ComponentDiscoveryService`, `TransportBackendDiscovery`, `JobInfoSchedulerService`, `AlarmManagerSchedulerBroadcastReceiver`.
- `config/permissions-attendues.txt` : `POST_NOTIFICATIONS` (demandée à l'activation de la relance, Android 13 et plus) et `RECEIVE_BOOT_COMPLETED` (reprogrammation après un redémarrage), chacune commentée.
- `scripts/audit-apk.js` : échoue si un composant `com.google.firebase.*`, `com.google.android.gms.*` exporté ou `com.google.android.datatransport.*` reste dans le manifeste compilé ; test d'un manifeste fictif qui en contient.
- `README.md` : les deux permissions et leur raison ; `docs/CONFORMITE.md` : notifications locales dans §3 (permissions) et bibliothèques natives Firebase (Apache-2.0) dans l'inventaire du §8.
- Registre des licences (`src/config/licences.json`, EX-42) : régénéré au 028, quand le paquet entre dans le bundle JavaScript (il n'y est pas tant qu'aucun fichier ne l'importe).

## Critères d'acceptation

- [ ] Réponse datée du porteur sur la dépendance et les permissions, notée dans `docs/ARCHITECTURE.md` (décisions du porteur) avant l'installation.
- [ ] APK de la CI : permissions **exactement** celles de `config/permissions-attendues.txt` (SEC-02) ; INTERNET absente (ABS-01, NF-03).
- [ ] Manifeste compilé sans composant Firebase ni datatransport ; `allowBackup=false` et aucun lien profond toujours vérifiés.
- [ ] Build iOS : aucune habilitation (`scripts/audit-ios.js` inchangé et vert) ; pas d'`UIBackgroundModes`.
- [ ] `npm audit` sans vulnérabilité haute ; versions exactes ; licences de toutes les nouvelles dépendances dans la liste acceptée (CONFORMITE §7).
- [ ] L'appli démarre et fonctionne comme avant sur l'émulateur (aucun écran ne change).

## Tests attendus

- `scripts/audit-apk.test.js` : composant Firebase présent → échec ; permission inattendue → échec.
- CI de la PR du jalon : `builds.yml` (audits Android et iOS). Avant : build local de l'APK et `aapt2 dump permissions` / `aapt2 dump xmltree` lus à la main, résultat collé dans la PR.
- À la main : démarrage sur l'émulateur ; `adb logcat` sans tentative de connexion de Firebase.

## Hors périmètre

- Programmation des relances et adaptateur (028) ; écrans (029).
- Politique de confidentialité (jalon 6) : la mention des notifications locales y sera reprise (ABS-08, noté dans CONFORMITE).

## Questions prévues

Toutes réservées au porteur (nouvelle dépendance, ABS-01, ABS-07, ABS-08, zone sensible) : voir les questions du découpage (dépendance, permissions Android, iOS, déclarations des stores, plan).

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.
- **Décision datée du porteur sur ABS-01 (2026-11-27)** : expo-notifications 58.1.10 accepté, verrouillé selon l'option A (extension `enableRemoteNotifications: false`, `plugins/withoutFirebase.js`, `blockedPermissions` étendue, audit de l'APK qui refuse tout composant Firebase ou datatransport, un seul fichier importe le paquet), avec ses dépendances expo-application, badgin et abort-controller.
- Permissions Android gardées : `POST_NOTIFICATIONS` et `RECEIVE_BOOT_COMPLETED`, sans alarme exacte (ni `SCHEDULE_EXACT_ALARM` ni `USE_EXACT_ALARM`) ; toutes les autres bloquées (`ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE`, `BIND_GET_INSTALL_REFERRER_SERVICE`, en plus de celles déjà bloquées) ; `config/permissions-attendues.txt` et l'audit de l'APK mis à jour.
- iOS : alerte et son, sans pastille, sans habilitation.
- Stores : « aucune donnée collectée » gardé ; CONFORMITE §3 et §8 complétés par ce ticket ; risque noté : l'index des SDK de Play peut repérer Firebase Messaging dans le binaire.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Permissions : notifications (demandées seulement à l'activation de la relance) et redémarrage de l'appareil (relances reprogrammées) ; aucune connexion réseau, INTERNET toujours absente (F-06, ABS-01, ABS-07).
- Architecture : §2 expo-notifications installé (version exacte) ; §6 `blockedPermissions` étendue, extension `plugins/withoutFirebase.js`, `config/permissions-attendues.txt` à trois lignes.
- SECURITE : SEC-02, l'audit refuse aussi tout composant Firebase ou datatransport.
