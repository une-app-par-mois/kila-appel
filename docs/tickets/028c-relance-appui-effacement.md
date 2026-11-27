# 028c — Relance : appui et effacement

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (notifications, ABS-04 ; effacement : Tout effacer annule et retire les relances, ABS-05 ; restauration ; SEC-11) · Trivial : non

Dépend de : 028a (adaptateur `src/data/expoNotifications.ts` : `lastReminderTarget`, `onReminderTarget`, `cancelAllReminders`, `dismissAllReminders`), 027 (calcul et réglages) ; pas du 028b, qui tourne en parallèle · Fichiers touchés : `src/app/_layout.tsx` (cible de l'appui), `src/hooks/useErase.ts`, `src/app/tout-effacer.tsx`, `src/hooks/useEraseAll.test.tsx`, `src/hooks/useRestore.ts` et `src/hooks/useRestore.test.tsx`, `src/hooks/useRecovery.ts` et `src/hooks/useRecovery.test.tsx`, un test d'écran de l'appui dans `src/appTests/` (nouveau) — environ 9 fichiers. Seul fichier commun avec le 028b : `_layout.tsx` (un petit ajout chacun).

Créé le 2026-11-27 à la séance de lancement du lot J2-4 : le 028b (plus de 10 fichiers en zone sensible) est découpé par le porteur en 028b (programmation) et 028c (ce ticket).

## Contexte

Un appui sur la relance ouvre l'appel du créneau (maquette « Relance sur l'écran verrouillé » : « Un appui ouvre l'appel. »). Tout effacer doit annuler les relances programmées et retirer celles qui sont affichées (`docs/IDEES.md`, note du porteur, ticket 015f) ; une restauration retire les relances affichées, qui ne correspondent plus aux données (B2 du 028a).

## À lire

- `docs/tickets/028-relance-programmation.md` (« Reports du 028a » : B1, B2, B3) ; `docs/tickets/028b-relance-reprogrammation.md` (ticket parallèle) ; ADR-007 ; `docs/SECURITE.md` SEC-11, SEC-12
- `src/data/expoNotifications.ts` (`lastReminderTarget`, `onReminderTarget`, `cancelAllReminders`, `dismissAllReminders`)
- `src/hooks/useErase.ts` (`useEraseAll`, `EraseAllDeps`), `src/hooks/useRestore.ts`, `src/hooks/useRecovery.ts`, `src/hooks/fileLock.ts` (`useFileLock`), `src/app/_layout.tsx`
- `design/maquettes/` : « Relance sur l'écran verrouillé »

## Ce qui change

- `src/app/_layout.tsx` : la cible d'un appui n'est lue qu'une fois, au démarrage à froid (`lastReminderTarget`, B1), puis `onReminderTarget` pendant que l'appli tourne ; elle ouvre `/appel?creneau=<slotId>&date=<date>` ; données hors format (type de `slotId` compris) → accueil (CONV-14) ; ignorée pendant un effacement, une restauration ou un export (verrou de `useFileLock`) ; abandonnée si l'écran de récupération s'affiche. Un seul petit ajout (le 028b y monte `useReminders`).
- Tout effacer : `EraseAllDeps` reçoit un `clearReminders` qui appelle `cancelAllReminders` puis `dismissAllReminders`, juste après l'effacement, sous le même verrou ; un échec est journalisé (`ERASE_REMINDERS_FAILED`, sans nom) sans empêcher Bienvenue ; `src/app/tout-effacer.tsx` le fournit ; `src/hooks/useEraseAll.test.tsx` suit.
- Restauration (B2) : `dismissAllReminders` après une restauration réussie, dans `src/hooks/useRestore.ts` et `src/hooks/useRecovery.ts` ; la reprogrammation sur les données restaurées vient ensuite du 028b (verrou libéré, `notifyDataChanged`).
- SEC-11 (B3) : limite notée à l'intégration : expo-notifications copie les relances programmées dans les SharedPreferences d'Android pour les reprogrammer après un redémarrage ; Tout effacer les annule, donc les retire.

## Critères d'acceptation

- [ ] Appui sur la notification (appli ouverte, en arrière-plan, fermée) : l'appel du créneau à la bonne date s'ouvre ; données hors format → accueil.
- [ ] B1 : la cible du démarrage à froid n'est lue qu'une fois ; elle ne rouvre pas un appel après Tout effacer ou une restauration.
- [ ] Appui pendant un effacement, une restauration ou un export : ignoré ; écran de récupération affiché : cible abandonnée.
- [ ] Tout effacer : plus aucune relance programmée ni affichée (IDEES, SEC-11) ; échec journalisé sans bloquer Bienvenue.
- [ ] B2 : restauration réussie (Paramètres ou écran de récupération) → relances affichées retirées ; restauration en échec → rien n'est retiré.
- [ ] ABS-04 : aucun nom dans le journal.

## Tests attendus

- `src/hooks/useEraseAll.test.tsx` : `clearReminders` appelé après l'effacement (annulation puis retrait), échec journalisé sans bloquer Bienvenue.
- `src/hooks/useRestore.test.tsx`, `src/hooks/useRecovery.test.tsx` : `dismissAllReminders` après une restauration réussie, pas après un échec.
- Test d'écran de l'appui (`src/appTests/`, adaptateur simulé) : démarrage à froid, appli ouverte, cible lue une seule fois, cible hors format, appui pendant le verrou, écran de récupération.
- À la main (téléphone, prétest du jalon) : appui → appel, appli fermée comprise ; Tout effacer puis plus aucune relance affichée.

## Hors périmètre

- Programmation, canal, `setNotificationHandler` (028b).
- Écrans de réglage et demande de permission (029).

## Questions prévues

Séance de lancement du lot J2-4 (2026-11-27), réponses du porteur :

- Découpage du 028b en 028b et 028c, en parallèle ; seul fichier commun `_layout.tsx`.
- **Plan validé par le porteur le 2026-11-27** (zone sensible) : Tout effacer annule et retire toutes les relances ; une restauration retire celles qui sont affichées avant de reprogrammer ; la cible d'un appui n'est lue qu'une fois, au démarrage à froid, ouvre `/appel?creneau=…&date=…`, est ignorée pendant un effacement, une restauration ou un export, et abandonnée si l'écran de récupération s'affiche.

Reports du 028a (2026-11-27), part du 028c :

- B1 : lire `lastReminderTarget()` une seule fois, au démarrage à froid ; une cible périmée pourrait sinon rouvrir le mauvais appel après Tout effacer ou une restauration ;
- B2 : appeler `dismissAllReminders` après une restauration ;
- B3 : ajouter aux limites de SEC-11 la copie des relances programmées dans les SharedPreferences d'Android ;
- appui sur la notification avec l'appli fermée : vérifier le type de `slotId` au démarrage à froid.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Où vit la logique de l'appui ? | dans `_layout.tsx` ; hook à part | nouveau `src/hooks/useReminderTap.ts`, une ligne dans `_layout.tsx` | `_layout.tsx` est commun avec le 028b : l'ajout y reste minimal ; le hook est testé par l'écran | à relire |
| Appui (ou cible à froid) pendant l'ouverture de la base ou le nettoyage | ignoré ; mis en attente | mis en attente, ouvert une fois la pile montée ; abandonné si l'écran de récupération s'affiche | plan validé : « navigation une fois la pile montée » ; un appui à froid arrive justement pendant ce temps | à relire |
| Appui pendant le verrou (effacement, restauration, export) | ignoré ; différé à la fin | ignoré, jamais rejoué ; vérifié aussi au moment de naviguer | plan validé (« ignorée ») ; rejouer après Tout effacer ou une restauration rouvrirait un appel périmé (B1) | à relire |
| Cible hors format, appli ouverte | aller à l'accueil ; ne rien ouvrir | rien ne s'ouvre, l'écran affiché reste ; à froid, c'est l'accueil | la fiche dit « → accueil » : à froid l'appli s'ouvre sur l'accueil ; appli ouverte, quitter un appel en cours pour une notification illisible ferait perdre le fil | en attente du porteur |
| Où placer l'annulation et le retrait de Tout effacer | dans `tout-effacer.tsx` ; dans `useErase.ts` | `clearAllReminders` exporté par `useErase.ts`, passé par `tout-effacer.tsx` comme `clearReminders` | testable sans monter l'écran (ordre annulation puis retrait), sans fichier de plus | à relire |
| Ordre et échecs de Tout effacer | relances avant ou après les copies ; retrait si l'annulation échoue | copies, puis relances ; retrait tenté même si l'annulation échoue ; `ERASE_REMINDERS_FAILED` si l'annulation échoue ; un retrait en échec n'est journalisé que par l'adaptateur (`REMINDER_DISMISS_FAILED`), qui ne le signale pas à l'appelant | retirer le plus possible (SEC-11) ; l'adaptateur du 028a avale l'échec du retrait | à relire |
| Moment du retrait après une restauration | avant ou après la relecture des écrans | Paramètres : sous le verrou, avant `notifyDataChanged` ; récupération : après la publication de la base, avant `notifyDataChanged` | la reprogrammation du 028b part de `notifyDataChanged` : le retrait la précède toujours | à relire |
| Imitation d'expo-notifications dans les tests | `jest.mock` dans chaque test qui monte le layout ; une fois dans `jest.setup.js` | `jest.setup.js`, ajout en fin de fichier (l'imitation en mémoire du 028a) | l'imitation automatique de jest-expo rend `undefined` : 4 fichiers de test du layout échouaient au démontage ; un fichier remplace l'imitation par son propre `jest.mock` | à relire |

