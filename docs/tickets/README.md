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
| 001 | [Socle Expo SDK 58 et scripts de test](001-socle-expo.md) | 0 | — | non | fait |
| 002 | [Couche données testable et migration 1](002-couche-donnees.md) | 0 | F-01 à F-14 (schéma) | oui | fait |
| 003 | [Garde-fous automatiques, thème et polices](003-garde-fous-theme.md) | 0 | — | non | fait |
| 004 | [Builds sur la CI et audit des permissions](004-builds-ci.md) | 0 | — | oui | fait |
| 005 | [Domaine : occurrences des créneaux et appels manquants](005-domaine-occurrences.md) | 1 | F-02, F-03 | oui | fusionné dans le groupe |
| 006 | [Saisons et groupes : dépôts et hooks](006-saisons-groupes.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 006b | [Composants de base](006b-composants-base.md) | 1 | F-01 | non | fusionné dans le groupe |
| 006c | [Écrans des saisons](006c-ecrans-saisons-groupes.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 006d | [Écrans des groupes](006d-ecrans-groupes.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 006e | [Licences embarquées](006e-licences.md) | 1 | — | non | fusionné dans le groupe |
| 006f | [Saison modifiée sans inscription hors dates](006f-saison-inscriptions.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 007 | [Membres et inscriptions : données](007-membres-inscriptions.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 007b | [Écrans des membres](007b-ecrans-membres.md) | 1 | F-01 | oui | fusionné dans le groupe |
| 007c | [Écrans des inscriptions](007c-inscriptions.md) | 1 | F-01 | non | fusionné dans le groupe |
| 007d | [Effacement dans le fichier](007d-effacement-securise.md) | 1 | — | oui | fusionné dans le groupe |
| 007e | [Inscription dans les dates de la saison](007e-dates-inscription.md) | 1 | F-01 | non | fusionné dans le groupe |
| 008 | [Contacts d'urgence : données](008-contacts-urgence.md) | 1 | F-01 | non | fusionné dans le groupe |
| 008b | [Contacts d'urgence : écrans](008b-ecrans-contacts.md) | 1 | F-01 | non | fusionné dans le groupe |
| 009 | [Créneaux récurrents : données](009-creneaux-donnees.md) | 1 | F-02 | non | fusionné dans le groupe |
| 009b | [Créneaux récurrents : écrans](009b-creneaux-ecrans.md) | 1 | F-02 | non | fusionné dans le groupe |
| 010 | [Appel : données](010-appel-donnees.md) | 1 | F-02 | non | fusionné dans le groupe |
| 010b | [Écran d'appel](010b-ecran-appel.md) | 1 | F-02 | non | fusionné dans le groupe |
| 010c | [Appel sans créneau, ajout pendant l'appel](010c-appel-libre-ajout.md) | 1 | F-02 | non | fusionné dans le groupe |
| 011 | [Brouillon d'appel](011-brouillon-appel.md) | 1 | F-02 | oui | fusionné dans le groupe |
| 011b | [Suppressions et appel en cours](011b-suppressions-appel-en-cours.md) | 1 | F-02 | oui | fusionné dans le groupe |
| 012 | [Onglets et accueil](012-accueil-navigation.md) | 1 | F-01, F-02, F-03 | non | fusionné dans le groupe |
| 012b | [Bienvenue](012b-bienvenue.md) | 1 | F-01 | non | fusionné dans le groupe |
| 012c | [États vides](012c-etats-vides.md) | 1 | F-01, F-02, F-03 | non | en cours |
| 013 | [Historique et correction des appels](013-historique.md) | 1 | F-03 | non | fusionné dans le groupe |
| 014 | [Sauvegarde et restauration : données](014-sauvegarde-restauration.md) | 1 | F-03 | oui | fusionné dans le groupe |
| 014b | [Écrans Sauvegarde et Restauration](014b-ecrans-sauvegarde.md) | 1 | F-03 | oui | à faire |
| 014c | [Base illisible au démarrage](014c-base-illisible.md) | 1 | F-03 | oui | à faire |
| 014d | [Invitation et bandeau de sauvegarde](014d-rappels-sauvegarde.md) | 1 | F-03 | non | à faire |
| 015 | [Tout effacer et purge : données](015-effacement-purge.md) | 1 | F-03 | oui | fusionné dans le groupe |
| 015b | [Écrans Conservation et Tout effacer](015b-ecrans-effacement.md) | 1 | F-03 | oui | à faire |
| 015c | [Mode de journal de la base fixé à l'ouverture](015c-mode-journal.md) | 1 | F-03 | oui | à faire |
| 016 | [Campagne Maestro du jalon 1](016-maestro-jalon-1.md) | 1 | F-01 à F-03 | non | à faire |
