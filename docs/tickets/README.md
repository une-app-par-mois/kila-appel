# Tickets

Un ticket = une intention, réalisable et vérifiable en une session, touchant idéalement moins de 10 fichiers. Un ticket trop gros est découpé **avant** de commencer.

Fichiers `NNN-intitule-court.md`, numérotés dans l'ordre de création, à partir de `000-modele.md`. Le statut est tenu dans le ticket et dans le tableau ci-dessous.

Statuts : à faire, en cours, fusionné dans le groupe (mode par groupe ou par jalon, en attendant la CI du groupe), fait (dans `main`).

## Jalons

Un jalon = un objectif vérifiable et son critère de sortie. En mode par jalon, une branche `groupe/jalon-<n>-<intitulé>` et une seule CI à la fin.

| Jalon | Objectif | Critère de sortie | Branche | Statut |
| --- | --- | --- | --- | --- |
| 1 | [ ] | [ ] | `groupe/jalon-1-[intitulé]` | à faire |

## Tickets

| N° | Ticket | Jalon | Fonctionnalités | Zone sensible | Statut |
| --- | --- | --- | --- | --- | --- |
| 001 | [intitulé](001-intitule.md) | 1 | F-01 | non | à faire |
