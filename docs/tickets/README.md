# Tickets

Un ticket = une intention, réalisable et vérifiable en une session, touchant idéalement moins de 10 fichiers. Un ticket trop gros est découpé **avant** de commencer.

Fichiers `NNN-intitule-court.md`, numérotés dans l'ordre de création, à partir de `000-modele.md`. Le statut est tenu dans le ticket et dans le tableau ci-dessous.

Statuts : à faire, en cours, fusionné dans le groupe (mode par groupe ou par jalon, en attendant la CI du groupe), fait (dans `main`).

## Jalons

Un jalon = un objectif vérifiable et son critère de sortie. En mode par jalon, une branche `groupe/jalon-<n>-<intitulé>` et une seule CI à la fin.

| Jalon | Objectif | Critère de sortie | Branche | Statut |
| --- | --- | --- | --- | --- |
| 0 | Outillage et risques techniques | Voir `docs/PLAN.md` §2 | `groupe/jalon-0-outillage` | en cours |
| 1 | Organiser, appeler, retrouver | Voir `docs/PLAN.md` §2 | `groupe/jalon-1-appel` | à faire |
| 2 à 7 | Détaillés au début du jalon précédent | `docs/PLAN.md` §2 | — | à faire |

## Tickets

| N° | Ticket | Jalon | Fonctionnalités | Zone sensible | Statut |
| --- | --- | --- | --- | --- | --- |
| 001 | [Socle Expo SDK 58 et scripts de test](001-socle-expo.md) | 0 | — | non | fusionné dans le groupe |
| 002 | [Couche données testable et migration 1](002-couche-donnees.md) | 0 | F-01 à F-14 (schéma) | oui | fusionné dans le groupe |
| 003 | [Garde-fous automatiques, thème et polices](003-garde-fous-theme.md) | 0 | — | non | fusionné dans le groupe |
| 004 | [Builds sur la CI et audit des permissions](004-builds-ci.md) | 0 | — | oui | fusionné dans le groupe |
| 005 | [Domaine : occurrences des créneaux et appels manquants](005-domaine-occurrences.md) | 1 | F-02, F-03 | non | à faire |
| 006 | [Saisons et groupes](006-saisons-groupes.md) | 1 | F-01 | oui | à faire |
| 007 | [Membres et inscriptions](007-membres-inscriptions.md) | 1 | F-01 | oui | à faire |
| 008 | [Contacts d'urgence et recherche rapide](008-contacts-urgence.md) | 1 | F-01 | non | à faire |
| 009 | [Créneaux récurrents](009-creneaux-recurrents.md) | 1 | F-02 | non | à faire |
| 010 | [Écran d'appel et enregistrement](010-appel.md) | 1 | F-02 | non | à faire |
| 011 | [Brouillon d'appel](011-brouillon-appel.md) | 1 | F-02 | oui | à faire |
| 012 | [Accueil, mise en route et navigation](012-accueil-navigation.md) | 1 | F-01, F-02, F-03 | non | à faire |
| 013 | [Historique et correction des appels](013-historique.md) | 1 | F-03 | non | à faire |
| 014 | [Sauvegarde, restauration et base illisible](014-sauvegarde-restauration.md) | 1 | F-03 | oui | à faire |
| 015 | [Tout effacer et purge](015-effacement-purge.md) | 1 | F-03 | oui | à faire |
| 016 | [Campagne Maestro du jalon 1](016-maestro-jalon-1.md) | 1 | F-01 à F-03 | non | à faire |
