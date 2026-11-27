# 017 — minimatch 11 forcé (alerte Dependabot n° 2)

Statut : fusionné dans le groupe (PR #55, 2026-11-27) · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : — · Fichiers touchés : `package.json` (`overrides`), `package-lock.json`, `scripts/minimatch.test.js`

## Contexte

Dependabot signale une faille modérée (déni de service par motifs de fichiers) dans minimatch `>= 7.0.0, < 11.0.1`. Le paquet arrive par l'outillage de test (jest, par expo-router et @testing-library/react-native) et par l'outillage de build (`@expo/fingerprint`, installé aussi avec `--omit=dev`) ; rien n'est embarqué dans l'appli (corrigé à l'intégration du lot 5).

## Ce qui change

- `overrides` dans `package.json` pour forcer minimatch `^11.0.1` partout ; `npm install` pour mettre à jour le verrou de versions

## Critères d'acceptation

- [x] Aucune version de minimatch dans la plage vulnérable (>= 7.0.0, < 11.0.1) ; minimatch 3.1.5, hors de la plage, reste sous `test-exclude@6`
- [x] `./scripts/test.sh` vert ; `npm audit` sans l'alerte minimatch
- [x] APK de production construit et audité (`scripts/audit-apk.js`) sans changement de permissions
- [x] Si une dépendance casse avec minimatch 11 : ne rien forcer, revenir en arrière et le dire (pas de contournement) — `test-exclude@6` cassait : override limité à la plage vulnérable, validé par le porteur le 2026-11-27

## Questions prévues

- Séance de lancement du lot 014f-015f-014g (2026-11-27), réponses du porteur : forcer minimatch 11 par `overrides` (option recommandée), plutôt que laisser l'alerte ouverte ou la classer. Pas de dépendance nouvelle : une version plus récente d'un paquet déjà présent.
- Réponses du porteur du 2026-11-27 aux questions du développement :
  - override limité à la plage vulnérable (`"minimatch@>=7.0.0": "^11.0.1"`) gardé, car forcer minimatch 11 partout casse `test-exclude@6` (interface de minimatch 3) ; minimatch 3.1.5, hors de la plage vulnérable, reste installé ; critère d'acceptation corrigé en conséquence ;
  - `@isaacs/nonrecursive-glob-match` 1.1.0 (licence BlueOak-1.0.0), apportée par minimatch 11, acceptée ;
  - la faille de `glob` (GHSA-3g3m-2fjr-6pw4) fera l'objet d'un ticket séparé, créé à l'intégration.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Syntaxe de l'`overrides` | `"minimatch": "^11.0.1"` partout · `"minimatch@>=7.0.0": "^11.0.1"` (plage vulnérable seule) | `"minimatch@>=7.0.0": "^11.0.1"` | L'override global installe minimatch 11 sous `test-exclude@6.0.0` (par `babel-jest@29`, `@react-native/jest-preset`), écrit pour l'interface de minimatch 3 : `require('test-exclude')` puis `shouldInstrument` lève `TypeError: minimatch is not a function`. La suite reste verte car Jest passe par `test-exclude@7`, mais la casse est réelle. Les versions 3.x sont hors de la plage vulnérable (>= 7.0.0, < 11.0.1). | validée par le porteur le 2026-11-27 |
| Garde-fou de régression | aucun test · test qui lit `package-lock.json` | `scripts/minimatch.test.js` : échoue si une version de minimatch de la plage vulnérable revient dans le verrou | Test d'abord ; empêche une mise à jour future de réintroduire l'alerte sans bruit | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : « Outillage : minimatch forcé en 11.0.9 sur la plage vulnérable (>= 7.0.0) par `overrides`, alerte Dependabot n° 2 levée ; garde-fou `scripts/minimatch.test.js` (017). »
- Architecture : rien. minimatch 11 et `@isaacs/nonrecursive-glob-match` servent à l'outillage de développement et de build (`@expo/fingerprint`, installé aussi avec `--omit=dev`) ; rien n'est embarqué dans l'appli.
- Vérifications (2026-11-27) : `npm audit` sans minimatch ; `./scripts/test.sh` vert (1200 tests) ; APK de production construit, `scripts/audit-apk.js` conforme (SEC-02), seule permission `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, aucune INTERNET.
- CONFORMITE : rien. BlueOak-1.0.0, permissive, figure déjà parmi les licences acceptées (§7, décision du porteur du 2026-11-26) ; les licences de l'outillage n'y sont pas listées une à une, le registre ne couvre que le bundle.
- README : rien (la liste des dépendances n'y est pas documentée).
