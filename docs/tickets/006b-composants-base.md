# 006b — Composants de base

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Issu du découpage du ticket 006 (décision du porteur du 2026-11-26).

## Contexte

Composants réutilisables de la charte, avant les premiers écrans.

## À lire

- `design/CHARTE.md` ; maquettes (boutons, cartes, lignes, confirmations)

## Ce qui change

- `src/ui/` : bouton, carte, ligne de liste, confirmation
- Dépendances `react-native-svg` et `lucide-react-native` (ARCHITECTURE §2, versions revérifiées sur npm avant installation)

## Critères d'acceptation

- [ ] Composants conformes à la charte (couleurs, rayons, zone d'appui de 48 dp, texte de 16 sp au moins)
- [ ] Confirmation : titre, ce qui sera effacé, action destructive distincte
- [ ] Aucun texte ni couleur en dur (CONV-03, CONV-16)

## Tests attendus

- Tests d'écrans des composants (rendu, appui, accessibilité)

## Hors périmètre

- Écrans (006c)
