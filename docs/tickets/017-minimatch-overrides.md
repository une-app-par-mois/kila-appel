# 017 — minimatch 11 forcé (alerte Dependabot n° 2)

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : — · Fichiers touchés : `package.json` (`overrides`), `package-lock.json`

## Contexte

Dependabot signale une faille modérée (déni de service par motifs de fichiers) dans minimatch `>= 7.0.0, < 11.0.1`. Le paquet n'arrive que par l'outillage de test (jest, par expo-router et @testing-library/react-native) ; il n'est pas embarqué dans l'appli.

## Ce qui change

- `overrides` dans `package.json` pour forcer minimatch `^11.0.1` partout ; `npm install` pour mettre à jour le verrou de versions

## Critères d'acceptation

- [ ] `npm ls minimatch` ne montre plus aucune version inférieure à 11.0.1
- [ ] `./scripts/test.sh` vert ; `npm audit` sans l'alerte minimatch
- [ ] APK de production construit et audité (`scripts/audit-apk.js`) sans changement de permissions
- [ ] Si une dépendance casse avec minimatch 11 : ne rien forcer, revenir en arrière et le dire (pas de contournement)

## Questions prévues

- Séance de lancement du lot 014f-015f-014g (2026-11-27), réponses du porteur : forcer minimatch 11 par `overrides` (option recommandée), plutôt que laisser l'alerte ouverte ou la classer. Pas de dépendance nouvelle : une version plus récente d'un paquet déjà présent.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
