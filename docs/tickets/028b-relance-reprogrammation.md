# 028b — Relance : reprogrammation, appui sur la notification, Tout effacer

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (notifications, ABS-01 : liste fermée d'expo-notifications élargie à `setNotificationHandler` ; ABS-04 ; effacement : Tout effacer annule et retire les relances ; SEC-11) · Trivial : non

Dépend de : 028a (adaptateur `src/data/expoNotifications.ts`, `sessionsRepo.reminderSessions`, contrôle statique), 027 (calcul et réglages) · Fichiers touchés : `src/hooks/useReminders.ts` et `src/hooks/useReminders.test.tsx` (nouveaux), `src/app/_layout.tsx`, `src/hooks/useErase.ts`, `src/app/tout-effacer.tsx`, `src/hooks/useEraseAll.test.tsx`, `src/config/libelles/relance.ts`, `src/data/expoNotifications.ts` (`setNotificationHandler`), `src/staticChecksNotifications.test.ts` (liste fermée), `src/config/licences.json` — 10 fichiers

Créé le 2026-11-27 à la séance de lancement du lot J2-3 : le 028 est découpé par le porteur en 028a (adaptateur et garde-fous, PR #79) et 028b (ce ticket). Le 029 ne dépend que du 028a.

## Contexte

Le 028a a posé l'adaptateur des notifications locales, sans qu'aucun écran ne l'appelle. Ce ticket le branche : tout annuler puis reprogrammer à l'ouverture, au retour au premier plan et après chaque écriture (ADR-007) ; un appui sur la notification ouvre l'appel du créneau ; Tout effacer annule les relances programmées et retire celles qui sont affichées (`docs/IDEES.md`, note du porteur, ticket 015f).

## À lire

- `docs/tickets/028-relance-programmation.md` (plan validé, décisions du 028a, « Reports du 028a ») ; ADR-007 ; `docs/ARCHITECTURE.md` §5 ; `docs/SECURITE.md` SEC-01, SEC-03, SEC-11, SEC-12
- `src/data/expoNotifications.ts` (`scheduleReminders`, `cancelAllReminders`, `dismissStaleReminders`, `dismissAllReminders`, `reminderPermission`, `createReminderChannel`, `lastReminderTarget`, `onReminderTarget`) et `src/staticChecksNotifications.test.ts`
- `src/domain/reminders.ts` (`plannedReminders`, 027), `src/data/sessionsRepo.ts` (`reminderSessions`)
- `src/hooks/dataChanged.ts` (`notifyDataChanged`, `useErasedCount`), `src/hooks/useLocalNow.ts`, `src/hooks/useErase.ts` (`useEraseAll`), `src/app/_layout.tsx`
- `design/maquettes/` : « Relance sur l'écran verrouillé » (« Un appui ouvre l'appel. »)

## Ce qui change

- `src/hooks/useReminders.ts` : lit créneaux, groupes, saison, `reminderSessions`, réglages et permission ; `plannedReminders` dans un `try` (délai invalide) ; `cancelAllReminders` puis `scheduleReminders(planned, new Date())` ; déclenché à l'ouverture, au retour au premier plan, à chaque `notifyDataChanged` et après un effacement ; une seule reprogrammation à la fois (la dernière gagne) ; échec journalisé par `REMINDERS_SCHEDULE_FAILED`, sans nom (ABS-04) et sans bloquer l'appli. Relance désactivée ou permission non accordée : tout est annulé, rien n'est programmé.
- Canal Android : `createReminderChannel` avec le libellé « Relances » (clé `reminder` de `relance.ts`) seulement relance activée et permission accordée, importance haute (décision du porteur) ; on ne programme que s'il a rendu `true` (sans canal, Android crée un canal de repli « Divers »).
- Relances affichées : `dismissStaleReminders` reçoit les **séances encore dues** (occurrences récentes sans séance enregistrée, annulée ou non planifiée : même règle qu'EX-17, EX-36, EX-38) ; une relance affichée n'est retirée que si l'appel est fait, la séance annulée, ou le créneau ou le groupe supprimé (décision du porteur).
- `src/data/expoNotifications.ts` : `setNotificationHandler` ajouté à la liste fermée (décision du porteur) : appli au premier plan, bannière et son, sans pastille ; `src/staticChecksNotifications.test.ts` mis à jour (liste fermée, exemple refusé remplacé).
- `src/app/_layout.tsx` : monte `useReminders` une fois la base prête ; `lastReminderTarget` (démarrage à froid) et `onReminderTarget` → `/appel?creneau=<slotId>&date=<date>` ; `null` → accueil (CONV-14).
- Tout effacer : `src/hooks/useErase.ts` appelle `cancelAllReminders` puis `dismissAllReminders` juste après l'effacement, sous le même verrou ; un échec est journalisé (`ERASE_REMINDERS_FAILED`) sans empêcher Bienvenue ; `src/app/tout-effacer.tsx` et `src/hooks/useEraseAll.test.tsx` suivent.
- `src/config/libelles/relance.ts` : nom du canal « Relances ».
- `src/config/licences.json` régénéré par `scripts/licences.js` (EX-42) : `abort-controller`, `event-target-shim` (et `badgin` s'il entre dans le bundle).

## Critères d'acceptation

- [ ] EX-28 : relance activée, créneau dans 1 h → une notification programmée à début + délai (adaptateur simulé, puis téléphone).
- [ ] Enregistrer l'appel annule la relance de cette séance et retire la relance affichée ; modifier ou supprimer un créneau, un groupe, la saison, la reprogramme.
- [ ] Une relance affichée dont l'appel manque toujours reste affichée après une ouverture ou un retour au premier plan.
- [ ] Relance désactivée ou permission refusée : rien n'est programmé, tout est annulé ; le canal n'est créé qu'avec la relance activée et la permission accordée.
- [ ] Appli au premier plan : la relance s'affiche en bannière, avec le son, sans pastille.
- [ ] Tout effacer : plus aucune relance programmée ni affichée (IDEES, SEC-11) ; restauration : relances recalculées sur les données restaurées, relances affichées retirées (B2).
- [ ] Appui sur la notification (appli ouverte, en arrière-plan, fermée) : l'appel du créneau à la bonne date s'ouvre ; données hors format → accueil.
- [ ] SEC-01 et SEC-03 : liste fermée élargie à `setNotificationHandler` seulement, contrôle vu en échec sur un exemple.
- [ ] ABS-04 : aucun nom dans le journal ni dans la notification.

## Tests attendus

- `src/hooks/useReminders.test.tsx` : adaptateur simulé (`src/__fixtures__/expoModules.ts`) : ouverture, écriture, désactivation, permission refusée, canal en échec, échec de programmation, délai invalide, courses entre deux reprogrammations, relance affichée encore due gardée.
- `src/hooks/useEraseAll.test.tsx` : annulation et retrait après Tout effacer, échec journalisé sans bloquer Bienvenue.
- `src/staticChecksNotifications.test.ts` : `setNotificationHandler` permis dans l'adaptateur seulement.
- À la main (téléphone, prétest du jalon) : relance reçue écran verrouillé, sans nom de membre ; appli ouverte ; appui → appel, appli fermée comprise ; relance reçue après un redémarrage du téléphone ; mode avion ; APK reconstruit et audité (B4).

## Hors périmètre

- Écrans de réglage et demande de permission (029).
- Alarme exacte (refusée sauf décision du porteur, ticket 026).

## Questions prévues

Réponses du porteur du 2026-11-27 (questions du 028a), déjà tranchées :

- `setNotificationHandler` ajouté à la liste fermée : bannière et son quand l'appli est ouverte, sans pastille.
- Canal « Relances » en importance haute.
- Relances affichées : on retire celles dont l'appel est fait (séance enregistrée), annulée, ou dont le créneau ou le groupe a été supprimé ; les autres restent.

Reports du 028a (2026-11-27) :

- créer le canal avant de programmer, et ne programmer que si `createReminderChannel` a rendu `true` ;
- B1 : lire `lastReminderTarget()` une seule fois, au démarrage à froid ; une cible périmée pourrait sinon rouvrir le mauvais appel après Tout effacer ou une restauration ;
- B2 : appeler `dismissAllReminders` après une restauration ;
- B3 : ajouter aux limites de SEC-11 la copie des relances programmées dans les SharedPreferences d'Android (expo-notifications les y garde pour les reprogrammer après un redémarrage) ;
- B4 : régénérer `src/config/licences.json`, reconstruire l'APK et l'auditer (`node scripts/audit-apk.js`) ;
- Doze : une relance retardée par Doze et ouverte pendant ce retard ne doit pas être supprimée par la reprogrammation ; la liste des séances encore dues (ci-dessus) le règle, à tester ;
- appui sur la notification avec l'appli fermée : vérifier le type de `slotId` au démarrage à froid ;
- registre des licences : `abort-controller` et `event-target-shim` entrent dans le bundle quand l'adaptateur est importé par un écran.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Relance : notifications locales programmées pour les 7 jours à venir, annulées dès que l'appel est enregistré et par Tout effacer ; un appui ouvre l'appel (F-06, EX-28, ABS-04).
- Architecture : `src/hooks/useReminders.ts` ; Tout effacer annule et retire les relances ; `setNotificationHandler` dans la liste fermée de l'adaptateur.
- SECURITE : SEC-11, limite des SharedPreferences d'Android (B3) ; SEC-03, liste fermée élargie.
- IDEES : la ligne « Tout effacer devra annuler les relances » passe à « faite (ticket 028b) ».
