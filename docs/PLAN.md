# Plan de projet — Ki&La (appel)

Statut : ✅ validé le 2026-11-26

Dans quel ordre, en combien de temps, et quand c'est prêt. S'appuie sur tous les documents validés. Le détail des tickets est dans `docs/tickets/` ; seuls les jalons 0 et 1 sont rédigés en détail, les suivants le seront au début du jalon précédent.

## 1. Contraintes (décisions du porteur du 2026-11-26)

- **Disponibilité** : 6 à 10 h par semaine (valider les plans, tester sur appareil, relire).
- **Date cible** : publication **Android** fin janvier 2027. **iOS ensuite**, après un test sur un vrai iPhone (aucun appareil Apple ni Mac disponible).
- **Arbitrage** : jalons dans l'ordre de valeur ; si un jalon glisse, le porteur décide à ce moment-là de publier sans les derniers ou de décaler. Rien n'est retiré d'avance.
- **Appareils** : téléphone et tablette Android. **Testeur** : le porteur seul.
- **Mode de CI** : par jalon (une PR `groupe/jalon-<n>-…` vers `main`, CI complète à la fin).

## 2. Jalons

Le plus gros risque technique d'abord (jalon 0). Chaque jalon se termine par un **prétest sur appareil Android réel** et une réévaluation du calendrier.

| Jalon | Objectif | Fonctionnalités | Critère de sortie | Tickets | Heures porteur |
| --- | --- | --- | --- | --- | --- |
| 0 | Outillage et risques techniques | — | CI verte avec un premier test du domaine et un test de données sur `node:sqlite` ; APK de développement construit par la CI et installé sur le téléphone ; build iOS de test réussi sur le runner macOS (non signé) | 4 | 6 |
| 1 | Organiser, appeler, retrouver | F-01, F-02, F-03, EX-39 | Prétest : appel de 20 membres en moins de 30 s ; appel retrouvé après fermeture forcée ; sauvegarde → tout effacer → restauration identique ; campagne Maestro verte | 12 | 19 |
| 2 | Suivre l'assiduité | F-04, F-05, F-06 | Prétest : alerte levée puis traitée ; taux exacts sur un jeu fictif vérifié à la main ; relance reçue sur le téléphone, sans nom de membre | 13 | 18 |
| 3 | Entrer et sortir les données | F-07, F-08, F-09 | Prétest : import d'un CSV fictif Excel (UTF-8 et Windows-1252) ; CSV et PDF ouverts sur l'ordinateur | 20 (découpé le 2026-11-28 : 031 à 042, avec 032b et 039b ; 043, 044 et 044b ajoutés le 2026-11-28 ; 040b, 043b et 044c découpés le 2026-11-28) | 6 |
| 4 | Calendrier complet | F-10, F-11, F-13 | Prétest : stage sur 3 dates à 2 groupes ; séance préparée puis enregistrée ; séance annulée puis rétablie | 4 | 7 |
| 5 | Confort | F-12, F-14 | Prétest : frise et podium conformes aux maquettes | 2 | 3 |
| 6 | Publication Android | EX-40 à EX-42 | Pages légales et GitHub Pages en ligne ; audit adverse sans problème critique ou élevé ouvert ; `CHECKLIST-RELEASE.md` coché ; AAB signé par la CI déposé en test interne puis en production | 4 | 10 |
| 7 | Publication iOS | — | Test sur un vrai iPhone ; IPA signé par la CI sur TestFlight puis en production | 2 | 5 |

Total jusqu'à la publication Android (jalons 0 à 6) : **59 tickets, environ 69 h de porteur**, hors marge (total recompté le 2026-11-28 à la séance de lancement du lot J3-5 : 4 + 12 + 13 + 20 + 4 + 2 + 4).

**Jalon 3 en cours (2026-11-28, séance de lancement du lot J3-5)** : **12 tickets sur 20** fusionnés dans `groupe/jalon-3-entrer-sortir-donnees` (031, 032, 032b, 033, 034, 035, 036, 037, 038, 039, 039b, 044) ; lot J3-5 lancé (040a, 040b, 043, 043b, 044b) ; restent ensuite 041, 044c, puis 042 (campagne Maestro). Découpages du 040, du 043 et du 044b validés par le porteur : le jalon passe à 20 tickets.

