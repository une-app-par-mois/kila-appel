# 014d — Invitation et bandeau de sauvegarde

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : 014, 014b, 013 · Fichiers touchés : `src/app/appel.tsx`, `src/app/appel-libre.tsx`, `src/app/(tabs)/index.tsx`, libellés

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Inviter à sauvegarder après le premier appel, et rappeler après 30 jours sans sauvegarde (EX-21).

## À lire

- Maquettes : Invitation à sauvegarder, Accueil

## Ce qui change

- Invitation unique après le premier appel enregistré ; bandeau sur l'accueil

## Critères d'acceptation

- [ ] Invitation après le premier appel, une seule fois, s'il n'y a aucune sauvegarde (EX-21)
- [ ] Bandeau après 30 jours sans sauvegarde, jamais pendant Bienvenue (EX-21)

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Rien de plus que les critères

## Questions prévues

Aucune pour l'instant.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
