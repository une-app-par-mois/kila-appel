# 035 — Import CSV : écrans

Statut : à faire · Jalon : 3 · Zone sensible : non (écrans ; lecture, contrôles et écriture au 031, 032, 034) · Trivial : non

Dépend de : 034 · Fichiers touchés : `src/app/import/index.tsx`, `src/app/import/apercu.tsx`, `src/app/import/resultat.tsx` (nouveaux), `src/app/membres/index.tsx` (bouton « Importer (CSV) »), `src/config/libelles/import.ts` (nouveau), `src/config/libelles/index.ts` (une ligne, partagé avec 037), `src/appTests/memberImport.test.tsx` (nouveau) — 7 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

Les quatre écrans de la maquette : choisir le fichier, aperçu, résultat, fichier non reconnu ; et le bouton « Importer (CSV) » de la liste des membres.

## À lire

- `design/maquettes/` : « Membres » (bouton « Importer (CSV) » à gauche de « Nouveau membre »), « Import CSV : choisir le fichier », « Import CSV : aperçu », « Import CSV : résultat », « Import CSV : fichier illisible » ; `design/CHARTE.md`
- Tickets 032, 034 ; `docs/PRD.md` : EX-30, NF-05, NF-06, NF-07
- `src/app/membres/index.tsx`, `src/app/restauration.tsx` (modèle d'écran qui ouvre le sélecteur), `src/ui/`

## Ce qui change

- `src/app/import/index.tsx` : explication et tableau d'exemple de la maquette, « Choisir le fichier… » ; en cas de refus, l'état « Fichier non reconnu » (bandeau, « Choisir un autre fichier ») avec le texte de la cause.
- `src/app/import/apercu.tsx` : compteur (lignes, à importer, invalides, doublons), section « Doublons » (bascule « Ignorer » par doublon), section « Ligne invalide » (« Ligne 17 · Prénom manquant »), section « Groupe introuvable » (décision du porteur du 2026-11-28), bouton « Importer N membres » (N suit les bascules ; désactivé à 0).
- `src/app/import/resultat.tsx` : « 21 membres importés », phrase de la maquette, « Voir les membres ».
- `src/app/membres/index.tsx` : rangée de deux boutons de la maquette (« Importer (CSV) » un tiers, « Nouveau membre » deux tiers).
- Tous les textes dans `src/config/libelles/import.ts` (NF-07), accords au singulier (« 1 membre importé », « 1 doublon »).

## Critères d'acceptation

- [ ] EX-30 : parcours complet sur le fichier fictif : aperçu conforme à la maquette, « Importer 21 membres », résultat, membres visibles.
- [ ] EX-30 : une bascule « Ignorer » décochée fait passer le bouton à « Importer 22 membres ».
- [ ] « Fichier non reconnu » pour chaque refus (colonnes, trop gros, trop de lignes, pas un CSV), rien d'importé.
- [ ] Bouton « Choisir le fichier… » désactivé pendant un export, une restauration ou une purge (verrou).
- [ ] NF-06 : zones d'appui de 44 points au moins ; bascules annoncées au lecteur d'écran (« Ignorer, coché ») ; NF-05 : tablette en portrait.
- [ ] Écrans comparés à la maquette, écarts listés dans la PR.

## Tests attendus

- `src/appTests/memberImport.test.tsx` (Testing Library, faux sélecteur) : parcours, bascules, refus, verrou, retour Android.

## Hors périmètre

- Règles et écriture (032, 034) ; aide détaillée sur Excel (au-delà de la phrase de la maquette).

## Questions prévues

- **Réservée (écart de maquette)** : la maquette n'a que le refus « colonnes nom et prénom absentes ». Textes proposés pour les autres causes, sur le même écran « Fichier non reconnu » :
  - pas un CSV : « Ce fichier n'est pas un CSV. Dans Excel : Fichier › Enregistrer sous › CSV (séparateur : point-virgule). Rien n'a été importé. »
  - trop gros : « Ce fichier dépasse 1 Mo ou 2 000 lignes. Découpez-le en plusieurs fichiers. Rien n'a été importé. »
  - illisible : « Ce fichier n'a pas pu être lu (guillemet non fermé ?). Rien n'a été importé. »
- **Réservée (écart de maquette)** : section « Groupe introuvable » de l'aperçu, si le porteur la retient au 032.
- Décision automatique proposée : trois routes empilées (retour Android naturel) et l'aperçu passé par `importSession` (034), plutôt qu'un seul écran à étapes.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Refus de l'import : **même écran « Fichier non reconnu », un texte par cause**, les trois textes ci-dessus tels quels (écart de maquette validé le 2026-11-28).
- Section **« Groupe introuvable »** de l'aperçu retenue (écart de maquette validé le 2026-11-28) : « Ligne 12 · « Poussin mercredi » : importé sans groupe ».
- Maquette et `scripts/maquettes.mjs` à mettre à jour pour ces deux écarts (à l'intégration, comme au jalon 2), avant la comparaison de la PR.
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Membres : import d'une liste depuis un fichier CSV, avec aperçu, doublons et lignes invalides signalés avant d'importer (F-07, EX-30).
- Architecture : `src/app/import/` (trois écrans), libellés `import.ts`.
