# 012b — Bienvenue (première mise en route)

Statut : fusionné dans le groupe (PR #32) · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 012.

## Contexte

Première ouverture (P1) : écran Bienvenue, saison créée automatiquement.

## À lire

- `docs/PRD.md` P1 ; maquette Bienvenue

## Critères d'acceptation

- [x] Première ouverture : écran Bienvenue avec ses 4 étapes et un seul bouton, sur la première étape qui reste
- [x] Saison créée automatiquement : du 1er septembre au 31 août, nommée « 2026-2027 » (décision du porteur du 2026-11-27 ; nom : `docs/DECISIONS.md`)

## Décisions

- Porteur (2026-11-27) : saison du 1er septembre au 31 août ; Bienvenue tant qu'une étape reste, rien d'enregistré
- Porteur, après la revue et le contradicteur (2026-11-27) :
  - Bienvenue seulement tant qu'aucun appel n'est enregistré dans la saison (sinon l'accueil, même s'il manque une étape) ;
  - saison créée seulement sur une base vide (ni saison ni membre) : jamais recréée après la suppression de la dernière (ABS-05) ;
  - pas de Bienvenue pendant un appel en cours ;
  - dès le 1er juillet, la saison qui commence en septembre suivant
- Automatiques : voir `docs/DECISIONS.md` (ticket 012b)

## Tests attendus

- Tests de données et d'écran
