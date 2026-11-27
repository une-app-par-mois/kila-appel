# 019 — Alertes Semgrep et CodeQL de la PR du jalon 1

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : oui

## Contexte

La CI de la PR du jalon 1 vers `main` (#63) signale deux alertes bloquantes. Tous les autres contrôles sont verts.

- **Semgrep** (`detect-non-literal-regexp`) : `src/appTests/purge.test.tsx` construit une `RegExp` à partir d'un paramètre de test. Il n'y a aucun risque réel, puisque ce sont des données de test, mais la règle bloque.
- **CodeQL** (« Incomplete multi-character sanitization ») : `scripts/licences.js`, fonction `authorOf`. Le retrait de `<…>` par une regex laissait un reste de chevron avec des chevrons imbriqués (`Alix Exemple <a<b>c>` donnait `Alix Exemplec>`).

## Ce qui change

- `purge.test.tsx` : les expressions régulières sont écrites en dur dans la table du test.
- `licences.js` : `authorOf` ne garde que ce qui précède le premier « < » ou « ( ».
- `licences.test.js` : un cas avec des chevrons imbriqués, vu en échec d'abord.

Aucune règle n'est désactivée, aucun contrôle n'est affaibli.

## Critères d'acceptation

- [x] Le test des chevrons imbriqués échoue avant la correction et passe après.
- [x] `./scripts/test.sh` vert, registre des licences inchangé.
- [ ] Semgrep et CodeQL verts sur la PR #63.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Corriger ou classer les alertes ? | corriger le code ; classer comme faux positif | corriger | La correction est petite, et CodeQL avait raison sur un reste de chevron. Classer une alerte dans GitHub est un réglage extérieur, réservé au porteur. | à relire |

## À reporter

- CHANGELOG : « Sécurité : nom d'auteur du registre des licences sans reste de chevron ; test sans RegExp construite (019). »
