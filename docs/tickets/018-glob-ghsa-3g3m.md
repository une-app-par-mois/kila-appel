# 018 — Faille modérée de glob (GHSA-3g3m-2fjr-6pw4) dans l'outillage

Statut : fusionné dans le groupe (PR #60, 2026-11-27) · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : 017 · Fichiers touchés : `package.json` (`overrides`), `package-lock.json`, `scripts/glob.test.js` (nouveau)

Créé le 2026-11-27 à l'intégration du lot 014f-015f-014g-017, à la demande du porteur (réponse aux questions du développement du 017 : un ticket à part pour glob).

## Contexte

`npm audit` signale une faille modérée dans glob `>= 9.0.0, <= 14.0.1` (GHSA-3g3m-2fjr-6pw4 : l'annulation par `AbortSignal` peut être contournée, et le parcours des fichiers continue après le délai). Le paquet arrive par l'outillage de test : jest 30 (`@jest/core`, `@jest/reporters`, `jest-config` : glob 13.0.7) et `test-exclude@7` (par `babel-plugin-istanbul@8`, `jest-expo`, `@jest/transform` : glob 10.5.0) ; jest est aussi installé avec `--omit=dev`, par expo-router et @testing-library/react-native. glob 7.2.3 (sous `test-exclude@6`) est hors de la plage. Rien n'est embarqué dans l'appli. Relevé du 2026-11-27 ; versions à revérifier au début du ticket.

`npm audit fix --force` propose de revenir à jest 29 : refusé (changement majeur, sans rapport avec la faille).

## Ce qui change

- `overrides` dans `package.json` limité à la plage vulnérable (comme le 017 pour minimatch) vers la première version corrigée de glob ; `npm install` pour mettre à jour le verrou de versions
- Garde-fou `scripts/glob.test.js` : échoue si une version de glob de la plage vulnérable revient dans `package-lock.json` (modèle : `scripts/minimatch.test.js`)

## Critères d'acceptation

- [x] Aucune version de glob dans la plage vulnérable (>= 9.0.0, <= 14.0.1) ; glob 14.0.6 partout, glob 7.2.3 (hors de la plage) reste sous `test-exclude@6`
- [x] `./scripts/test.sh` vert ; `npm audit` sans l'alerte glob (0 vulnérabilité)
- [x] Chaque paquet qui reçoit la nouvelle version de glob la charge sans erreur (`test-exclude@7`, `@jest/reporters`, `jest-config`), pas seulement la suite de tests (leçon du 017 : la suite restait verte avec un `test-exclude` cassé)
- [x] APK de production construit et audité (`scripts/audit-apk.js`) sans changement de permissions
- [x] Si une dépendance casse avec la nouvelle version : ne rien forcer, revenir en arrière et le dire (pas de contournement) — aucune n'a cassé

## Tests attendus

- `scripts/glob.test.js` (test d'abord : il échoue sur le verrou actuel)
- Tests existants toujours verts

## Hors périmètre

- Mise à jour de jest ou d'expo ; minimatch (017)

## Questions prévues

- Nouvelle version d'un paquet déjà présent : pas une dépendance nouvelle. Toute dépendance nouvelle apportée par la version corrigée (comme `@isaacs/nonrecursive-glob-match` au 017) est à proposer au porteur avec sa licence (cas « Arrête-toi et demande »).
- Si aucune version corrigée ne fonctionne avec `test-exclude@7` : laisser l'alerte ouverte, la classer avec motif, ou attendre une version de jest ; à poser au porteur.
- Séance de lancement du lot 018-016 (2026-11-27), réponses du porteur : aucune question. Pré-analyse : glob 14.0.2 et suivantes corrigent la faille, l'interface utilisée par jest et `test-exclude@7` est inchangée, aucun paquet nouveau par son nom (path-scurry 3 et lru-cache 11 déjà présents, BlueOak-1.0.0). Override prévu `"glob@>=9.0.0": "^14.0.2"` (glob 7.2.3 sous `test-exclude@6` laissé) ; garde-fou `scripts/glob.test.js` ; chargement vérifié hors de la suite pour chaque copie de `test-exclude@7` et pour jest.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Borne haute du garde-fou | `<= 14.0.1` · `< 14.0.2` | `< 14.0.2` : une préversion de 14.0.2 (`14.0.2-rc.1`) est classée vulnérable | Même règle que `scripts/minimatch.test.js` ; une préversion précède la version corrigée et peut ne pas contenir la correction | à relire |
| Plage de l'override sans borne haute (`glob@>=9.0.0`, `minimatch@>=7.0.0`) : une future dépendance à glob 15 ou minimatch 12 serait redescendue en silence | sélecteur borné (`glob@>=9.0.0 <14.0.2`) · sélecteur ouvert gardé et garde-fou dans le verrou | Sélecteur ouvert gardé ; `declaredFrom` dans `scripts/lock-versions.js` fait échouer `glob.test.js` (resp. `minimatch.test.js`) si un paquet du verrou déclare glob avec une version minimale >= 15 (resp. minimatch >= 12), message « ajuster l'override » | La forme ouverte est celle validée au 017 ; une clé de plage avec un espace est moins sûre côté npm. Le garde-fou rend le cas visible au lieu de le borner | à relire (issue de `/code-review`) |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : « Outillage : glob forcé en 14.0.6 sur la plage vulnérable (>= 9.0.0) par `overrides`, faille GHSA-3g3m-2fjr-6pw4 levée ; garde-fou `scripts/glob.test.js` (018). »
- Garde-fous (corrections de `/code-review`) : comparaison de versions commune dans `scripts/lock-versions.js`, utilisée par `glob.test.js` et `minimatch.test.js` ; une indication de build (`14.0.1+meta`) est lue correctement ; une entrée du verrou sans version (lien) est signalée par son chemin sans faire planter le fichier ; un paquet qui déclarerait glob >= 15 ou minimatch >= 12 fait échouer le test avec « ajuster l'override » (l'override, sans borne haute, le redescendrait). Chaque nouveau test vérifié en échec sur une mutation volontaire du code, puis code remis.
- Architecture : rien. glob sert à l'outillage de test (jest, `test-exclude@7`) ; rien n'est embarqué dans l'appli.
- Versions (2026-11-27) : avant, glob 13.0.7 (`@jest/reporters`, `jest-config`, racine) et 10.5.0 (sept copies de `test-exclude@7`, `jest-expo`, `jest-runner`, `jest-snapshot`) ; après, glob 14.0.6 partout, dédoublonné à la racine. glob 7.2.3 reste sous `test-exclude@6.0.0` (`babel-plugin-istanbul@6`, hors de la plage). Verrou : ajout de glob 14.0.6 et path-scurry 3.0.0 (nom déjà présent, BlueOak-1.0.0) ; retrait de glob 10.5.0 et 13.0.7, path-scurry 1.11.1 et 2.0.2, jackspeak, foreground-child, `@isaacs/cliui` et leurs dépendances. Aucun paquet nouveau par son nom.
- `npm ls glob --all` : aucun `invalid` ni erreur. `npm audit` : 0 vulnérabilité.
- Chargement vérifié hors de la suite (`node`, 2026-11-27) : pour chacune des sept copies de `test-exclude@7.0.2` résolues depuis `babel-plugin-istanbul@8.0.0` (`jest-config`, `jest-expo`, `jest-runner`, `jest-runtime`, `jest-snapshot`, `@jest/core`, `@jest/reporters`), `require`, puis `new TestExclude({cwd: 'src'}).globSync()` (125 fichiers) et `await .glob()` (125) sans erreur, chacune résolvant glob 14.0.6. `require('@jest/reporters')`, `require('jest-config')`, `require('jest-runtime')` sans erreur ; `glob.sync('src/**/*.ts', { windowsPathsNoEscape: true })` depuis `jest-config` : 125 fichiers.
- `./scripts/test.sh` vert (102 suites, 1288 tests).
- APK de production construit (`expo prebuild --clean`, `gradlew assembleRelease`) ; `scripts/audit-apk.js` conforme (SEC-02) : seule permission `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, aucune INTERNET, sans changement par rapport au 017.
- Dependabot : l'alerte glob ne se fermera qu'à la fusion du jalon 1 dans `main` (Dependabot ne lit que la branche par défaut).
- CONFORMITE, README : rien (BlueOak-1.0.0 déjà acceptée ; outillage de développement seulement).
