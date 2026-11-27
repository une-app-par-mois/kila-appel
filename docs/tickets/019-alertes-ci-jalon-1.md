# 019 — Alertes Semgrep et CodeQL de la PR du jalon 1

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : oui

## Contexte

La CI de la PR du jalon 1 vers `main` (#63) signale deux alertes bloquantes. Tous les autres contrôles sont verts.

- **Semgrep** (`detect-non-literal-regexp`) : `src/appTests/purge.test.tsx` construit une `RegExp` à partir d'un paramètre de test. Il n'y a aucun risque réel, puisque ce sont des données de test, mais la règle bloque.
- **CodeQL** (« Incomplete multi-character sanitization ») : `scripts/licences.js`, fonction `authorOf`. Le retrait de `<…>` par une regex laissait un reste de chevron avec des chevrons imbriqués (`Alix Exemple <a<b>c>` donnait `Alix Exemplec>`).

## Ce qui change

- `purge.test.tsx` : les expressions régulières sont écrites en dur dans la table du test.
- `licences.js` : `authorOf` retire les groupes `<…>` et `(…)` caractère par caractère, imbrications comprises. Aucun chevron ne reste, et un auteur qui commence par « (c) » ou contient une parenthèse au milieu garde son nom. La première version coupait au premier « < » ou « ( », ce que la revue a refusé.
- `licences.test.js` : chevrons imbriqués, « (c) Acme Corp » et une parenthèse au milieu, chacun vu en échec d'abord.
- `purge.test.tsx` : le test vérifie que la regex écrite en dur contient bien le libellé affiché.

Aucune règle n'est désactivée, aucun contrôle n'est affaibli.

## Critères d'acceptation

- [x] Le test des chevrons imbriqués échoue avant la correction et passe après.
- [x] `./scripts/test.sh` vert, registre des licences inchangé.
- [ ] Semgrep et CodeQL verts sur la PR #63.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Corriger ou classer les alertes ? | corriger le code ; classer comme faux positif | corriger | La correction est petite, et CodeQL avait raison sur un reste de chevron. Classer une alerte dans GitHub est un réglage extérieur, réservé au porteur. | à relire |
| Ligne du README des tickets écrite dans la branche | à l'intégration ; dans la branche | dans la branche | Ticket isolé, écrit par l'IA principale elle-même, sans autre ticket en parallèle : aucun risque de conflit. | à relire |

## À reporter

- CHANGELOG : « Sécurité : nom d'auteur du registre des licences sans reste de chevron ; test sans RegExp construite (019). »
