# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-27

## En cours

**Jalon 0 terminé** : PR #7 fusionnée dans `main` (squash `6f5579a`), CI verte 8/8 (tests, Semgrep, gitleaks, dépendances, CodeQL, build Android 17 min, build iOS `macos-26` 27 min). Prétest : APK de la CI installé et relancé sur l'émulateur Android 16 (`DB_READY { version: 1 }`) ; sur le Galaxy A55, build local du même code.

Réévaluation (PLAN §6) : moins de 2 h de porteur pour 6 h prévues ; 1,5 h par ticket gardée, une semaine d'avance en marge.

## Prochaines étapes

1. **Lot 4 (014c, 014d, 015b) fusionné dans le groupe** (PR #49 à #51 ; 1197 tests). Lots précédents : 013-014-015, 014b-015c, 014e (PR #37 à #46). Restauration vérifiée sur l'A55 (export, désinstallation, restauration identique) ; export vers Gmail et Drive vérifié ; mode de journal accepté (`DB_READY`).
   - **Prochain lot** : 014f (restaurer depuis l'écran de récupération), 015f (Tout effacer), 014g (vidage du dossier d'export sous le verrou commun) ; leurs trois plans de zone sensible à valider à la séance de lancement.
   - Puis 016 (Maestro) et la PR du jalon 1 vers `main`.
   - File du porteur (`docs/QUESTIONS.md`) : deux accords du 015b (« ses 1 groupe », « Garder les 1 dernières saisons »), à poser à la séance de clôture.
   - `docs/DECISIONS.md` : historique complet rétabli (les intégrations des lots 2 et 3 avaient remplacé les lignes au lieu d'ajouter en bas).
   - **À vérifier sur l'A55** : base réellement abîmée (APK de debug, `run-as` ; non faite), écran « abîmée », confirmation, puis Bienvenue ; durée de `quick_check` au démarrage avec une grosse base fictive ; invitation après le premier appel et bandeau des 30 jours (014d).
   - iPhone (avant toute publication iOS) : restauration réelle puis `tmp/` vide ; aucun lien dans `Caches/expo-sharing-tmp/` ; préfixe du cache identique entre expo-file-system et expo-modules-core.
   - PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.
   - Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).
   - `@expo/devtools` est dans le bundle de production : client WebSocket d'expo-sqlite, appelé seulement si `__DEV__` (jamais en production) ; INTERNET absente du binaire. Pas une violation d'ABS-01.
2. Fin du jalon 1 : bilan des décisions automatiques annulées : 0 à ce jour.
## Points d'attention

- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi. `groupe/jalon-0-outillage` a été poussée sur `e9c39bc` (documents seuls, sans test.sh réel) depuis la copie verte du ticket 001, par décision du porteur du 2026-11-26.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 22 vulnérabilités moyennes, aucune élevée, dans l'outillage de build d'Expo (`@expo/fingerprint`) ; CI à `--audit-level=high`.
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
- **Bases de test à effacer** (Galaxy A55, émulateur) : créées en version 1 sans `slots.schedule_from` ; désinstaller Ki&La avant la prochaine installation, sinon la création d'un créneau échouera.
- **Dependabot** ouvre ses PR vers `main` : chacune lance aussi les builds Android et iOS (environ 30 min).
- Requêtes métier jamais essayées sur le module natif `expo-sqlite` : seules l'ouverture et la migration 1 l'ont été, sur le Galaxy A55. Rien encore sur un iPhone réel.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
