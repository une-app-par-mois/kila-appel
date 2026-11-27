# 027 — Relance : calcul des relances et réglages

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (notifications : aucun nom de membre, ABS-04, SEC-12 ; texte et moments calculés) · Trivial : non

Dépend de : aucun (aucune dépendance installée : domaine pur et réglages) · Fichiers touchés : `src/domain/reminders.ts` et son test (nouveaux), `src/data/settingsRepo.ts`, `src/data/settingsRepo.test.ts`, `src/config/libelles/relance.ts` (nouveau), `src/config/libelles/index.ts`, `src/config/reminderTexts.test.ts` (nouveau) — 7 fichiers

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

- [ ] EX-28 : créneau le mercredi à 14:00, délai 30 → relance le mercredi à 14:30 ; délai 45 → 14:45 ; créneau à 23:45, délai 30 → lendemain 00:15.
- [ ] EX-28 : séance enregistrée ce jour-là → pas de relance ; séance annulée ou non planifiée → pas de relance ; préparée → relance.
- [ ] Relance déjà passée (ouverture à 15:00 pour un créneau à 14:00) → non programmée.
- [ ] 7 jours exactement, bornés par la saison active et `schedule_from` ; au plus 64.
- [ ] Désactivée (défaut) → aucune relance (EX-29 : rien sans activation).
- [ ] Titre et corps nomment le groupe, jamais un membre (ABS-04, SEC-12), test nommé avec `SEC-12`.
- [ ] Réglages : valeurs autorisées seulement (`REMINDER_DELAY_INVALID`) ; une sauvegarde qui contient ces clés reste valide.

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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Relance active par défaut ? | Activée ; désactivée | Désactivée | EX-29 : la permission n'est demandée qu'à l'activation ; activée sans permission, elle ne s'afficherait pas | à relire |
| Délais proposés (maquette « 30 min ▾ ») | 15 à 60 par 15 ; 10, 15, 20, 30, 45, 60 | 10, 15, 20, 30, 45, 60 min, 30 par défaut | Couvre un retard court comme une séance longue | à relire |
| Quand une relance est-elle due ? | Règle propre ; même règle que les appels manquants | Même règle que les appels manquants (EX-17) | Une relance annonce un appel manquant : les deux ne doivent jamais se contredire | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Relance : calcul des relances des 7 jours à venir et réglages (désactivée par défaut, 30 min) (F-06, EX-28).
- Architecture : `src/domain/reminders.ts` ; réglages `reminder_enabled`, `reminder_delay_min`.