## Questions pour le porteur

- **Ticket en attente : 11 fichiers au lieu d'environ 9, en zone sensible.** Fichiers : `src/app/_layout.tsx`, `src/hooks/useReminderTap.ts` (nouveau), `src/hooks/useErase.ts`, `src/app/tout-effacer.tsx`, `src/hooks/useEraseAll.test.tsx`, `src/hooks/useRestore.ts`, `src/hooks/useRestore.test.tsx`, `src/hooks/useRecovery.ts`, `src/hooks/useRecovery.test.tsx`, `src/appTests/reminderTap.test.tsx` (nouveau), `jest.setup.js` (imitation d'expo-notifications, 5 lignes).
  1. **Garder le ticket tel quel** (recommandé) : le 11e fichier est une imitation de test, sans effet sur l'appli ; le hook à part évite d'alourdir `_layout.tsx`, commun avec le 028b.
  2. Sortir l'imitation de `jest.setup.js` dans un petit ticket à fusionner avant celui-ci.
  3. Remettre la logique de l'appui dans `_layout.tsx` (10 fichiers), au prix d'un conflit plus large avec le 028b.
- Attention à l'intégration : si le 028b ajoute aussi une imitation d'expo-notifications dans `jest.setup.js`, n'en garder qu'une.

## À reporter

