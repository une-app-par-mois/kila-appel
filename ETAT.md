# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-26

## En cours

**Ticket 001** (socle Expo SDK 58, `scripts/test.sh` réel) sur `ticket/001-socle-expo`, partie de `groupe/jalon-0-outillage`. Cette branche de jalon part de `ticket/000-mise-en-route` : `main` ne contient que le commit initial (décision du porteur du 2026-11-26, notée dans `CLAUDE.md`). La PR du jalon 0 vers `main` remplacera la PR n°1.

`scripts/test.sh` est réel et vert (Biome, tsc, contrastes, Jest + couverture). Échec vérifié sur : test faux, couverture sous le seuil, `.only`, promesse flottante.

## Prochaines étapes

1. Ticket 001 : `/code-review`, test manuel `npx expo start` par le porteur, push (débloqué), PR vers `groupe/jalon-0-outillage`.
2. Pousser `ticket/000-mise-en-route` et décider du sort de la PR n°1 (proposition au porteur).
3. Jalon 0 : tickets 002 à 004 ; prétest de fin de jalon ; réévaluation du calendrier (`docs/PLAN.md` §6).

## Points d'attention

- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 22 vulnérabilités moyennes, aucune élevée, dans l'outillage de build d'Expo (`@expo/fingerprint`) ; CI à `--audit-level=high`.
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Questions ouvertes : contenu du rapport PDF (ticket F-09) ; compatibilité `node:sqlite` / `expo-sqlite` (ticket 002) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.

## Non vérifié

- Écran vide du ticket 001 jamais lancé sur un téléphone (`npx expo start` à faire par le porteur).
- CI jamais lancée (elle tournera sur la PR du jalon 0).
- Permission INTERNET encore présente par défaut (retrait et audit du binaire : ticket 004). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
