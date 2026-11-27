# 013 — Historique et correction des appels

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/app/(tabs)/historique.tsx`, `src/app/seances/[id].tsx`, `src/data/sessionsRepo.ts`, onglets, `src/app/appel.tsx` (retour après l'enregistrement), libellés

## Contexte

Retrouver, corriger, supprimer un appel passé (EX-16 à EX-18).

## À lire

- `docs/PRD.md` EX-16, EX-17, EX-18
- Maquettes : Historique, Détail d'une séance, Suppression d'une séance

## Ce qui change

- Écrans historique et détail ; filtres

## Critères d'acceptation

- [ ] Liste la plus récente en haut, filtres par groupe et période (EX-16)
- [ ] Appels manquants dans la liste (EX-17)
- [ ] Correction des statuts et du commentaire ; suppression confirmée, la date redevient manquante (EX-18)

## Tests attendus

- Tests de données et d'écrans

## Hors périmètre

- Séances annulées (F-13)

## Questions prévues

Séance de lancement du 2026-11-27 (réponses du porteur) :
- détail d'une séance : champ « Commentaire de la séance (facultatif) » comme à l'appel, 500 caractères au plus, entre la liste et les boutons (EX-18 ; maquette annotée) ;
- filtres : puce Groupe, période « 30 derniers jours », saison active, et **« Toutes les saisons »** pour consulter les saisons passées.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
