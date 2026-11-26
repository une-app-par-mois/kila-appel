# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-26

## En cours

Préparation (niveau renforcé) **terminée** le 2026-11-26, sur la branche `ticket/000-mise-en-route` (PR n°1, brouillon, non fusionnée). Tous les documents sont validés : cadrage, PRD (révision 1), charte, maquettes (61 écrans), architecture et ADR 001 à 009, sécurité, conformité, conventions et DoD, plan.

Aucun ticket de code en cours.

## Prochaines étapes

1. Ticket 001 (socle Expo, `scripts/test.sh` réel) sur `groupe/jalon-0-outillage` : il débloque le push et la CI.
2. Pousser `ticket/000-mise-en-route` dès que `scripts/test.sh` passe (beaucoup de commits locaux), puis décider avec le porteur du sort de la PR n°1.
3. Jalon 0 : tickets 002 à 004 ; prétest de fin de jalon ; réévaluation du calendrier (`docs/PLAN.md` §6).

## Points d'attention

- **Push bloqué** jusqu'au ticket 001 : le hook pre-push lance `scripts/test.sh`, qui échoue tant que la stack n'existe pas (`--no-verify` interdit).
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Questions ouvertes : contenu du rapport PDF (ticket F-09) ; compatibilité `node:sqlite` / `expo-sqlite` (ticket 002) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.

## Non vérifié

- Rien de codé. Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