**Jalon 2 fait (2026-11-28)** : PR #88 fusionnée dans `main` en squash (`40d70bb`), CI toute verte sur le dernier commit, campagne Maestro sur l'APK de la CI 7 parcours sur 7. **Fusionné sans le prétest sur l'A55**, sur décision du porteur du 2026-11-28 : le prétest reste à faire, et tout défaut trouvé devient un ticket corrigé au jalon 3, classé selon le §5. Critère de sortie en face de ce qui est vérifié :

| Critère de sortie | Vérifié | Reste à vérifier sur l'A55 (prétest) |
| --- | --- | --- |
| Alerte levée puis traitée | Campagne Maestro sur l'émulateur, APK de la CI (`alerte-traitee` : alerte levée, traitée, revenue après une absence de plus ; retour Android) | Écran d'alerte sur le téléphone : focus, retour Android |
| Taux exacts sur un jeu fictif vérifié à la main | Tests sur `node:sqlite` et campagne sur l'émulateur (`statistiques` : 87 %, 88 %, 78 %, 64 %, tableau du 023) | Requêtes des statistiques par expo-sqlite sur le téléphone ; NF-08 jugé à l'œil sur la sauvegarde de volume (indicatif sur l'émulateur : accueil 1,07 s, Stats 2,95 s) |
| Relance reçue sur le téléphone, sans nom de membre | Réglage et dialogue de permission pilotés sur l'émulateur (`relance-reglage` : pas maintenant, autoriser, refuser) | Relance reçue à l'heure, écran verrouillé sans nom de membre, appui vers l'appel, après redémarrage, en mode avion (liste de recette de `ETAT.md`) |

## 3. Calendrier estimé

| Semaine | Jalon |
| --- | --- |
| 30 nov. – 6 déc. 2026 | 0 |
| 7 – 20 déc. | 1 |
| 21 déc. – 3 janv. 2027 (vacances : rythme réduit) | 2 |
| 4 – 10 janv. | 3 |
| 11 – 17 janv. | 4 |
| 18 – 22 janv. | 5 |
| 23 – 31 janv. | 6 : publication Android |
| Février | 7 : iOS, dès qu'un iPhone est disponible |

**Ce calendrier n'a pas la marge de 30 %** recommandée : avec elle, la publication Android tomberait vers la mi-février. D'où l'arbitrage du §1 : les jalons 4 et 5 sont les premiers candidats à passer en version 1.1 si un retard s'accumule, sur décision du porteur à la fin du jalon 3.

## 4. Piste du porteur

Démarches hors code, à lancer tôt à cause des délais.

| Action | Pour quel jalon | Avant le |
| --- | --- | --- |
| Lancer Claude Code depuis `kila-appel/` pour que les garde-fous de `.claude/settings.json` s'appliquent | 0 | Prochaine session |
| Installer Node 22 (déjà là), Android Studio ou les outils de plateforme Android, et Maestro sur le poste | 0, 1 | 6 déc. |
| Choisir le nom de paquet (Android et iOS) | 0 | 6 déc. |
| Créer la clé de signature Android (upload key) et la poser en secret GitHub ; activer la signature par Google Play | 6 | 15 janv. |
| Activer GitHub Pages sur le dépôt | 6 | 15 janv. |
| Déclarer Jita Vision commerçant (DSA) sur Play Console et App Store Connect | 6, 7 | 31 janv. (date limite Google : 1er févr. 2027) |
| Créer la fiche Play (nouvelle appli), public 16+ | 6 | 20 janv. |
| Certificats et profils iOS dans le compte Apple de Jita Vision, posés en secrets GitHub | 7 | Février |
| Trouver un iPhone pour le test iOS | 7 | Février |

## 5. Recette et lancement

- **Prétest de fin de jalon** : le porteur déroule le critère de sortie sur son téléphone Android (et la tablette pour la mise en page) ; chaque défaut devient un ticket, classé :
  - **bloquant** (perte ou fuite de données, plantage, appel impossible) : corrigé avant de fermer le jalon ;
  - **majeur** (fonction fausse ou inutilisable) : corrigé dans le jalon ou le suivant ;
  - **mineur** (aspect, texte) : planifié.
- **Bêta** : le porteur seul, sur la piste de test interne de Play, pendant au moins une semaine de vrais appels avant la production.
- **Critères de publication Android** : aucun défaut bloquant ou majeur ouvert ; critères de réussite du cadrage vérifiés (sauf iOS) ; audit adverse consigné dans `AUDIT.md` ; permissions du binaire conformes (SEC-02).
- **Lancement progressif** : déploiement Play par paliers (par exemple 20 %, puis 100 %) ; retour arrière = arrêt du déploiement et nouvelle version corrective (une version publiée ne se retire pas des appareils).

## 6. Réévaluation

À la fin de chaque jalon : heures réellement passées, calendrier recalculé, décision du porteur si la date est menacée. Noté dans `ETAT.md`.

- 2026-11-28 (fin du jalon 2) : jalon 2 fait le 28 nov., prévu sur la période du 21 déc. au 3 janv. ; heures réellement passées par le porteur **non mesurées** (18 h prévues) ; calendrier non recalculé faute de mesure, avance de plusieurs semaines sur le §3 ; prétest sur l'A55 reporté (décision du porteur du 2026-11-28). Décisions automatiques du jalon 2 : 204, dont 11 changées après contradiction, 0 contestée maintenue, **0 annulée** par le porteur ; 2 annulées depuis le début du projet (015b).

## Décisions du porteur

- 2026-11-28 (séance de lancement du lot J3-5) : découpages validés par le porteur, plus de 10 fichiers en zone sensible : 040 en 040a (adaptateur et nettoyage) et 040b (cycle du rapport) ; 043 en 043 (schéma, écriture, sauvegarde) et 043b (règle RM-03) ; 044b en 044b (liste SEC-06 élargie) et 044c (saison, créneau, contact, après le 043) ; jalon 3 : 20 tickets au lieu de 17, total jusqu'au jalon 6 : 59 tickets ; heures du porteur inchangées (6 h pour le jalon 3).
- 2026-11-28 (séance de lancement du lot J3-4) : ticket 044b créé (saison, créneau, libellé de contact : même règle SEC-06 que les noms de groupe du 044) ; jalon 3 : 17 tickets au lieu de 16, total jusqu'au jalon 6 : 56 tickets ; heures du porteur inchangées (6 h pour le jalon 3).
- 2026-11-28 (fin du jalon 2) : jalon 2 fusionné dans `main` (PR #88) sans le prétest sur l'A55 ; le prétest reste à faire, tout défaut trouvé devient un ticket corrigé au jalon 3 (classement du §5).
- 2026-11-27 (séance de lancement du lot J2-4) : ticket 028b découpé en 028b (programmation) et 028c (appui sur la notification, Tout effacer, restauration), plus de 10 fichiers en zone sensible ; jalon 2 : 13 tickets au lieu de 12, total jusqu'au jalon 6 : 43 tickets ; heures du porteur inchangées (18 h pour le jalon 2).
- 2026-11-27 (séance de lancement du lot J2-3) : ticket 028 découpé en 028a (adaptateur et garde-fous) et 028b (reprogrammation, appui sur la notification, Tout effacer) ; jalon 2 : 12 tickets au lieu de 11, total jusqu'au jalon 6 : 42 tickets ; heures du porteur inchangées (18 h pour le jalon 2), le 028b reprenant une partie du travail prévu au 028.
- 2026-11-27 (séance de découpage du jalon 2) : découpage accepté, 11 tickets (020 à 030) au lieu de 5, chacun sous 10 fichiers ; heures du porteur recalées en proportion de l'estimation du plan (8 h pour 5 tickets, soit 1,6 h par ticket : 11 × 1,6 = 17,6, arrondi à 18 h) ; total jusqu'au jalon 6 : 41 tickets et environ 69 h (59 + 10).
- 2026-11-26 (fin du jalon 0) : jalon 0 terminé le 26 nov. au lieu du 6 déc., en moins de 2 h de porteur pour 6 h prévues ; estimation de 1,5 h par ticket **gardée** (jalon d'outillage, peu représentatif), l'avance d'une semaine devient de la marge ; recalage à la fin du jalon 1.
- 2026-11-26 : ordre des jalons gardé (4 et 5 premiers candidats au report) ; estimation de 1,5 h par ticket, recalée au jalon 0 ; bêta d'une semaine par le porteur seul.
