# 027 — Relance : calcul des relances et réglages

Statut : fait (PR #88 vers `main` ; PR #74 dans le groupe) · Jalon : 2 · Zone sensible : **oui** (notifications : aucun nom de membre, ABS-04, SEC-12 ; texte et moments calculés) · Trivial : non

Dépend de : aucun (aucune dépendance installée : domaine pur et réglages) · Fichiers touchés : `src/domain/reminders.ts` et son test (nouveaux), `src/domain/occurrences.ts` (exports, après revue), `src/data/settingsRepo.ts`, `src/data/settingsRepo.test.ts`, `src/config/libelles/relance.ts` (nouveau), `src/config/libelles/index.ts`, `src/config/reminderTexts.test.ts` (nouveau) — 7 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

EX-28 : une notification locale si aucun appel n'est enregistré X minutes après le début d'un créneau. Une notification locale ne peut rien vérifier au moment où elle s'affiche : on programme d'avance celles des 7 jours à venir, et on les reprogramme à chaque écriture (ADR-007). Ce ticket calcule **quoi** programmer (fonction pure) et pose les réglages ; l'appareil vient au 028.

## À lire

- `docs/PRD.md` : EX-28, EX-29, EX-17, EX-36 et EX-38 (préparées : la relance part ; annulées et non planifiées : aucune relance)
- ADR-004, ADR-007 ; `docs/ARCHITECTURE.md` §5
- `design/maquettes/` : « Relance sur l'écran verrouillé » (texte), « Réglage de la relance »
- `src/domain/occurrences.ts` (`slotDates`, `missingRollCalls`), `src/data/settingsRepo.ts`

## Ce qui change

- `src/domain/reminders.ts` : `plannedReminders({ slots, season, sessions, settings, now })` → liste triée de `{ slotId, date, startTime, fireDate, fireTime, groupNames }` :
  - occurrences des 7 jours à venir (`slotDates`, saison active, `schedule_from`) ;
  - moment = début + délai, y compris le lendemain après minuit ; jamais dans le passé ;
  - même règle que les appels manquants (EX-17) : aucune relance si la séance du créneau est enregistrée ; aucune si elle est `cancelled` ou `unscheduled` ; une séance `prepared` garde sa relance (EX-36) ;
  - 64 au plus (plafond iOS), les plus proches d'abord ;
  - relance désactivée : liste vide.
- `src/config/libelles/relance.ts` : textes de la maquette — titre « Appel non fait : Poussins mercredi », corps « Le créneau a commencé à 14:00. » ; plusieurs groupes (F-11) : noms joints par `joinFr` ; aucune autre donnée.
- `src/data/settingsRepo.ts` : `reminder_enabled` (`0` ou `1`, **désactivée par défaut**) et `reminder_delay_min` (10, 15, 20, 30, 45 ou 60 ; 30 par défaut) dans `SETTING_KEYS` et `isValidSetting`.

### Plan à valider (zone sensible)

- La fonction ne reçoit que les identifiants, dates, heures et **noms de groupes** : aucun nom de membre n'entre dans le calcul ni dans le texte (ABS-04).
- Test qui parcourt toutes les relances d'un jeu fictif dont les membres ont des noms reconnaissables, et vérifie qu'aucun n'apparaît dans un titre ou un corps (SEC-12).
- Données de la notification (pour l'appui, 028) : `slotId` et `date` seulement.

## Critères d'acceptation

- [x] EX-28 : créneau le mercredi à 14:00, délai 30 → relance le mercredi à 14:30 ; délai 45 → 14:45 ; créneau à 23:45, délai 30 → lendemain 00:15. — tests du domaine (`src/domain/reminders.test.ts`)
- [x] EX-28 : séance enregistrée ce jour-là → pas de relance ; séance annulée ou non planifiée → pas de relance ; préparée → relance. — tests du domaine ; « préparée → relance » par le dépôt : au 028 (la requête ne renvoie pas encore `state`)
- [x] Relance déjà passée (ouverture à 15:00 pour un créneau à 14:00) → non programmée. — test du domaine ; déclencheur écarté au moment de programmer : au 028
- [x] 7 jours exactement, bornés par la saison active et `schedule_from` ; au plus 64. — tests du domaine (fenêtre corrigée après revue : jusqu'à maintenant + 7 jours)
- [x] Désactivée (défaut) → aucune relance (EX-29 : rien sans activation). — test du domaine et du dépôt
- [x] Titre et corps nomment le groupe, jamais un membre (ABS-04, SEC-12), test nommé avec `SEC-12`. — `src/config/reminderTexts.test.ts` ; limite : séances lues marquées `recorded`, `state` lu au 028 ; notification réelle sur l'écran verrouillé : non vérifié sur le téléphone (028, 030)
- [x] Réglages : valeurs autorisées seulement (`REMINDER_DELAY_INVALID`) ; une sauvegarde qui contient ces clés reste valide. — `src/data/settingsRepo.test.ts`

## Tests attendus

- `src/domain/reminders.test.ts` : cas ci-dessus, changement d'heure (heure locale, dates en texte), fin de saison dans les 7 jours.
- `src/config/reminderTexts.test.ts` : textes, un et deux groupes, SEC-12.
- `src/data/settingsRepo.test.ts` : nouvelles clés.

## Hors périmètre

- Programmation réelle, permission, appui sur la notification (028, 029).
- Préparer, annuler une séance (F-13, jalon 4) : seule leur prise en compte est posée ici.

## Questions prévues

- Plan à valider à la séance de lancement (zone sensible).
- Appel sans créneau (EX-39) du même groupe le même jour : la relance du créneau part quand même, comme l'appel manquant aujourd'hui (même règle qu'EX-17).

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Relance active par défaut ? | Activée ; désactivée | Désactivée | EX-29 : la permission n'est demandée qu'à l'activation ; activée sans permission, elle ne s'afficherait pas | à relire |
| Délais proposés (maquette « 30 min ▾ ») | 15 à 60 par 15 ; 10, 15, 20, 30, 45, 60 | 10, 15, 20, 30, 45, 60 min, 30 par défaut | Couvre un retard court comme une séance longue | à relire |
| Quand une relance est-elle due ? | Règle propre ; même règle que les appels manquants | Même règle que les appels manquants (EX-17), avec EX-36 : une séance préparée garde sa relance | Une relance annonce un appel manquant : les deux ne doivent pas se contredire. Écart connu : `slotSessions` compte toute séance, préparée comprise, pour les appels manquants (voir F-13 dans « À reporter ») | à relire |
| Taille du ticket (9 fichiers avec `errors.ts` et `commun.ts`) | Découper ; garder entier | Gardé entier | Une session ; `errors.ts` et `commun.ts` ne gagnent qu'une ligne chacun. Après revue, `src/domain/occurrences.ts` exporte `TIME`, `DAY_MIN`, `minutes`, `dayNumber` et `isoFromDay` pour éviter les doublons : 10 fichiers de code, à la limite | à relire |
| EX-36, EX-38 : quelles séances retirent la relance ? | Toutes ; enregistrée, annulée et non planifiée | Enregistrée, annulée, non planifiée ; une séance préparée garde sa relance | EX-36 (« la relance part quand même »), EX-38 (« aucune relance ») | à relire |
| Entrée de `plannedReminders` | Liste déjà filtrée par l'appelant ; séances `{ slotId, date, state }` | Séances avec leur état ; la fonction applique EX-17, EX-36, EX-38 | Règle testée en un seul endroit, dans le domaine pur | à relire |
| Groupes nommés dans la relance | Tous les groupes du créneau ; seulement les actifs | Seulement les groupes non archivés de la saison active, joints par `joinFr` ; sans groupe actif, pas de relance | Le titre nomme tous les groupes à qui l'appel manque. Écart : `loadMissingRollCalls` n'en garde qu'un ; l'appel manquant est à aligner (F-11, voir « À reporter ») | à relire |
| Fenêtre des occurrences | Aujourd'hui à + 6 ; d'hier à aujourd'hui + 7, bornée par maintenant + 7 jours | Occurrences d'hier à aujourd'hui + 7 ; relance gardée si son moment est strictement après maintenant et au plus maintenant + 7 × 1440 min | ADR-007 : la relance de la semaine suivante est programmée dès que celle du jour est passée (lundi 08:00, créneau du lundi à 07:00 → lundi suivant 07:30) ; une ouverture juste après minuit ne perd pas la relance de la veille. Corrigée après revue (la fenêtre s'arrêtait à aujourd'hui + 6) | à relire |
| Relance à la minute même de maintenant | Gardée ; non gardée | Gardée seulement si son moment est strictement après maintenant, à la minute | Jamais dans le passé ; une relance programmée à la minute courante risquerait de ne jamais s'afficher | à relire |
| Brouillon d'appel non enregistré | Retire la relance ; la garde | La relance part (EX-28 : « aucun appel enregistré ») | Le brouillon n'est pas une séance enregistrée | à relire |
| Appel sans créneau (EX-39) du même groupe le même jour | Retire la relance ; la garde | La relance part | Même règle qu'EX-17 pour les appels manquants (décision 013) ; voir « Questions pour le porteur » | en attente du porteur |
| Saison | — | Sans saison active, liste vide ; dates bornées par la saison (`slotDates`) ; l'occurrence du dernier jour est gardée même si sa relance tombe le lendemain | La séance appartient à la saison, pas sa relance | à relire |
| Plafond de 64 | — | Tri par moment de la relance, puis par `slotId`, puis coupe à 64 | Les plus proches d'abord, ordre stable | à relire |
| Texte (maquette) | Avec jour de la semaine ; sans | Titre « Appel non fait : <groupes joints> », corps « Le créneau a commencé à HH:MM. », sans jour | Texte de la maquette au caractère près | à relire |
| Libellés | — | Une seule clé de premier niveau `reminder` dans `relance.ts` ; le message d'erreur va dans `labels.errors` (`commun.ts`) | Pas de collision de clés lors de la fusion des libellés | à relire |
| Réglages illisibles et validation | — | `reminder_enabled` vaut `'0'` ou `'1'`, `reminder_delay_min` parmi 10, 15, 20, 30, 45, 60 (`isValidSetting` n'accepte que celles-là) ; valeur illisible lue comme désactivée et 30 ; `REMINDER_DELAY_INVALID` levé seulement à l'écriture | Même modèle que la conservation et le seuil d'alertes | à relire |
| Test SEC-12 | Textes construits à la main ; dépôts sur une base | Base `node:sqlite`, jeu fictif aux noms reconnaissables, créneaux et groupes lus par les dépôts puis passés à `plannedReminders` et aux textes | Prouve l'absence de nom sur le chemin des dépôts (créneaux, groupes, séances). Il ne lit pas `state` : les séances lues sont marquées `recorded`, la requête qui renvoie l'état vient au 028. Ce n'est donc pas un test de bout en bout | à relire |
| Heures renvoyées | `Date` ; texte local | Dates et heures locales en texte seulement ; la conversion en `Date` vient au 028 | Domaine pur, à l'abri des changements d'heure | à relire |
| Délai invalide passé à `plannedReminders` | Valeur par défaut ; erreur | Erreur sans donnée (« Délai de relance invalide (EX-28) ») | Le dépôt lit déjà une valeur autorisée ; un autre délai est un défaut du programme | à relire |

## Questions pour le porteur

- **Appel sans créneau du même jour (file du porteur, ne bloque pas).** Un appel sans créneau (EX-39) enregistré le même jour pour un groupe du créneau ne retire aujourd'hui ni la relance ni l'appel manquant.
  - Option A (appliquée, recommandée en l'état) : garder ce comportement ; la relance part.
  - Option B : un appel sans créneau enregistré le même jour pour **tous** les groupes actifs du créneau retire la relance, et aussi l'appel manquant (EX-17, ajustement de la décision 013).

## À reporter

- CHANGELOG : Relance : calcul des relances des 7 jours à venir et réglages (désactivée par défaut, 30 min) (F-06, EX-28).
- Architecture : `src/domain/reminders.ts` ; réglages `reminder_enabled`, `reminder_delay_min` (lus par `settingsRepo.reminderSettings`) ; code `REMINDER_DELAY_INVALID`.
- F-13 (jalon 4) : `sessionsRepo.slotSessions` ne filtre pas sur `state` ; une séance préparée y compterait comme enregistrée, ce qui contredit EX-36 (appels manquants et relances). Non corrigé ici.
- 028 : `plannedReminders` attend les séances avec leur état (`{ slotId, date, state }`) ; il faudra une requête qui renvoie `state`, donc toucher `src/data/sessionsRepo.ts`. Le test SEC-12 du 027 marque pour l'instant toutes les séances lues comme `recorded`.
- 028 : à la conversion en `Date`, traiter l'heure qui n'existe pas au passage à l'heure d'été (02:00 à 03:00 le dernier dimanche de mars) ; la fonction ne renvoie que des dates et heures locales en texte.
- 029 : une sauvegarde restaurée avec `reminder_enabled = 1` alors que la permission n'est pas accordée doit afficher l'état réel (EX-29).
- Intégration : CONFORMITE, ligne ABS-08 pour les deux réglages `reminder_enabled` et `reminder_delay_min` (aucune donnée personnelle).
- F-11 : aligner l'appel manquant sur la relance : nommer tous les groupes actifs du créneau, pas un seul (`loadMissingRollCalls`).
- 028 : passage à l'heure d'hiver (02:00 à 03:00 le dernier dimanche d'octobre) : une heure locale y existe deux fois, éviter une relance en double.
- 028 : au moment de programmer, écarter un déclencheur déjà passé (le calcul et la programmation n'ont pas lieu à la même minute).
- 028 : attraper l'erreur de `plannedReminders` pour qu'un appel bien enregistré ne paraisse pas échoué.
- 028 : test « séance préparée → la relance part » qui passe par le dépôt.
- 028 : la requête des séances doit aussi renvoyer les séances futures annulées ou non planifiées (EX-38), avec leur état.
- 029 (intégration, `docs/IDEES.md`) : sous le réglage, la mention « le nom du groupe s'affiche sur l'écran verrouillé ».
