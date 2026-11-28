# 026 — Relance : expo-notifications et garde-fous du binaire

Statut : fait (PR #88 vers `main` ; PR #69 dans le groupe) (dépendance et permissions acceptées par le porteur le 2026-11-27) · Jalon : 2 · Zone sensible : **oui** (dépendance et permissions : règle « aucun réseau », `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

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

- [ ] Réponse datée du porteur sur la dépendance et les permissions, notée dans `docs/ARCHITECTURE.md` (décisions du porteur) avant l'installation — décision datée écrite dans cette fiche avant l'installation, mais reportée dans `docs/ARCHITECTURE.md` seulement à l'intégration du lot J2-1 (fichier réservé à l'IA principale) : critère tenu en retard, noté dans l'architecture.
- [ ] APK de la CI : permissions **exactement** celles de `config/permissions-attendues.txt` (SEC-02) ; INTERNET absente (ABS-01, NF-03) — vérifié sur l'APK construit en local (`aapt2`, voir « À reporter ») ; APK de la CI non vérifié : `builds.yml` tourne sur la PR du jalon vers `main`.
- [x] Manifeste compilé sans composant Firebase ni datatransport ; `allowBackup=false` et aucun lien profond toujours vérifiés — APK local, audit conforme ; à revoir sur l'APK de la CI.
- [ ] Build iOS : aucune habilitation (`scripts/audit-ios.js` inchangé et vert) ; pas d'`UIBackgroundModes` — non vérifié : build iOS seulement sur la CI de la PR du jalon.
- [x] `npm audit` sans vulnérabilité haute ; versions exactes ; licences de toutes les nouvelles dépendances dans la liste acceptée (CONFORMITE §7) — `npm audit` : 0 vulnérabilité (2026-11-27, intégration) ; licences natives hors liste couvertes par la décision du porteur (8 bibliothèques).
- [x] L'appli démarre et fonctionne comme avant sur l'émulateur (aucun écran ne change) — émulateur seul ; APK avec expo-notifications jamais installé sur le téléphone (A55).

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
- Séance de lancement du lot J2-1 (2026-11-27), réponses du porteur :
  - licence : décision datée du porteur acceptant l'« Android Software Development Kit License » pour ces 8 bibliothèques natives seulement : play-services-base, play-services-basement, play-services-tasks, play-services-stats, play-services-cloud-messaging, firebase-iid-interop, firebase-measurement-connector, installreferrer ; inventaire nominatif dans CONFORMITE §7 et §8 ;
  - ShortcutBadger (`me.leolin:ShortcutBadger` 1.1.22, Apache-2.0) accepté ; ses 16 permissions de lanceurs ajoutées à `blockedPermissions` ; inventaire CONFORMITE §8 ; à reporter pour le 028 : `setBadgeCountAsync`, `get/requestExactAlarmPermissionsAsync` et tout import d'`expo-application` refusés par le contrôle statique ;
  - composants à retirer : les 8 noms complets de la pré-analyse ; audit APK aussi sur les `intent-filter` `com.google.firebase.MESSAGING_EVENT` et `com.google.android.c2dm.intent.RECEIVE` ; `plugins/withoutFirebase.test.js` (10 fichiers) ;
  - APK construit et audité en local (`aapt2`) avant la fusion dans le jalon, et démarrage vérifié sur l'émulateur (`adb logcat`, aucun plantage).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| `withoutFirebase` : composant déjà déclaré dans le manifeste source | ajouter une seconde déclaration ; marquer l'existante `tools:node="remove"` | marquer l'existante | deux déclarations du même nom font échouer la fusion du manifeste ; le résultat est le même appliqué deux fois | à relire |
| Autorité du fournisseur `FirebaseInitProvider` retiré | `${applicationId}.firebaseinitprovider` ; nom du paquet en dur | `${applicationId}.firebaseinitprovider` | même valeur que le manifeste de firebase-common, suit un changement de nom de paquet | à relire |
| Ordre des extensions dans `app.json` | expo-notifications avant les extensions du dépôt ; après | `expo-notifications` après `expo-font`, `withoutFirebase` en dernier | l'ordre est sans effet, puisque les composants viennent des AAR à la fusion Gradle ; l'audit du binaire sert de filet | à relire |
| Audit : portée du contrôle des `intent-filter` de messagerie | composants Google seulement ; tout composant | tout composant | le service d'expo-notifications (`expo.modules…`) déclare `MESSAGING_EVENT` : c'est lui qu'il faut attraper | à relire |
| Audit : lecture des attributs | motif n'importe où dans la ligne ; ligne `A:` seulement | ligne `A:` seulement (une fonction pour `scheme`, `name`, `exported`) | un attribut appartient au dernier élément ouvert ; tests existants inchangés et verts | à relire |
| ShortcutBadger : liste des 16 permissions | relevée dans la fiche ; dans le manifeste de l'AAR | relevée dans le manifeste de l'AAR `me.leolin:ShortcutBadger:1.1.22` : 16 `uses-permission` actives (bloquées), 4 en commentaire (`com.android.launcher.*`, sans effet) ; aucune ne reste dans l'APK | la fiche ne donnait pas la liste | à relire |

