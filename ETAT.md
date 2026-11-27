# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-27

## En cours

**Jalon 1 : tous les tickets fusionnés dans le groupe**, PR vers `main` à ouvrir. **Jalon 0 terminé** : PR #7 fusionnée dans `main` (squash `6f5579a`), CI verte 8/8 (tests, Semgrep, gitleaks, dépendances, CodeQL, build Android 17 min, build iOS `macos-26` 27 min). Prétest : APK de la CI installé et relancé sur l'émulateur Android 16 (`DB_READY { version: 1 }`) ; sur le Galaxy A55, build local du même code.

Réévaluation (PLAN §6) : moins de 2 h de porteur pour 6 h prévues ; 1,5 h par ticket gardée, une semaine d'avance en marge.

## Prochaines étapes

1. **Jalon 1 : tous les tickets fusionnés dans le groupe** `groupe/jalon-1-organiser-appeler-retrouver` (1304 tests). Dernier lot, lot 6 : 018 (glob, PR #60) et 016 (Maestro, PR #61). Lots précédents : 013-014-015, 014b-015c, 014e (PR #37 à #46), lot 4 (PR #49 à #51), lot 5 (PR #54 à #57).
   - **Campagne Maestro verte** sur l'émulateur local API 36 (Android 16), APK de version construit en local : appel de 20 membres en **24,9 s** (3 absents, 1 retard ; seuil de 30 s), chronomètre parti de la liste des groupes, par décision du porteur du 2026-11-27 (écart au cadrage « de l'ouverture à l'enregistrement » noté) ; brouillon retrouvé après `stopApp` ; sauvegarde jusqu'à la feuille de partage, Tout effacer, restauration d'une sauvegarde fictive depuis Téléchargements.
   - **Recette sur l'A55 des lots 4, 5 et 6 non faite**, par décision du porteur du 2026-11-27. Jamais tourné sur un appareil réel :
     - base réellement abîmée (APK de debug, `run-as`) : écran « abîmée », confirmation, Bienvenue ;
     - restauration depuis l'écran de récupération (014f) ; restauration depuis Drive ; aller-retour réel (export vers Drive ou Gmail, puis restauration de ce fichier) ;
     - Tout effacer, restauration sur une base recréée et invitation après le premier appel : vus **sur l'émulateur seulement** (016) ;
     - bandeau des 30 jours (014d) ; durée de `quick_check` avec une grosse base fictive ;
     - blocage du retour Android pendant l'effacement et la recopie (014f) et pendant Tout effacer (015f) ;
     - brouillon après redémarrage de l'appareil ; NF-01 au vrai doigt ; `scripts/e2e.sh --appareil-reel`.
   - **Suite** :
     a. PR du jalon 1 vers `main` (CI complète, artefact `kila-apk-test`) ;
     b. campagne `./scripts/e2e.sh <apk de la CI>` sur l'APK de la CI ;
     c. accord du porteur, puis fusion `--squash` ;
     d. séance de clôture : `docs/QUESTIONS.md` (deux accords du 015b ; lot 6 : aucune question), bilan des décisions ;
     e. vérifications iPhone avant toute publication iOS : restauration réelle puis `tmp/` vide ; aucun lien dans `Caches/expo-sharing-tmp/` ; préfixe du cache identique entre expo-file-system et expo-modules-core ; Inbox `tmp/<identifiant>-Inbox/` vidée par Tout effacer et par le démarrage ; restauration depuis l'écran de récupération.
   - L'alerte Dependabot (minimatch, glob) se fermera à la fusion dans `main` (Dependabot ne lit que la branche par défaut).
   - PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.
   - Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).
   - `@expo/devtools` est dans le bundle de production : client WebSocket d'expo-sqlite, appelé seulement si `__DEV__` (jamais en production) ; INTERNET absente du binaire. Pas une violation d'ABS-01.
2. **Bilan des décisions automatiques, fin du jalon 1** (`docs/DECISIONS.md`) : 206 lignes ; **0 annulée** ; 9 changées après contradiction ; 0 contestée, maintenue ; 2 en attente du porteur (015b, dans `docs/QUESTIONS.md`) ; 27 changées après revue ; 3 décidées par le porteur (NF-01, 016) ; les autres à relire, posées, répondues ou validées par le porteur.

## Points d'attention

- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi. `groupe/jalon-0-outillage` a été poussée sur `e9c39bc` (documents seuls, sans test.sh réel) depuis la copie verte du ticket 001, par décision du porteur du 2026-11-26.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 0 vulnérabilité depuis le 018 (glob) et le 017 (minimatch), par `overrides` limités à la plage vulnérable ; CI à `--audit-level=high`.
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Registre des licences (EX-42, jalon 6) : y faire figurer les polices IBM Plex (OFL 1.1, `assets/fonts/SOURCES.md`).
- `node:sqlite` est expérimental dans Node 22 : avertissement à chaque test de données, sans effet.
- Questions ouvertes : contenu du rapport PDF (ticket F-09) ; migration 1 à lancer sur le téléphone (ticket 004, fin d'ADR-008) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.

## Non vérifié

- Écran vide du ticket 001 jamais lancé sur un téléphone (`npx expo start` à faire par le porteur).
- CI jamais lancée (elle tournera sur la PR du jalon 0).
- Polices jamais vues à l'écran (rendu avec les premiers écrans du jalon 1) ; couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- **Bases de test à effacer** (Galaxy A55, émulateur) : une base d'un ancien build (migration 1 sans `slots.schedule_from`) fait échouer la création d'un créneau et donne aussi un accueil vide (`DRAFT_LOAD_FAILED`, `PROPOSED_SESSION_FAILED`, `MISSING_CALLS_FAILED`, avec `DB_READY` version 1), constaté sur l'émulateur au 016. **Désinstaller Ki&La avant d'installer** un nouvel APK.
- **Dependabot** ouvre ses PR vers `main` : chacune lance aussi les builds Android et iOS (environ 30 min).
- Requêtes métier jamais essayées sur le module natif `expo-sqlite` : seules l'ouverture et la migration 1 l'ont été, sur le Galaxy A55. Rien encore sur un iPhone réel.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
