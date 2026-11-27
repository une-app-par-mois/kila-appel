# 015b — Écrans Conservation et Tout effacer

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 015, 014, 014b · Fichiers touchés : `src/app/donnees.tsx`, `src/app/tout-effacer.tsx`, `(tabs)/parametres.tsx`, libellés

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 015.

## Contexte

Les écrans de la conservation, de la purge et de « tout effacer » (EX-23, EX-24).

## À lire

- Maquettes : Sauvegarde et données, Tout effacer, Purge des anciennes saisons

## Ce qui change

- Réglage de conservation (dans `settings`, par `settingsRepo`) ; proposition et confirmation de la purge ; « Tout effacer » avec le mot à taper ; lignes de Paramètres

## Critères d'acceptation

- [ ] Conservation de 1 à 3 saisons, 3 par défaut (EX-24)
- [ ] Confirmation de la purge qui liste ce qui part, membres compris (EX-24)
- [ ] Tout effacer après double confirmation, puis Bienvenue (EX-23)

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Rien de plus que les critères

## Questions prévues

Séance du 2026-11-27 : conservation de 1 à 3 saisons.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
