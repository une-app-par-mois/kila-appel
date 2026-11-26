# 006 — Saisons et groupes

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

Premiers écrans de gestion : saisons (EX-01) et groupes (EX-02), avec leurs suppressions.

## À lire

- `docs/PRD.md` EX-01, EX-02
- Maquettes : Saisons, Création ou modification d'une saison, Suppression d'une saison, Groupes, Création d'un groupe, Renommer ou supprimer un groupe, Suppression d'un groupe, Paramètres, États vides

## Ce qui change

- Dépôts `seasons`, `groups`
- Écrans correspondants, onglet Paramètres
- Composants de base (bouton, carte, ligne, confirmation)

## Critères d'acceptation

- [ ] Créer, renommer, activer, supprimer une saison ; une seule active (EX-01)
- [ ] Supprimer une saison efface ses groupes, créneaux, séances et présences, pas les membres, après une confirmation qui le dit (EX-01)
- [ ] Créer, renommer, archiver, supprimer un groupe (EX-02)
- [ ] Écrans conformes aux maquettes ; états vides

## Tests attendus

- Tests de données des dépôts et des suppressions (comptes de lignes)
- Tests d'écrans des confirmations

## Hors périmètre

- Membres (007)