| Ordre de fusion du 026 et du 028 | 026 seul dans le jalon, puis 028 ; les deux ensemble | 026 fusionné dans le jalon avant le 028 ; ABS-07 (aucune dépendance avant la fonctionnalité) tenue au niveau du jalon, puisque la PR vers `main` contiendra le 028 | décision du porteur | décidée par le porteur le 2026-11-27 |
| Audit : `activity-alias` | nom seul ; nom et `android:targetActivity` | les deux, avec les mêmes refus (préfixes Firebase et datatransport, gms) | un alias peut ouvrir une activité refusée sous un autre nom | à relire |
| Audit : `android:name`, `android:exported` ou `android:targetActivity` en référence de ressource (`@0x…`) | lire la table des ressources ; refuser | refuser, avec un message clair (échec fermé) | la valeur réelle ne se lit pas dans `xmltree` ; aapt2 écrit ces attributs en littéral dans un binaire normal | à relire |
| Audit : composants `com.google.android.gms.*` | refuser seulement les exportés ; liste figée versionnée | liste figée `config/composants-google-attendus.txt` (`GoogleApiActivity` seule) ; tout autre composant gms échoue, exporté ou non, et un composant de la liste exporté aussi | même principe que `config/permissions-attendues.txt` : un ajout se voit au diff | à relire |
| Taille du ticket | découper ; garder | garder : 11 fichiers avec `config/composants-google-attendus.txt` (correction de revue), au-delà des 10 prévus | ajout d'une liste de 8 lignes, demandé à l'intégration ; rien d'autre ne change | à relire |
| Dépendance npm transitive `event-target-shim` 5.0.1 (MIT, tirée par abort-controller) | — | notée ici ; licence dans la liste acceptée | absente du relevé de la fiche | à relire |

## Questions pour le porteur

Aucune. Licences relevées sur le binaire : toutes dans la liste du §7 de CONFORMITE ou parmi les 8 exceptions.

## À reporter

- CHANGELOG : Permissions : notifications (demandées seulement à l'activation de la relance) et redémarrage de l'appareil (relances reprogrammées) ; aucune connexion réseau, INTERNET toujours absente (F-06, ABS-01, ABS-07).
- Architecture : §2 expo-notifications installé (version exacte ; dépendances npm expo-application 58.1.2, badgin, abort-controller 3.0.0, event-target-shim 5.0.1, toutes MIT) ; §6 `blockedPermissions` étendue, extension `plugins/withoutFirebase.js`, `config/permissions-attendues.txt` à trois lignes, `config/composants-google-attendus.txt` (composants gms permis : `GoogleApiActivity`).
- SECURITE : SEC-02, l'audit refuse aussi tout composant (`activity`, `activity-alias`, `service`, `receiver`, `provider`) `com.google.firebase.*` ou `com.google.android.datatransport.*`, tout composant `com.google.android.gms.*` exporté, et tout `intent-filter` `com.google.firebase.MESSAGING_EVENT` ou `com.google.android.c2dm.intent.RECEIVE` ; la cible d'un `activity-alias` passe les mêmes refus ; une référence de ressource pour `name`, `exported` ou `targetActivity` est refusée ; les composants gms sont limités à `config/composants-google-attendus.txt`.
- Pour le 028 (décision du porteur du 2026-11-27) : le contrôle statique refuse `getExpoPushTokenAsync`, `getDevicePushTokenAsync`, `subscribeToTopicAsync`, `unsubscribeFromTopicAsync`, `setAutoServerRegistrationEnabledAsync`, `registerTaskAsync`, `setBadgeCountAsync`, `getExactAlarmPermissionsAsync`/`requestExactAlarmPermissionsAsync`, et tout import d'`expo-application` ; régénérer `src/config/licences.json` quand le paquet entre dans le bundle.
- Relevé du 2026-11-27, APK de production construit en local (`expo prebuild --clean`, `gradlew assembleRelease`), `aapt2` 37.0.0 :
  - `node scripts/audit-apk.js` : « Audit du binaire : conforme (SEC-02) ».
  - `aapt2 dump permissions` : `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `com.jitavision.kila.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (déclarée et utilisée). INTERNET absente.
  - Composants du manifeste compilé (`aapt2 dump xmltree`) : activité `com.jitavision.kila.MainActivity` (exportée, lanceur) ; fournisseurs `expo.modules.filesystem.FileSystemFileProvider`, `expo.modules.sharing.SharingFileProvider`, `androidx.startup.InitializationProvider` (non exportés) ; récepteur `expo.modules.notifications.service.NotificationsService` (non exporté : `NOTIFICATION_EVENT`, `BOOT_COMPLETED`, `REBOOT`, `QUICKBOOT_POWERON`, `MY_PACKAGE_REPLACED`) ; activités `expo.modules.notifications.service.NotificationForwarderActivity` et `com.google.android.gms.common.api.GoogleApiActivity` (non exportées) ; récepteur `androidx.profileinstaller.ProfileInstallReceiver` (exporté, déjà présent avant). Aucun composant Firebase ni datatransport.
  - Émulateur `emulator-5554` : installé, lancé, `DB_READY` (version 1) dans `adb logcat`, aucun plantage, aucune ligne Firebase, FCM ou datatransport dans le journal du processus.
  - Après les corrections de revue (audit durci, branche du jalon fusionnée avec le 021) : APK reconstruit, audit conforme, permissions inchangées ; `pm clear` puis lancement sur l'émulateur : `DB_READY` (version 1), écran **Bienvenue** affiché, aucun plantage, aucune ligne Firebase, FCM ou datatransport.
