# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-26

## En cours

**Ticket 004** (builds sur la CI, audit des permissions, zone sensible) sur `ticket/004-builds-ci`, partie de `groupe/jalon-0-outillage`. Tickets 001 à 003 fusionnés dans le groupe (PR #2 à #4). La branche du jalon part de `ticket/000-mise-en-route` (décision du 2026-11-26, notée dans `CLAUDE.md`) ; PR n°1 fermée sans fusion.

## Prochaines étapes

1. Ticket 004 : tests d'abord, build local et audit, `/code-review`, `/security-review`, relecture du porteur, fusion dans le groupe.
2. PR du jalon 0 vers `main` : CI complète (tests, sécurité, builds Android et iOS) ; APK installé sur le téléphone, migration vue dans `adb logcat` (fin d'ADR-008).
3. Prétest de fin de jalon, réévaluation du calendrier (`docs/PLAN.md` §6).

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
- Adaptateur `expo-sqlite` testé sur une imitation branchée sur `node:sqlite`, jamais sur le module natif (ticket 004).
- Permission INTERNET encore présente par défaut (retrait et audit du binaire : ticket 004). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
