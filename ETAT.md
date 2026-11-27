# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-27

## En cours

**Jalon 1 fait** : PR #63 fusionnée dans `main` en squash le 2026-11-27 (`main` à `91ed684`), 1304 tests. CI toute verte (Semgrep et CodeQL après le 019), campagne Maestro verte sur l'APK de la CI (appel de 20 membres en 23,5 s), accord du porteur. Alertes Dependabot : 0 ouverte. **Jalon 0 fait** (PR #7, `6f5579a`).

Branche du jalon 2 : `groupe/jalon-2-suivre-assiduite`, partie de `main`. Séance de clôture du jalon 1 faite : réponses du porteur aux deux questions du 015b (accords au singulier), ticket 020 créé ; `docs/QUESTIONS.md` vide.

## Bilan des décisions automatiques, fin du jalon 1

`docs/DECISIONS.md` : **2 annulées** (les deux accords du 015b, corrigés par le 020) ; 9 changées après contradiction ; 27 changées après revue ; 3 décidées par le porteur (NF-01, 016) ; 0 en attente du porteur ; les autres à relire, posées, répondues ou validées par le porteur.

## Prochaines étapes

1. **Séance de découpage du jalon 2** (Suivre l'assiduité, `docs/PLAN.md` §2) : F-04 (alerte), F-05 (taux), F-06 (relances).
   - ADR-007 : notifications locales.
   - Nouvelle dépendance probable, expo-notifications : **cas réservé**, à proposer au porteur avec sa raison, sa licence et sa date de dernière mise à jour, nom exact vérifié ; permissions auditées sur le binaire (ABS-01, ABS-07, ABS-04 : aucune relance avec un nom de membre).
   - Prétest du jalon : alerte levée puis traitée ; taux exacts sur un jeu fictif vérifié à la main ; relance reçue sur le téléphone, sans nom de membre.
2. **Lot 1 du jalon 2**, avec le 020 (accords au singulier, textes seulement).
3. **Recette sur l'A55 des lots 4, 5 et 6 jamais faite** (décision du porteur du 2026-11-27). À vérifier à la main dès que le téléphone est disponible :
   - aller-retour réel : export vers Drive ou Gmail, puis restauration de ce fichier ; restauration depuis Drive ;
   - base réellement abîmée (APK de debug, `run-as`) : écran « abîmée », confirmation, Bienvenue ; restauration depuis l'écran de récupération (014f) ;
   - brouillon après redémarrage de l'appareil ;
   - durée de `quick_check` avec une grosse base fictive ;
   - blocage du retour Android pendant l'effacement et la recopie (014f) et pendant Tout effacer (015f) ;
   - Tout effacer, restauration sur une base recréée et invitation après le premier appel : vus **sur l'émulateur seulement** (016) ;
   - bandeau des 30 jours (014d) ; NF-01 au vrai doigt ; `scripts/e2e.sh --appareil-reel`.
4. **Vérifications iPhone avant le jalon 7** (toute publication iOS) : restauration réelle puis `tmp/` vide ; aucun lien dans `Caches/expo-sharing-tmp/` ; préfixe du cache identique entre expo-file-system et expo-modules-core ; Inbox `tmp/<identifiant>-Inbox/` vidée par Tout effacer et par le démarrage ; restauration depuis l'écran de récupération.
5. PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.

## Points d'attention

- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 0 vulnérabilité depuis le 018 (glob) et le 017 (minimatch), par `overrides` limités à la plage vulnérable ; CI à `--audit-level=high`.
- `@expo/devtools` est dans le bundle de production : client WebSocket d'expo-sqlite, appelé seulement si `__DEV__` ; INTERNET absente du binaire. Pas une violation d'ABS-01.
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Registre des licences (EX-42, jalon 6) : y faire figurer les polices IBM Plex (OFL 1.1, `assets/fonts/SOURCES.md`).
- `node:sqlite` est expérimental dans Node 22 : avertissement à chaque test de données, sans effet.
- Questions ouvertes : contenu du rapport PDF (ticket F-09) ; migration 1 à lancer sur le téléphone (ticket 004, fin d'ADR-008) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.
- **Dependabot** ouvre ses PR vers `main` : chacune lance aussi les builds Android et iOS (environ 30 min).
- Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).

## Non vérifié

- **Bases de test à effacer** (Galaxy A55, émulateur) : une base d'un ancien build (migration 1 sans `slots.schedule_from`) fait échouer la création d'un créneau et donne aussi un accueil vide (`DRAFT_LOAD_FAILED`, `PROPOSED_SESSION_FAILED`, `MISSING_CALLS_FAILED`, avec `DB_READY` version 1), constaté sur l'émulateur au 016. **Désinstaller Ki&La avant d'installer** un nouvel APK.
- Requêtes métier sur le module natif `expo-sqlite` : vues sur l'émulateur (016) ; sur le Galaxy A55, recette des lots 4 à 6 non faite. Rien encore sur un iPhone réel.
- Couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
