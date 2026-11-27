# 029 — Relance : réglage et demande de permission

Statut : à faire · Jalon : 2 · Zone sensible : **oui** (demande de permission du système, EX-29, ABS-07) · Trivial : non

Dépend de : 028 · Fichiers touchés : `src/app/relance.tsx` (nouveau), `src/app/permission-notifications.tsx` (nouveau), `src/hooks/useReminderSettings.ts` (nouveau), `src/app/(tabs)/parametres.tsx`, `src/config/libelles/relance.ts`, `src/appTests/reminderSettings.test.tsx` (nouveau), `src/appTests/notificationPermission.test.tsx` (nouveau) — 7 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

EX-29 : la permission n'est demandée qu'à l'activation de la relance, et le réglage affiche l'état effectif (préférence et permission du système). Maquettes « Réglage de la relance », « Demande de permission de notification », ligne « Relance » de Paramètres.

## À lire

- `design/maquettes/` : écrans ci-dessus (notes : « L'interrupteur montre l'état effectif », « Affiché à l'activation de la relance, juste avant la demande du système »)
- `docs/PRD.md` : EX-28, EX-29 ; tickets 026 à 028
- `src/data/expoNotifications.ts` (028), `src/app/(tabs)/parametres.tsx`, `src/ui/Select.tsx`

## Ce qui change

- `src/app/relance.tsx` : « Me relancer si l'appel n'est pas fait » (interrupteur), « Notification sur cet appareil, jamais envoyée ailleurs » ; « Après [30 min ▾] le début du créneau » ; si la préférence est active mais la permission refusée : bandeau « Notifications refusées dans les réglages du téléphone », « La relance est activée ici mais ne peut pas s'afficher. », « Ouvrir les réglages du téléphone » (`Linking.openSettings` de React Native, sans réseau).
- `src/app/permission-notifications.tsx` : texte de la maquette ; « Continuer » → demande du système ; « Pas maintenant » → retour, relance non activée.
- Parcours : interrupteur activé → permission déjà accordée : activée tout de suite ; sinon écran de permission → accordée : activée ; refusée : non activée, bandeau. Désactiver ne demande rien.
- `src/hooks/useReminderSettings.ts` : préférence (027), permission relue à l'ouverture et au retour au premier plan (l'encadrant revient des réglages du téléphone) ; écrire la préférence émet `notifyDataChanged` (reprogrammation, 028).
- Paramètres : ligne « Relance · Activée · 30 min » ou « Désactivée » (ou « Refusée par le téléphone »), au-dessus de « Alertes d'assiduité » (section « Réglages » posée au 022).

## Critères d'acceptation

- [ ] EX-29 : aucune demande de permission avant l'activation de l'interrupteur (test : l'adaptateur simulé n'est jamais appelé à l'ouverture de l'appli ni de Paramètres).
- [ ] EX-29 : l'interrupteur montre l'état effectif : préférence active et permission refusée → bandeau, interrupteur tel que la maquette le montre.
- [ ] Retour des réglages du téléphone avec la permission accordée : le bandeau disparaît sans relancer l'écran.
- [ ] Délai modifié : reprogrammation (028) ; ligne de Paramètres à jour.
- [ ] NF-06 : interrupteur et liste lisibles par le lecteur d'écran (rôle, état) ; zones d'appui de 44 pt.
- [ ] CONV-03, CONV-16 ; écarts avec la maquette listés dans la PR.

## Tests attendus

- `src/appTests/reminderSettings.test.tsx`, `src/appTests/notificationPermission.test.tsx` : accordée, refusée, déjà refusée (iOS ne redemande pas), « Pas maintenant », retour au premier plan.
- À la main (téléphone Android 13 ou plus, prétest) : boîte du système, refus puis réglages du téléphone, relance reçue.

## Hors périmètre

- Alarme exacte et son réglage spécial (ticket 026, réservé au porteur).

## Questions prévues

- Plan à valider à la séance de lancement (zone sensible).
- Interrupteur quand la permission est refusée : la maquette le montre activé avec le bandeau ; garder cette lecture (préférence active, affichage impossible) sauf avis contraire.

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Plan validé par le porteur le 2026-11-27.

Reports de l'intégration du lot J2-2 (2026-11-27) :

- une sauvegarde restaurée avec `reminder_enabled = 1` alors que la permission n'est pas accordée doit afficher l'état réel (EX-29) (027).
- la clé `alerts.settingsSection` (« Réglages », `src/config/libelles/alertes.ts`) est à déplacer quand la section reçoit la ligne Relance (022).
- section « Réglages » de Paramètres (022) : une seule ligne aujourd'hui, « Alertes d'assiduité · Après N absences » ; la ligne Relance s'ajoute au-dessus (maquette Paramètres).
- sous le réglage, la mention « le nom du groupe s'affiche sur l'écran verrouillé » (027, revue de sécurité ; `docs/IDEES.md`).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Paramètres : réglage de la relance (activation, délai), demande de permission seulement à l'activation, état réel affiché (F-06, EX-28, EX-29).
- Architecture : écrans `relance.tsx`, `permission-notifications.tsx` ; `src/hooks/useReminderSettings.ts`.