- CHANGELOG : Relance : un appui ouvre l'appel du créneau ; Tout effacer annule et retire les relances ; une restauration retire celles qui sont affichées (F-06, EX-28, SEC-11).
- Architecture : appui sur une relance dans `src/hooks/useReminderTap.ts`, monté par `src/app/_layout.tsx` (cible du démarrage à froid lue une fois par lancement, navigation une fois la pile montée, ignorée pendant le verrou commun ou l'écran de récupération) ; `clearReminders` dans `EraseAllDeps` (`clearAllReminders` de `useErase.ts`) ; `dismissAllReminders` après une restauration réussie (`useRestore`, `useRecovery`) ; imitation en mémoire d'expo-notifications pour tous les tests (`jest.setup.js`).
- SECURITE : SEC-11, limite des SharedPreferences d'Android (B3). Vérifié dans `node_modules/expo-notifications/android` (58.1.10) : chaque relance programmée est copiée, encodée en base64 (titre avec le nom du groupe, données `slotId` et `date`), dans le fichier privé `expo.modules.notifications.SharedPreferencesNotificationsStore`, sous la clé `notification_request-<identifiant>`, pour être reprogrammée après un redémarrage. `cancelAllScheduledNotificationsAsync` → `ExpoSchedulingDelegate.removeAllScheduledNotifications` → `SharedPreferencesNotificationsStore.removeAllNotificationRequests` : chaque entrée lisible est retirée en une écriture (`apply()`, asynchrone), puis son alarme est annulée. Limites : une entrée illisible (non décodable) n'est ni lue ni retirée ; l'écriture est différée de quelques instants ; comme pour SQLite, rien n'efface les octets déjà écrits sur la mémoire flash. `allowBackup` est à `false` (app.json) : ce fichier ne part pas dans la sauvegarde Android.
- IDEES : la ligne « Tout effacer devra annuler les relances » passe à « faite (ticket 028c) ».
