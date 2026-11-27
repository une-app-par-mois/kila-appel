# 018 — Faille modérée de glob (GHSA-3g3m-2fjr-6pw4) dans l'outillage

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : 017 · Fichiers touchés : `package.json` (`overrides`), `package-lock.json`, `scripts/glob.test.js` (nouveau)

Créé le 2026-11-27 à l'intégration du lot 014f-015f-014g-017, à la demande du porteur (réponse aux questions du développement du 017 : un ticket à part pour glob).

## Contexte

`npm audit` signale une faille modérée dans glob `>= 9.0.0, <= 14.0.1` (GHSA-3g3m-2fjr-6pw4 : l'annulation par `AbortSignal` peut être contournée, et le parcours des fichiers continue après le délai). Le paquet arrive par l'outillage de test : jest 30 (`@jest/core`, `@jest/reporters`, `jest-config` : glob 13.0.7) et `test-exclude@7` (par `babel-plugin-istanbul@8`, `jest-expo`, `@jest/transform` : glob 10.5.0) ; jest est aussi installé avec `--omit=dev`, par expo-router et @testing-library/react-native. glob 7.2.3 (sous `test-exclude@6`) est hors de la plage. Rien n'est embarqué dans l'appli. Relevé du 2026-11-27 ; versions à revérifier au début du ticket.

`npm audit fix --force` propose de revenir à jest 29 : refusé (changement majeur, sans rapport avec la faille).

## Ce qui change

- `overrides` dans `package.json` limité à la plage vulnérable (comme le 017 pour minimatch) vers la première version corrigée de glob ; `npm install` pour mettre à jour le verrou de versions
- Garde-fou `scripts/glob.test.js` : échoue si une version de glob de la plage vulnérable revient dans `package-lock.json` (modèle : `scripts/minimatch.test.js`)

## Critères d'acceptation

- [ ] Aucune version de glob dans la plage vulnérable (>= 9.0.0, <= 14.0.1)
- [ ] `./scripts/test.sh` vert ; `npm audit` sans l'alerte glob
- [ ] Chaque paquet qui reçoit la nouvelle version de glob la charge sans erreur (`test-exclude@7`, `@jest/reporters`, `jest-config`), pas seulement la suite de tests (leçon du 017 : la suite restait verte avec un `test-exclude` cassé)
- [ ] APK de production construit et audité (`scripts/audit-apk.js`) sans changement de permissions
- [ ] Si une dépendance casse avec la nouvelle version : ne rien forcer, revenir en arrière et le dire (pas de contournement)

## Tests attendus

- `scripts/glob.test.js` (test d'abord : il échoue sur le verrou actuel)
- Tests existants toujours verts

## Hors périmètre

- Mise à jour de jest ou d'expo ; minimatch (017)

## Questions prévues

- Nouvelle version d'un paquet déjà présent : pas une dépendance nouvelle. Toute dépendance nouvelle apportée par la version corrigée (comme `@isaacs/nonrecursive-glob-match` au 017) est à proposer au porteur avec sa licence (cas « Arrête-toi et demande »).
- Si aucune version corrigée ne fonctionne avec `test-exclude@7` : laisser l'alerte ouverte, la classer avec motif, ou attendre une version de jest ; à poser au porteur.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter
