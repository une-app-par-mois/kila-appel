# 017 — minimatch 11 forcé (alerte Dependabot n° 2)

Statut : en attente du porteur · Jalon : 1 · Zone sensible : non · Trivial : non

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
| Syntaxe de l'`overrides` | `"minimatch": "^11.0.1"` partout · `"minimatch@>=7.0.0": "^11.0.1"` (plage vulnérable seule) | `"minimatch@>=7.0.0": "^11.0.1"` | L'override global installe minimatch 11 sous `test-exclude@6.0.0` (par `babel-jest@29`, `@react-native/jest-preset`), écrit pour l'interface de minimatch 3 : `require('test-exclude')` puis `shouldInstrument` lève `TypeError: minimatch is not a function`. La suite reste verte car Jest passe par `test-exclude@7`, mais la casse est réelle. Les versions 3.x sont hors de la plage vulnérable (>= 7.0.0, < 11.0.1). | en attente du porteur (voir Questions) |
| Garde-fou de régression | aucun test · test qui lit `package-lock.json` | `scripts/minimatch.test.js` : échoue si une version de minimatch de la plage vulnérable revient dans le verrou | Test d'abord ; empêche une mise à jour future de réintroduire l'alerte sans bruit | à relire |

## Questions pour le porteur

1. **minimatch 3.1.5 reste installé (critère « aucune version inférieure à 11.0.1 » non tenu à la lettre).** Forcer minimatch 11 partout casse `test-exclude@6.0.0` (interface de minimatch 3, `TypeError` constaté), donc rien n'est forcé sur ce paquet. L'override appliqué ne vise que la plage vulnérable : `npm audit` ne signale plus minimatch, la suite est verte. Options :
   - **A (recommandée, appliquée)** : garder l'override limité `"minimatch@>=7.0.0": "^11.0.1"` ; minimatch 3.1.5 (non vulnérable selon GHSA-g3hv-75wg-m249) reste sous `test-exclude@6` ; on corrige le critère d'acceptation du ticket.
   - B : override global `"minimatch": "^11.0.1"` ; casse latente de `test-exclude@6` (chemin non exercé par la suite aujourd'hui) : contraire à la consigne « ne rien forcer ».
   - C : ne rien changer et classer l'alerte Dependabot.
2. **Nouvelle dépendance transitive.** minimatch 11.0.9 apporte `@isaacs/nonrecursive-glob-match` 1.1.0 (licence BlueOak-1.0.0, même auteur que minimatch, mise à jour le 2026-11-05, aucune dépendance), seulement dans l'outillage de développement (rien dans l'appli). Options : **A (recommandée)** l'accepter, comme partie de minimatch 11 ; B refuser, et donc renoncer au ticket (option C ci-dessus).
3. **Pour information** : `npm audit` signale encore 19 alertes modérées, toutes issues d'une seule faille de `glob` (GHSA-3g3m-2fjr-6pw4, >= 9.0.0 et <= 14.0.1), dans l'outillage Jest, hors du périmètre de ce ticket. Recommandation : un ticket à part, sur le même modèle.

## À reporter

- CHANGELOG : « Outillage : minimatch forcé en 11.0.9 sur la plage vulnérable (>= 7.0.0) par `overrides`, alerte Dependabot n° 2 levée ; garde-fou `scripts/minimatch.test.js` (017). »
- Architecture : rien (outillage de développement seulement, aucun paquet embarqué ne change).
- Vérifications (2026-11-27) : `npm audit` sans minimatch ; `./scripts/test.sh` vert (1200 tests) ; APK de production construit, `scripts/audit-apk.js` conforme (SEC-02), seule permission `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, aucune INTERNET.
- README : rien (la liste des dépendances n'y est pas documentée).
