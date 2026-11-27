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

## Questions pour le porteur

## À reporter

- CHANGELOG : Relance : un appui ouvre l'appel du créneau ; Tout effacer annule et retire les relances ; une restauration retire celles qui sont affichées (F-06, EX-28, SEC-11).
- Architecture : cible de l'appui lue une fois au démarrage à froid dans `src/app/_layout.tsx` ; `clearReminders` dans `EraseAllDeps` ; `dismissAllReminders` après une restauration.
- SECURITE : SEC-11, limite des SharedPreferences d'Android (B3).
- IDEES : la ligne « Tout effacer devra annuler les relances » passe à « faite (ticket 028c) ».
