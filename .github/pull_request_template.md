## Ticket

[`docs/tickets/NNN-intitule.md`] · Fonctionnalités : [F-xx] · Zone sensible : [oui | non] · Vise : [`main` | `groupe/…`]

PR d'un groupe ou d'un jalon vers `main` : lister ici les tickets et leurs PR ; la CI complète tourne ici.

## Ce que change cette pull request

[ ]

## Tests

[Tests ajoutés ou modifiés, vus en échec avant le code.]

## Definition of Done (`docs/CONVENTIONS.md`)

- [ ] Chaque critère d'acceptation a son test, ou sa vérification manuelle décrite.
- [ ] Le test a été vu en échec avant le code ; un bogue corrigé a son test qui le reproduit.
- [ ] `./scripts/test.sh` passe en local ; la CI est verte (PR vers `main` seulement).
- [ ] `/code-review` lancé ; `/security-review` en zone sensible (résumé ci-dessous).
- [ ] Aucun secret, aucune donnée réelle, aucun appel réseau ajouté ; dépendance nouvelle validée, ou aucune.
- [ ] Interface touchée : comparée à la maquette, écarts listés — ou sans objet.
- [ ] Documents de référence à jour si une décision écrite change.
- [ ] `ETAT.md` à jour.

## Non vérifié

[Ce qui n'a pas été vérifié, et comment le faire. « Rien » seulement si c'est vrai.]

## IA

- Outil utilisé : [Claude Code | aucun]
- Prompt clé ajouté à `PROMPTS.md` : [oui | non concerné]

## Release ?

Si cette PR prépare une version : cocher `CHECKLIST-RELEASE.md` ici avant de fusionner.
