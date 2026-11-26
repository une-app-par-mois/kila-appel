# 006b — Composants de base

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

Issu du découpage du ticket 006 (décision du porteur du 2026-11-26).

## Contexte

Composants réutilisables de la charte, avant les premiers écrans.

## À lire

- `design/CHARTE.md` ; maquettes (boutons, cartes, lignes, confirmations)

## Ce qui change

- `src/ui/` : bouton, carte, ligne de liste, confirmation
- Dépendances `react-native-svg` et `lucide-react-native` (ARCHITECTURE §2, versions revérifiées sur npm avant installation)

## Critères d'acceptation

- [x] Composants conformes à la charte (couleurs, rayons, zone d'appui de 44 × 44 pt, NF-06)
- [x] Confirmation : titre, ce qui sera effacé, action destructive distincte
- [x] Aucun texte ni couleur en dur (CONV-03, CONV-16)

## Tests attendus

- Tests d'écrans des composants (rendu, appui, accessibilité)

## Décisions du porteur (2026-11-26)

- `react-native-svg` 15.16.0 (MIT, fixée par le SDK) accepté malgré `SvgUri` et `SvgCssUri`, capables de télécharger (ABS-01) : leur import est interdit par `staticChecks` et INTERNET reste absente du binaire.
- `lucide-react-native` 1.81.0 (ISC, sans dépendance) pour les icônes ; un composant `Icon` à liste fermée.

## Hors périmètre

- Écrans (006c)
