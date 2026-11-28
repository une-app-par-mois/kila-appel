# 020 — Accords au singulier : purge et conservation (réponses du porteur)

Statut : fait (PR #88 vers `main` ; PR #77 dans le groupe) · Jalon : 2 · Zone sensible : non (textes seulement) · Trivial : non

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

- [x] Compte de 1 dans la confirmation : « la saison 2023-2024, son groupe… » (jamais « ses 1 groupe »), et de même pour un créneau, une séance, une présence (EX-24).
- [x] Compte de 2 : « ses 2 groupes… », texte du porteur inchangé ; le test « au caractère près » du 015b (3 groupes, 2 créneaux, 31 séances, 412 présences) passe sans modification.
- [x] Plusieurs saisons : « leur groupe » au compte de 1, « leurs 2 groupes » au compte de 2.
- [x] Ligne de conservation pour 1 : « Garder la dernière saison » (texte affiché et libellé d'accessibilité) ; pour 2 : « Garder les 2 dernières saisons ».
- [x] Aucun autre texte ne change (titres, boutons, note des membres, liste du choix « 1 saison », « 2 saisons », « 3 saisons »). Seules les notes des maquettes passent de « En attente du porteur » à « Réponse du porteur ».
- Non vérifié : la phrase « Garder la [1 ▾] dernière saison » sur le téléphone, et sa lecture par TalkBack (lecture unique testée dans Jest seulement).
- [x] `./scripts/test.sh` vert.

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
| Possessif dans la confirmation de purge | (a) possessif à chaque compte de 1, sans chiffre ; (b) un seul possessif en tête | (a) : « son groupe, son créneau, sa séance et ses 3 présences » (« son » pour groupe et créneau, « sa » pour séance et présence) ; une suite au pluriel garde un seul « ses » en tête (« ses 3 groupes, 2 créneaux, 31 séances et 412 présences » inchangé) ; plusieurs saisons : « leur » au compte de 1, « leurs » devant une suite au pluriel (« leurs 5 groupes et leur présence ») ; comptes nuls omis, sans contenu « la saison 2023-2024. » | Réponse du porteur | décidée par le porteur le 2026-11-27 |
| Conservation pour 1 saison | (a) « Garder la [1 ▾] dernière saison », lu « Garder la dernière saison » ; (b) sans le champ | (a) ; 2 et 3 inchangés (« Garder les 2 dernières saisons ») | Réponse du porteur | décidée par le porteur le 2026-11-27 |
| Forme des libellés de conservation | (a) `keepBefore`, `keepAfter`, `accessibility` fonctions de la durée ; (b) nouveaux libellés à part | (a), aucun autre texte ne change | Un seul endroit par morceau de phrase | à relire |
| Où placer les accords | (a) `effacement.ts` (fonction locale `purgeItems`) ; (b) aide générique dans `outils.ts` | (a), `outils.ts` intact | Règle propre à cette phrase | à relire |
| Tests existants touchés | — | Le test d'écran de `purge.test.tsx` attend « son groupe, son créneau, sa séance et ses 3 présences » au lieu de « ses 1 groupe… » ; le test 015b « plusieurs saisons » de `purgeTexts.test.ts` attend « leurs 5 groupes et leur présence » (exemple du porteur) au lieu de « … et 1 présence » | Suivent les réponses du porteur | à relire |
| Couverture des accords | — | Chaque combinaison de comptes 0, 1 et 2 (81), avec une et deux saisons : ni virgule, ni « et », ni possessif orphelin, aucun « 1 groupe », nombre de possessifs = comptes de 1 + suites au pluriel | Garde-fou contre les cas limites | à relire |
| Mixte pluriel, singulier, pluriel | (a) « ses » en tête de chaque suite au pluriel ; (b) un seul « ses » pour toute la phrase | (a) : « ses 2 groupes, son créneau, ses 3 séances et 4 présences » | Suit la règle du porteur (une suite au pluriel garde un « ses » en tête) ; la suite reprend après un singulier | à relire |
| Double lecture de la phrase de conservation (revue) | (a) cacher au lecteur d'écran les deux morceaux de texte autour du bouton, qui lit la phrase entière ; (b) les laisser | (a) : `importantForAccessibility="no"` et `accessibilityElementsHidden` sur « Garder la/les » et « dernière(s) saison(s) » ; testé dans `purge.test.tsx` (textes absents sans `includeHiddenElements`) | La phrase n'est lue qu'une fois, par le bouton | à relire |
| Notes des maquettes | — | `scripts/maquettes.mjs` (Sauvegarde et Purge) : « En attente du porteur » devient « Réponse du porteur du 2026-11-27 (ticket 020) » ; `design/maquettes/index.html` régénéré. Fichiers touchés : 6 au lieu de 4 | Maquettes à jour | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : « Effacement : accords au singulier dans la confirmation de purge (« son groupe », « leur présence ») et « Garder la dernière saison » pour une saison (ticket 020). »
- `docs/IDEES.md` : « Seront effacés définitivement : » ne s'accorde pas quand il ne reste que « la saison 2023-2024. » (aucun groupe, créneau, séance ni présence). Texte validé au 015b : à poser au porteur plus tard.
- Architecture : aucune ligne (textes seulement, `effacement.ts` garde les accords).
