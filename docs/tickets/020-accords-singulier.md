# 020 — Accords au singulier : purge et conservation (réponses du porteur)

Statut : à faire · Jalon : 2 · Zone sensible : non (textes seulement) · Trivial : non

Dépend de : 015b · Fichiers touchés : `src/config/libelles/effacement.ts`, `src/app/donnees.tsx`, `src/config/purgeTexts.test.ts`, `src/appTests/purge.test.tsx`

Créé le 2026-11-27 à la séance de clôture du jalon 1, à partir des réponses du porteur aux deux questions de la file (`docs/QUESTIONS.md`, ticket 015b). Les deux décisions du 015b sont marquées « annulée (2026-11-27, ticket 020) » dans `docs/DECISIONS.md`.

## Contexte

Le 015b a gardé les textes validés tels quels pour toutes les valeurs, ce qui donne au compte de 1 « ses 1 groupe » et « Garder les 1 dernières saisons ». Réponses du porteur du 2026-11-27 :

- **Confirmation de purge** : avec un compte de 1, le possessif s'accorde (« son groupe », « son créneau », etc.) ; au-delà, « ses 3 groupes ».
- **Ligne de conservation** : « Garder la dernière saison » pour 1 ; la phrase de la maquette (« Garder les 3 dernières saisons ») pour 2 et plus.

Seuls les textes changent : ni les données, ni la purge, ni le verrou.

## À lire

- `docs/tickets/015b-ecrans-effacement.md` (décisions « Confirmation : comptes et accords » et « Accord Garder les 1 dernières saisons »)
- `design/maquettes/` : « Sauvegarde et données », « Purge des anciennes saisons »
- `src/config/libelles/effacement.ts` (`retention.keepBefore`, `keepAfter`, `accessibility` ; `purge.messageAfter`) et `src/config/libelles/outils.ts` (`plural`, `joinFr`)
- `src/app/donnees.tsx` (phrase « Garder les [3 ▾] dernières saisons », champ dans la phrase)

## Ce qui change

- `effacement.ts`, `purge.messageAfter` : un élément au compte de 1 s'écrit sans chiffre, avec le possessif accordé (« son groupe », « son créneau », « sa séance », « sa présence ») ; au-delà, « ses 3 groupes » comme aujourd'hui. Pour plusieurs saisons, même règle avec « leur » / « leurs ».
- `effacement.ts`, `retention` : `keepBefore`, `keepAfter` et `accessibility` dépendent de la durée : « Garder la » / « dernière saison » pour 1, « Garder les » / « dernières saisons » pour 2 et plus.
- `donnees.tsx` : la phrase lit la durée choisie pour ses deux morceaux.

## Critères d'acceptation

- [ ] Compte de 1 dans la confirmation : « la saison 2023-2024, son groupe… » (jamais « ses 1 groupe »), et de même pour un créneau, une séance, une présence (EX-24).
- [ ] Compte de 2 : « ses 2 groupes… », texte du porteur inchangé ; le test « au caractère près » du 015b (3 groupes, 2 créneaux, 31 séances, 412 présences) passe sans modification.
- [ ] Plusieurs saisons : « leur groupe » au compte de 1, « leurs 2 groupes » au compte de 2.
- [ ] Ligne de conservation pour 1 : « Garder la dernière saison » (texte affiché et libellé d'accessibilité) ; pour 2 : « Garder les 2 dernières saisons ».
- [ ] Aucun autre texte ne change (titres, boutons, note des membres, liste du choix « 1 saison », « 2 saisons », « 3 saisons »).
- [ ] `./scripts/test.sh` vert.

## Tests attendus

- `src/config/purgeTexts.test.ts` : confirmation aux comptes 1 et 2 pour chaque élément, une et deux saisons ; `retention.accessibility(1)` et `(2)`, morceaux de la phrase pour 1 et 2. Chaque test vu en échec d'abord.
- `src/appTests/purge.test.tsx` : l'écran Sauvegarde affiche « Garder la dernière saison » avec une durée de 1, et la confirmation « son groupe » sur un jeu fictif à un groupe.
- À la main (téléphone) : la phrase de conservation avec le champ « 1 ▾ » se lit bien.

## Hors périmètre

- Les autres textes au pluriel de l'appli (aucune autre réponse du porteur).
- Le choix de la durée, la purge elle-même, la note des membres (déjà accordée au singulier).

## Questions prévues

- Pour 1, le champ « 1 ▾ » reste dans la phrase : elle se lit « Garder la [1 ▾] dernière saison ». La réponse du porteur ne cite pas le chiffre ; à confirmer à la séance de lancement si la pré-analyse le juge ambigu.
- Possessif en tête de liste seulement (« son groupe, 2 créneaux et 31 séances ») ou devant chaque élément : le texte validé n'en met qu'un en tête ; garder cette forme, accordée avec le premier élément cité, sauf avis contraire à la séance de lancement.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
