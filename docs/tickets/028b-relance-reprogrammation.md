# 028b — Relance : programmation

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (notifications, ABS-01 : liste fermée d'expo-notifications élargie à `setNotificationHandler` ; ABS-04) · Trivial : non

Dépend de : 028a (adaptateur `src/data/expoNotifications.ts`, `sessionsRepo.reminderSessions`, contrôle statique), 027 (calcul et réglages) ; pas du 028c, qui tourne en parallèle · Fichiers touchés : `src/hooks/useReminders.ts` et `src/hooks/useReminders.test.tsx` (nouveaux), `src/domain/reminders.ts` et son test (fonction « séances encore dues »), `src/config/libelles/relance.ts` (`channel`), `src/data/expoNotifications.ts` (`setNotificationHandler`), `src/__fixtures__/expoModules.ts` (faux module), `src/staticChecksNotifications.test.ts` (liste fermée), `src/app/_layout.tsx` (montage), `src/config/licences.json` — environ 12 fichiers avec la fiche ; APK reconstruit et audité. Seul fichier commun avec le 028c : `_layout.tsx` (un petit ajout chacun).

Créé le 2026-11-27 à la séance de lancement du lot J2-3 : le 028 est découpé par le porteur en 028a (adaptateur et garde-fous, PR #79) et 028b. Redécoupé le 2026-11-27 à la séance de lancement du lot J2-4 (plus de 10 fichiers en zone sensible) : 028b (programmation, ce ticket) et 028c (appui sur la notification, Tout effacer, restauration). Le 029 ne dépend que du 028a.

## Contexte

Le 028a a posé l'adaptateur des notifications locales, sans qu'aucun écran ne l'appelle. Ce ticket le branche : tout annuler puis reprogrammer à l'ouverture, au retour au premier plan et après chaque écriture (ADR-007), et retirer les relances affichées qui ne sont plus dues. L'appui sur la notification et l'effacement sont au 028c.

## À lire

- `docs/tickets/028-relance-programmation.md` (plan validé, décisions du 028a, « Reports du 028a ») ; ADR-007 ; `docs/ARCHITECTURE.md` §5 ; `docs/SECURITE.md` SEC-01, SEC-03, SEC-12
- `src/data/expoNotifications.ts` (`scheduleReminders`, `cancelAllReminders`, `dismissStaleReminders`, `reminderPermission`, `createReminderChannel`) et `src/staticChecksNotifications.test.ts`
- `src/domain/reminders.ts` (`plannedReminders`, 027), `src/data/sessionsRepo.ts` (`reminderSessions`)
- `src/hooks/dataChanged.ts` (`notifyDataChanged`, `useErasedCount`), `src/hooks/fileLock.ts` (`useFileLock`), `src/hooks/useLocalNow.ts`, `src/app/_layout.tsx`
- `docs/tickets/028c-relance-appui-effacement.md` (ticket parallèle, même `_layout.tsx`)

## Ce qui change

- `src/hooks/useReminders.ts` : lit créneaux, groupes, saison, `reminderSessions`, réglages et permission ; `plannedReminders` dans un `try` (délai invalide) ; `cancelAllReminders` puis `scheduleReminders(planned, new Date())` ; déclenché à l'ouverture, au retour au premier plan, à chaque `notifyDataChanged` et après un effacement ; les reprogrammations passent une par une et la dernière demande gagne ; reportées tant que le verrou de `useFileLock` est pris (effacement, restauration) ; échec journalisé par `REMINDERS_SCHEDULE_FAILED`, sans nom (ABS-04) et sans bloquer l'appli. Relance désactivée ou permission non accordée : tout est annulé, rien n'est programmé.
- Canal Android : `createReminderChannel` avec le libellé « Relances » (`channel`, première clé de `reminder` dans `relance.ts`), seulement relance activée et permission accordée, importance haute ; on ne programme que s'il a rendu `true` (sans canal, Android crée un canal de repli « Divers »).
- `src/domain/reminders.ts` : fonction pure « séances encore dues » (occurrences récentes sans séance enregistrée, annulée ou non planifiée : même règle qu'EX-17, EX-36, EX-38), avec son test ; donnée à `dismissStaleReminders`. Une relance affichée est retirée si l'appel est fait, la séance annulée, le créneau ou le groupe supprimé, **tous les groupes du créneau archivés, ou la séance hors de la saison active** (même règle que `plannedReminders`).
- `src/data/expoNotifications.ts` : `setNotificationHandler` (fonction en fin de fichier) : appli au premier plan, bannière, liste et son, `shouldSetBadge: false`, sans journaliser la notification reçue ; même placement dans `src/__fixtures__/expoModules.ts` ; `src/staticChecksNotifications.test.ts` mis à jour (liste fermée, exemple refusé remplacé). Imports dans l'ordre alphabétique.
- `src/app/_layout.tsx` : monte `useReminders` une fois la base prête (un seul petit ajout ; le 028c y ajoute la lecture de la cible).
- `src/config/licences.json` régénéré par `scripts/licences.js` (EX-42) : `abort-controller`, `event-target-shim` (et `badgin` s'il entre dans le bundle).
- APK reconstruit et audité (`node scripts/audit-apk.js`) : aucune ligne Firebase ; essai en mode avion.

## Critères d'acceptation

- [ ] EX-28 : relance activée, créneau dans 1 h → une notification programmée à début + délai (adaptateur simulé, puis téléphone).
- [ ] Enregistrer l'appel annule la relance de cette séance et retire la relance affichée ; modifier ou supprimer un créneau, un groupe, la saison, la reprogramme.
- [ ] Une relance affichée dont l'appel manque toujours reste affichée après une ouverture ou un retour au premier plan ; celle dont tous les groupes sont archivés, ou hors de la saison active, est retirée.
- [ ] Relance désactivée ou permission refusée : rien n'est programmé, tout est annulé ; le canal n'est créé qu'avec la relance activée et la permission accordée ; création du canal en échec : rien n'est programmé.
- [ ] Reprogrammations une par une, la dernière demande gagne ; aucune pendant un effacement ou une restauration (verrou), reprise ensuite.
- [ ] Appli au premier plan : la relance s'affiche en bannière, dans la liste, avec le son, sans pastille ; la notification reçue n'est pas journalisée.
- [ ] SEC-01 et SEC-03 : liste fermée élargie à `setNotificationHandler` seulement, contrôle vu en échec sur un exemple.
- [ ] ABS-04 : aucun nom dans le journal ni dans la notification.
- [ ] B4 : `licences.json` régénéré ; APK reconstruit et audité, aucune ligne Firebase ; essai en mode avion.

## Tests attendus

- `src/hooks/useReminders.test.tsx` : adaptateur simulé (`src/__fixtures__/expoModules.ts`) : ouverture, écriture, désactivation, permission refusée, canal en échec, échec de programmation, délai invalide, courses entre deux reprogrammations, report pendant le verrou, relance affichée encore due gardée.
- Test de `src/domain/reminders.ts` : séances encore dues (appel fait, annulée, non planifiée, groupes archivés, hors saison active, retard de Doze).
- `src/staticChecksNotifications.test.ts` : `setNotificationHandler` permis dans l'adaptateur seulement.
- À la main (téléphone, prétest du jalon) : relance reçue écran verrouillé, sans nom de membre ; appli ouverte ; relance reçue après un redémarrage du téléphone ; mode avion ; APK reconstruit et audité (B4).

## Hors périmètre

- Appui sur la notification, Tout effacer, restauration (028c).
- Écrans de réglage et demande de permission (029).
- Alarme exacte (refusée sauf décision du porteur, ticket 026).

## Questions prévues

Réponses du porteur du 2026-11-27 (questions du 028a), déjà tranchées :

- `setNotificationHandler` ajouté à la liste fermée : bannière et son quand l'appli est ouverte, sans pastille.
- Canal « Relances » en importance haute.
- Relances affichées : on retire celles dont l'appel est fait (séance enregistrée), annulée, ou dont le créneau ou le groupe a été supprimé ; les autres restent.

Séance de lancement du lot J2-4 (2026-11-27), réponses du porteur :

- Découpage : 028b (programmation, ce ticket) et 028c (appui et effacement), en parallèle ; seul fichier commun `_layout.tsx`.
- **Plan validé par le porteur le 2026-11-27** (zone sensible) : reprogrammations une par une, la dernière demande gagne, reportées pendant un effacement ou une restauration (verrou de `useFileLock`) ; canal créé seulement relance activée et permission accordée, sinon rien n'est programmé et tout est annulé ; création du canal en échec : rien n'est programmé ; `setNotificationHandler` : bannière, liste et son, `shouldSetBadge: false`, sans journaliser la notification reçue ; APK reconstruit et audité, aucune ligne Firebase, essai en mode avion.
- Relances affichées : on retire aussi celles dont tous les groupes du créneau sont archivés, ou dont la séance n'appartient plus à la saison active (même règle que `plannedReminders`).
- Placement pour éviter les conflits avec le 029 : `channel` en première clé de `reminder` dans `relance.ts` ; fonction en fin de `expoNotifications.ts` et du faux module ; imports dans l'ordre alphabétique.

Reports du 028a (2026-11-27), part du 028b :

- créer le canal avant de programmer, et ne programmer que si `createReminderChannel` a rendu `true` ;
- B4 : régénérer `src/config/licences.json`, reconstruire l'APK et l'auditer (`node scripts/audit-apk.js`) ;
- Doze : une relance retardée par Doze et ouverte pendant ce retard ne doit pas être supprimée par la reprogrammation ; la liste des séances encore dues (ci-dessus) le règle, à tester ;
- registre des licences : `abort-controller` et `event-target-shim` entrent dans le bundle quand l'adaptateur est importé par un écran.

B1 (cible lue au démarrage à froid), B2 (restauration), B3 (SharedPreferences, SEC-11) et l'appui avec l'appli fermée vont au 028c.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Fenêtre des « séances encore dues » | 7 derniers jours ; toute la saison jusqu'à aujourd'hui | `dueSessions` : occurrences de la saison active, depuis la date d'effet de l'horaire, jusqu'à aujourd'hui inclus | règle du porteur (relance gardée tant que la séance est due) ; même début que `missingRollCalls` (début de saison), mais la fenêtre n'est pas la même : `dueSessions` garde les séances préparées (EX-36) et celles du jour pas encore finies, que `missingRollCalls` écarte ; raison corrigée après revue (elle disait « même fenêtre ») | à relire |
| Relances affichées quand la relance est désactivée ou la permission refusée | toutes les retirer ; même règle (séances encore dues) | même règle : seules celles dont la séance n'est plus due sont retirées | la décision du porteur porte sur la séance, pas sur le réglage ; les programmées, elles, sont toutes annulées | en attente du porteur |
| Lecture des données en échec | tout annuler ; ne rien toucher | rien n'est annulé ni retiré, `REMINDERS_SCHEDULE_FAILED` ; une passe repart au prochain premier plan ou à la prochaine écriture | ne pas effacer des relances valides sur une panne de lecture. La revue relève une tension avec « relance désactivée → tout annulé » : une relance désactivée pendant une panne de lecture reste programmée jusqu'à la passe suivante | en attente du porteur |
| Délai invalide (`plannedReminders` lève) | ne rien faire ; annuler et ne rien programmer | tout est annulé, les affichées périmées retirées, rien n'est programmé, `REMINDERS_SCHEDULE_FAILED` | le réglage est déjà normalisé par `settingsRepo` : cas théorique, choix sûr | à relire |
| Annulation unitaire en échec | s'arrêter ; continuer | continuer, code `REMINDER_CANCEL_FAILED` ; la relance reste hors du plan, donc son annulation est rejouée à la passe suivante | une panne d'annulation ne doit pas priver des autres relances ; raison corrigée (elle invoquait le remplacement par identifiant, qui ne vaut que pour une relance du plan) | à relire |
| Verrou pris pendant une passe | vérifié après la lecture seulement ; relu avant chaque écriture native | `fileLock.holder()`, `erasedCount()` et la base courante relus avant le canal, chaque annulation, le retrait des affichées et chaque programmation (`scheduleReminders` reçoit `keepGoing`) ; s'ils ont changé, la passe s'arrête, `pending` passe à vrai et elle repart à la libération | un effacement ou une restauration peut commencer à tout moment de la passe ; contradicteur | changée après contradiction |
| Canal sans relance à programmer | le créer quand même ; ne pas le créer | permission lue dès que la relance est activée (elle décide des relances gardées) ; canal créé seulement s'il y a une relance à programmer | moins d'appels natifs ; le canal est créé au premier passage qui programme | à relire |
| Où poser `setNotificationHandler` | haut du module `_layout.tsx` ; effet de `useReminders` | `showRemindersInForeground` (adaptateur), appelé une fois au montage de `useReminders`, sans attendre la base | `_layout.tsx` reste à un seul petit ajout (028c) ; l'affichage ne dépend pas des données | à relire |
| Faux module : relevé du gestionnaire | champ dans `state` ; `jest.spyOn` | `setNotificationHandler` du faux module ne fait que `guard`, le test l'observe par `jest.spyOn` | `state` n'est pas touché : moins de conflits avec le 029 | à relire |
| Tests de `dueSessions` | dans `reminders.test.ts` ; nouveau fichier | nouveau `src/domain/remindersDue.test.ts` | `reminders.test.ts` fait 251 lignes (limite 300) | à relire |
| Exemple refusé du contrôle | — | `setNotificationHandler` remplacé par `setNotificationCategoryAsync` ; contrôle vu en échec sans l'ajout à la liste | demandé par la fiche | à relire |
| Annulation des relances | tout annuler à chaque passe ; n'annuler que celles qui ne sont plus prévues | `useReminders` lit les relances programmées (`scheduledReminderIds`, `relance-…` seulement) et n'annule une par une (`cancelReminder`) que celles absentes des relances gardées : le plan, plus les séances encore dues (une relance due dont l'heure vient de passer ou tombe dans la minute, pas encore délivrée, n'est pas annulée : Android la délivre) ; relance désactivée, délai invalide, permission refusée ou canal en échec : aucune n'est gardée ; un identifiant déjà programmé est remplacé. `getAllScheduledNotificationsAsync` et `cancelScheduledNotificationAsync` entrent dans la liste fermée (SEC-03), absents de `REFUSED`. Tout effacer et la restauration (028c) gardent `cancelAllReminders` | fonctions locales, sans réseau | décidée par le porteur le 2026-11-27 |
| Base effacée, nouvelle base qui ne s'ouvre pas (M1) | rien ; tout annuler et retirer | `useReminders` lit `useDatabaseState` : à `erased` ou `restoreFailed`, `cancelAllReminders` puis `dismissAllReminders` | des relances nommant un groupe ne doivent pas survivre à un effacement (SEC-11) | décidée par le porteur le 2026-11-27 |
| Listage des relances en échec | ne rien annuler ; tout annuler quand rien n'est gardé | si `scheduledReminderIds` rend null et qu'aucune relance n'est gardée (relance désactivée, permission refusée, délai invalide, canal en échec), `cancelAllReminders` | sinon une relance désactivée continuerait de partir ; revue ciblée | à relire |
| Démontage | rien ; remettre à zéro | `currentDb = null` au nettoyage ; `resetRemindersForTests` (modèle `resetDatabaseForTests`) | plus aucune passe sur une base démontée ; tests indépendants | à relire |
| Reprise du verrou (F3) | abonnement direct aux écouteurs de `fileLock` ; `useFileLock` | `useFileLock` gardé ; abonnement direct reporté (voir « À reporter ») | il faut exporter l'abonnement de `src/hooks/fileLock.ts`, un fichier de plus au-delà de la limite de 12 | à relire |
| `expoNotifications.ts` au-delà de 300 lignes après la fusion du 029 et du 028c | raccourcir ; sortir la conversion des dates | `firstOccurrence` et `toLocalDate` passent dans `src/data/localDates.ts` (sans dépendance native), réexportés par l'adaptateur pour ses tests | règle des 300 lignes ; le contrôle statique est inchangé | à relire |
| Garde-fous dans un second fichier de test | un fichier ; deux | `src/hooks/useRemindersGuards.test.tsx` (base pas prête, course, verrou, effacement, base effacée, démontage) | 300 lignes au plus | à relire |

## Questions pour le porteur

- **Taille du 028b (ticket en attente de la réponse).** Après les corrections de revue, le ticket touche 13 fichiers avec la fiche (au lieu d'environ 12 prévus) : `src/hooks/useRemindersGuards.test.tsx` (le test du hook dépassait 300 lignes) et `src/data/localDates.ts` (l'adaptateur dépassait 300 lignes après la fusion du 029 et du 028c). Option A (recommandée) : garder le ticket entier, comme pour le 028a. Option B : sortir les garde-fous dans un ticket à part. Rien d'autre n'attend cette réponse.

## À reporter

- CHANGELOG : Relance : notifications locales programmées pour les 7 jours à venir, annulées dès que l'appel est enregistré (F-06, EX-28, ABS-04).
- Architecture : `src/hooks/useReminders.ts`, monté par `src/app/_layout.tsx` (recalcule le plan à l'ouverture, au retour au premier plan et à chaque `notifyDataChanged` ; n'annule une par une que les relances programmées qui ne sont plus gardées, plan et séances encore dues ; une passe à la fois, la dernière demande gagne ; verrou des fichiers, compte des effacements et base relus avant chaque écriture native ; rien tant que la base n'est pas prête ; base `erased` ou `restoreFailed` : tout annulé et retiré ; code `REMINDERS_SCHEDULE_FAILED`) ; `dueSessions` (« séances encore dues ») dans `src/domain/reminders.ts` ; adaptateur : `showRemindersInForeground` (`setNotificationHandler`, code `REMINDER_HANDLER_FAILED`), `scheduledReminderIds` (`getAllScheduledNotificationsAsync`, code `REMINDER_LIST_FAILED`), `cancelReminder` (`cancelScheduledNotificationAsync`, code `REMINDER_CANCEL_FAILED`), `scheduleReminders(planned, now, keepGoing)` ; conversion des dates dans `src/data/localDates.ts` ; libellé du canal `labels.reminder.channel`.
- SECURITE : SEC-03, liste fermée élargie à `setNotificationHandler`, `getAllScheduledNotificationsAsync` et `cancelScheduledNotificationAsync` (décisions du porteur du 2026-11-27 ; contrôle vu en échec sans les ajouts ; exemples refusés remplacés par `setNotificationCategoryAsync` et `getNextTriggerDateAsync` ; test : aucun nom à la fois permis et refusé). SEC-11, limites restantes : expo-notifications garde les relances programmées dans les SharedPreferences d'Android jusqu'à leur annulation ; une relance déjà délivrée reste dans le centre de notifications tant que l'appli ne repasse pas (ouverture, premier plan) ; une base effacée qui ne se rouvre pas annule et retire tout, mais un échec natif de ce nettoyage n'est que journalisé.
- Licences : `src/config/licences.json` régénéré, gagne `abort-controller` 3.0.0 et `event-target-shim` 5.0.1 (MIT) ; `badgin` n'entre pas dans le bundle.
- Relevé du 2026-11-27 (028b), APK de production construit dans le worktree (`expo prebuild --platform android --no-install --clean`, `gradlew assembleRelease`, `TMPDIR` local) : `node scripts/audit-apk.js` « conforme (SEC-02) », permissions `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, INTERNET absente ; l'adaptateur est dans le bundle (`REMINDERS_SCHEDULE_FAILED` présent) ; émulateur `emulator-5554` : installé par-dessus, lancé, `DB_READY` (version 1), aucun plantage, aucune ligne Firebase, FCM ni datatransport (`logcat --pid` et journal complet). Non vérifié : relance activée sur l'appareil (l'écran de réglage vient au 029), mode avion, téléphone réel, iOS.
- Relevé après les corrections de revue et la fusion du 029 et du 028c (2026-11-27) : APK de production reconstruit, `node scripts/audit-apk.js` « conforme (SEC-02) », mêmes trois permissions, INTERNET absente ; `REMINDER_LIST_FAILED` présent dans le bundle ; émulateur : lancé, `DB_READY`, aucun plantage, aucune ligne Firebase, FCM ni datatransport. Non vérifié : relance réellement programmée puis délivrée, annulation ciblée sur l'appareil, mode avion, téléphone réel, iOS.
- Taille : 13 fichiers avec la fiche après les corrections de revue (voir « Questions pour le porteur »).
- F3 : `useReminders` reprend la passe reportée par `useFileLock` (état React) ; un verrou pris puis rendu dans le même rendu ne relance pas la passe avant la demande suivante. À faire : exporter l'abonnement de `src/hooks/fileLock.ts` et s'y abonner directement.
- Verrou des fichiers : ajouter un compteur d'époque dans `src/hooks/fileLock.ts` ; une restauration sur la même base (même objet `Db`, verrou pris puis rendu entre deux relectures) n'est vue que par `erasedCount` et le verrou, pas par la base courante.
- Passe bloquée : aucune limite de temps quand une promesse native ne se résout jamais ; `running` reste vrai et plus aucune passe ne part avant un redémarrage de l'appli. À traiter par un délai maximal par appel natif.
- Conflits attendus avec le 028c, réglés à la fusion du jalon : `src/app/_layout.tsx` (garder `useReminders()` et `useReminderTap()`) ; `jest.setup.js` : une seule imitation globale d'expo-notifications (`fakeNotifications`, qui porte `setNotificationHandler`, `getAllScheduledNotificationsAsync` et `cancelScheduledNotificationAsync`) ; `expoNotifications.ts` : refus des réponses de type `push` dans `targetOfResponse` (028c) gardé avec les ajouts du 028b.
