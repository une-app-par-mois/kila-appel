# Tickets

Un ticket = une intention, réalisable et vérifiable en une session, touchant idéalement moins de 10 fichiers. Un ticket trop gros est découpé **avant** de commencer.

Fichiers `NNN-intitule-court.md`, numérotés dans l'ordre de création, à partir de `000-modele.md`. Le statut est tenu dans le ticket et dans le tableau ci-dessous.

Statuts : à faire, en cours, fusionné dans le groupe (mode par groupe ou par jalon, en attendant la CI du groupe), fait (dans `main`).

## Jalons

Un jalon = un objectif vérifiable et son critère de sortie. En mode par jalon, une branche `groupe/jalon-<n>-<intitulé>` et une seule CI à la fin.

| Jalon | Objectif | Critère de sortie | Branche | Statut |
| --- | --- | --- | --- | --- |
| 0 | Outillage et risques techniques | Voir `docs/PLAN.md` §2 | `groupe/jalon-0-outillage` | fait (PR #7) |
| 1 | Organiser, appeler, retrouver | Voir `docs/PLAN.md` §2 | `groupe/jalon-1-organiser-appeler-retrouver` | fait (PR #63) |
| 2 | Suivre l'assiduité (F-04, F-05, F-06) | Voir `docs/PLAN.md` §2 | `groupe/jalon-2-suivre-assiduite` | fait (PR #88), sans le prétest sur l'A55 (décision du porteur du 2026-11-28) |
| 3 | Entrer et sortir les données (F-07, F-08, F-09) | Voir `docs/PLAN.md` §2 | `groupe/jalon-3-entrer-sortir-donnees` | découpé (14 tickets : 031 à 042, avec 032b et 039b, 2026-11-28) ; plans validés par le porteur le 2026-11-28 |
| 4 à 7 | Détaillés au début du jalon précédent | `docs/PLAN.md` §2 | — | à faire |

## Tickets

| N° | Ticket | Jalon | Fonctionnalités | Zone sensible | Statut |
| --- | --- | --- | --- | --- | --- |
| 001 | [Socle Expo SDK 58 et scripts de test](001-socle-expo.md) | 0 | — | non | fait |
| 002 | [Couche données testable et migration 1](002-couche-donnees.md) | 0 | F-01 à F-14 (schéma) | oui | fait |
| 003 | [Garde-fous automatiques, thème et polices](003-garde-fous-theme.md) | 0 | — | non | fait |
| 004 | [Builds sur la CI et audit des permissions](004-builds-ci.md) | 0 | — | oui | fait |
| 005 | [Domaine : occurrences des créneaux et appels manquants](005-domaine-occurrences.md) | 1 | F-02, F-03 | oui | fait |
| 006 | [Saisons et groupes : dépôts et hooks](006-saisons-groupes.md) | 1 | F-01 | oui | fait |
| 006b | [Composants de base](006b-composants-base.md) | 1 | F-01 | non | fait |
| 006c | [Écrans des saisons](006c-ecrans-saisons-groupes.md) | 1 | F-01 | oui | fait |
| 006d | [Écrans des groupes](006d-ecrans-groupes.md) | 1 | F-01 | oui | fait |
| 006e | [Licences embarquées](006e-licences.md) | 1 | — | non | fait |
| 006f | [Saison modifiée sans inscription hors dates](006f-saison-inscriptions.md) | 1 | F-01 | oui | fait |
| 007 | [Membres et inscriptions : données](007-membres-inscriptions.md) | 1 | F-01 | oui | fait |
| 007b | [Écrans des membres](007b-ecrans-membres.md) | 1 | F-01 | oui | fait |
| 007c | [Écrans des inscriptions](007c-inscriptions.md) | 1 | F-01 | non | fait |
| 007d | [Effacement dans le fichier](007d-effacement-securise.md) | 1 | — | oui | fait |
| 007e | [Inscription dans les dates de la saison](007e-dates-inscription.md) | 1 | F-01 | non | fait |
| 008 | [Contacts d'urgence : données](008-contacts-urgence.md) | 1 | F-01 | non | fait |
| 008b | [Contacts d'urgence : écrans](008b-ecrans-contacts.md) | 1 | F-01 | non | fait |
| 009 | [Créneaux récurrents : données](009-creneaux-donnees.md) | 1 | F-02 | non | fait |
| 009b | [Créneaux récurrents : écrans](009b-creneaux-ecrans.md) | 1 | F-02 | non | fait |
| 010 | [Appel : données](010-appel-donnees.md) | 1 | F-02 | non | fait |
| 010b | [Écran d'appel](010b-ecran-appel.md) | 1 | F-02 | non | fait |
| 010c | [Appel sans créneau, ajout pendant l'appel](010c-appel-libre-ajout.md) | 1 | F-02 | non | fait |
| 011 | [Brouillon d'appel](011-brouillon-appel.md) | 1 | F-02 | oui | fait |
| 011b | [Suppressions et appel en cours](011b-suppressions-appel-en-cours.md) | 1 | F-02 | oui | fait |
| 012 | [Onglets et accueil](012-accueil-navigation.md) | 1 | F-01, F-02, F-03 | non | fait |
| 012b | [Bienvenue](012b-bienvenue.md) | 1 | F-01 | non | fait |
| 012c | [États vides](012c-etats-vides.md) | 1 | F-01, F-02, F-03 | non | fait |
| 013 | [Historique et correction des appels](013-historique.md) | 1 | F-03 | non | fait |
| 014 | [Sauvegarde et restauration : données](014-sauvegarde-restauration.md) | 1 | F-03 | oui | fait |
| 014b | [Écran Sauvegarde : export](014b-ecrans-sauvegarde.md) | 1 | F-03 | oui | fait |
| 014f | [Restaurer depuis l'écran de récupération](014f-restauration-recuperation.md) | 1 | F-03 | oui | fait |
| 014e | [Écran Restauration](014e-ecran-restauration.md) | 1 | F-03 | oui | fait |
| 014c | [Base illisible au démarrage](014c-base-illisible.md) | 1 | F-03 | oui | fait |
| 014d | [Invitation et bandeau de sauvegarde](014d-rappels-sauvegarde.md) | 1 | F-03 | non | fait |
| 014g | [Vidage du dossier d'export sous le verrou commun](014g-export-vidage-verrou.md) | 1 | F-03 | oui | fait |
| 015 | [Tout effacer et purge : données](015-effacement-purge.md) | 1 | F-03 | oui | fait |
| 015b | [Conservation et purge des anciennes saisons](015b-ecrans-effacement.md) | 1 | F-03 | oui | fait |
| 015f | [Tout effacer](015f-tout-effacer.md) | 1 | F-03 | oui | fait |
| 015c | [Mode de journal de la base fixé à l'ouverture](015c-mode-journal.md) | 1 | F-03 | oui | fait |
| 016 | [Campagne Maestro du jalon 1](016-maestro-jalon-1.md) | 1 | F-01 à F-03 | non | fait |
| 017 | [minimatch 11 forcé (Dependabot n° 2)](017-minimatch-overrides.md) | 1 | — | non | fait |
| 018 | [Faille modérée de glob (GHSA-3g3m-2fjr-6pw4) dans l'outillage](018-glob-ghsa-3g3m.md) | 1 | — | non | fait |
| 019 | [Alertes Semgrep et CodeQL de la PR du jalon 1](019-alertes-ci-jalon-1.md) | 1 | SEC | non | fait |
| 020 | [Accords au singulier : purge et conservation](020-accords-singulier.md) | 2 | F-03 | non | fait |
| 021 | [Alertes d'assiduité : calcul et données](021-alertes-calcul.md) | 2 | F-04 | oui | fait |
| 022 | [Alertes d'assiduité : écrans](022-alertes-ecrans.md) | 2 | F-04 | non | fait |
| 023 | [Statistiques : calcul et données](023-statistiques-calcul.md) | 2 | F-05 | oui | fait |
| 024 | [Statistiques : onglet et période](024-statistiques-onglet.md) | 2 | F-05 | non | fait |
| 025 | [Statistiques d'un groupe et d'un membre](025-statistiques-groupe-membre.md) | 2 | F-05 | non | fait |
| 026 | [Relance : expo-notifications et garde-fous du binaire](026-relance-dependance.md) | 2 | F-06 | oui | fait |
| 027 | [Relance : calcul des relances et réglages](027-relance-calcul.md) | 2 | F-06 | oui | fait |
| 028 | [Relance : programmation sur l'appareil](028-relance-programmation.md) (028a : adaptateur et garde-fous) | 2 | F-06 | oui | fait |
| 028b | [Relance : programmation](028b-relance-reprogrammation.md) | 2 | F-06 | oui | fait |
| 028c | [Relance : appui et effacement](028c-relance-appui-effacement.md) | 2 | F-06 | oui | fait |
| 029 | [Relance : réglage et demande de permission](029-relance-reglage.md) | 2 | F-06 | oui | fait |
| 030 | [Campagne Maestro du jalon 2](030-maestro-jalon-2.md) | 2 | F-04 à F-06 | non | fait |
| 031 | [Import CSV : décodage et lecture du fichier](031-csv-lecture.md) | 3 | F-07 | oui | à faire |
| 032 | [Import CSV : règles de l'import et aperçu](032-import-regles.md) | 3 | F-07 | oui | à faire |
| 032b | [Fiche membre : nom et prénom de 100 caractères au plus](032b-saisie-longueur-nom.md) | 3 | F-01, SEC-06 | non | à faire |
| 033 | [Fichiers des échanges : adaptateur, verrou et nettoyage](033-fichiers-echanges.md) | 3 | F-07 à F-09 | oui | à faire |
| 034 | [Import CSV : enregistrement et parcours](034-import-enregistrement.md) | 3 | F-07 | oui | à faire |
| 035 | [Import CSV : écrans](035-import-ecrans.md) | 3 | F-07 | non | à faire |
| 036 | [Export CSV des présences : contenu](036-export-csv-contenu.md) | 3 | F-08 | oui | à faire |
| 037 | [Export CSV des présences : écran et partage](037-export-csv-ecran.md) | 3 | F-08 | oui | à faire |
| 038 | [Rapport PDF : expo-print et garde-fous du binaire](038-rapport-dependance.md) | 3 | F-09 | oui | à faire |
| 039 | [Rapport PDF : synthèse et taux (HTML)](039-rapport-contenu.md) | 3 | F-09 | oui | à faire |
| 039b | [Rapport PDF : grille séance par séance](039b-rapport-grille.md) | 3 | F-09 | oui | à faire |
| 040 | [Rapport PDF : production du fichier et partage](040-rapport-production.md) | 3 | F-09 | oui | à faire |
| 041 | [Rapport PDF : écran](041-rapport-ecran.md) | 3 | F-09 | non | à faire |
| 042 | [Campagne Maestro du jalon 3](042-maestro-jalon-3.md) | 3 | F-07 à F-09 | non | à faire |
