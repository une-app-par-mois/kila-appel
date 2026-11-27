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
| Fenêtre des « séances encore dues » | 7 derniers jours ; toute la saison jusqu'à aujourd'hui | `dueSessions` : occurrences de la saison active, depuis la date d'effet de l'horaire, jusqu'à aujourd'hui inclus | même fenêtre que les appels manquants de l'accueil (`missingRollCalls`, EX-17) : une relance affichée reste tant que l'appel manque à l'accueil ; calcul léger | à relire |
| Relances affichées quand la relance est désactivée ou la permission refusée | toutes les retirer ; même règle (séances encore dues) | même règle : seules celles dont la séance n'est plus due sont retirées | la décision du porteur porte sur la séance, pas sur le réglage ; les programmées, elles, sont toutes annulées | en attente du porteur |
| Lecture des données en échec | tout annuler ; ne rien toucher | rien n'est annulé ni retiré, `REMINDERS_SCHEDULE_FAILED`, la demande suivante réessaie | ne pas effacer des relances valides sur une panne de lecture ; sans bloquer l'appli | à relire |
| Délai invalide (`plannedReminders` lève) | ne rien faire ; annuler et ne rien programmer | tout est annulé, les affichées périmées retirées, rien n'est programmé, `REMINDERS_SCHEDULE_FAILED` | le réglage est déjà normalisé par `settingsRepo` : cas théorique, choix sûr | à relire |
| Annulation en échec | s'arrêter ; continuer | continuer (l'identifiant `relance-<slotId>-<date>` remplace au lieu de doubler) | une panne d'annulation ne doit pas priver des relances dues | à relire |
| Verrou pris pendant un passage | finir ; repasser | vérifié après la lecture : si pris, rien n'est écrit et le passage est refait à la libération | un effacement ou une restauration peut commencer pendant la lecture | à relire |
| Canal sans relance à programmer | le créer quand même ; ne pas le créer | ni permission lue ni canal créé quand la liste est vide | moins d'appels natifs ; le canal est créé au premier passage qui programme | à relire |
| Où poser `setNotificationHandler` | haut du module `_layout.tsx` ; effet de `useReminders` | `showRemindersInForeground` (adaptateur), appelé une fois au montage de `useReminders`, sans attendre la base | `_layout.tsx` reste à un seul petit ajout (028c) ; l'affichage ne dépend pas des données | à relire |
| Faux module : relevé du gestionnaire | champ dans `state` ; `jest.spyOn` | `setNotificationHandler` du faux module ne fait que `guard`, le test l'observe par `jest.spyOn` | `state` n'est pas touché : moins de conflits avec le 029 | à relire |
| Tests de `dueSessions` | dans `reminders.test.ts` ; nouveau fichier | nouveau `src/domain/remindersDue.test.ts` | `reminders.test.ts` fait 251 lignes (limite 300) | à relire |
| Exemple refusé du contrôle | — | `setNotificationHandler` remplacé par `setNotificationCategoryAsync` ; contrôle vu en échec sans l'ajout à la liste | demandé par la fiche | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Relance : notifications locales programmées pour les 7 jours à venir, annulées dès que l'appel est enregistré (F-06, EX-28, ABS-04).
- Architecture : `src/hooks/useReminders.ts`, monté par `src/app/_layout.tsx` (annule puis reprogramme à l'ouverture, au retour au premier plan et à chaque `notifyDataChanged` ; une par une, la dernière demande gagne ; reportée sous le verrou des fichiers ; rien tant que la base n'est pas prête ; code `REMINDERS_SCHEDULE_FAILED`) ; `dueSessions` (« séances encore dues ») dans `src/domain/reminders.ts`, donnée à `dismissStaleReminders` ; `showRemindersInForeground` (`setNotificationHandler`) dans l'adaptateur, code `REMINDER_HANDLER_FAILED` ; libellé du canal `labels.reminder.channel`.
- SECURITE : SEC-03, liste fermée élargie à `setNotificationHandler` (contrôle vu en échec sans l'ajout ; exemple refusé remplacé par `setNotificationCategoryAsync`).
- Licences : `src/config/licences.json` régénéré, gagne `abort-controller` 3.0.0 et `event-target-shim` 5.0.1 (MIT) ; `badgin` n'entre pas dans le bundle.
- Relevé du 2026-11-27 (028b), APK de production construit dans le worktree (`expo prebuild --platform android --no-install --clean`, `gradlew assembleRelease`, `TMPDIR` local) : `node scripts/audit-apk.js` « conforme (SEC-02) », permissions `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, INTERNET absente ; l'adaptateur est dans le bundle (`REMINDERS_SCHEDULE_FAILED` présent) ; émulateur `emulator-5554` : installé par-dessus, lancé, `DB_READY` (version 1), aucun plantage, aucune ligne Firebase, FCM ni datatransport (`logcat --pid` et journal complet). Non vérifié : relance activée sur l'appareil (l'écran de réglage vient au 029), mode avion, téléphone réel, iOS.
- Taille : 11 fichiers avec la fiche (prévu environ 12).
