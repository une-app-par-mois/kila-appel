# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-26

## En cours

Préparation (niveau renforcé), branche `ticket/000-mise-en-route`. Cadrage, PRD (révision 1) et charte validés le 2026-11-26 ; maquettes : lot 1 (39 écrans) validé le 2026-11-26, lot 2 (22 écrans) et les 3 écrans du lot 1 modifiés validés le 2026-11-26 ; architecture et ADR 001 à 009 validés le 2026-11-26 ; sécurité validée le 2026-11-26 ; ensuite conformité ; règles absolues ABS-01 à ABS-08 dans `CLAUDE.md`.

## Prochaines étapes

Mise en route d'une nouvelle app (à retirer une fois faites) :

1. Niveau renforcé : remplacer la section « 100 % local » de `CLAUDE.md` par les règles absolues du projet, puis produire les documents de la préparation renforcée (fait : PRD, charte, maquettes, architecture, sécurité ; à faire : conformité, conventions et DoD, plan), chacun validé avant le suivant.
2. Charte et maquettes dans `design/`, validées avant le code.
3. Compléter `CLAUDE.md` (contexte, commandes), `scripts/test.sh`, `scripts/build.sh`, la mise en place de la stack dans les workflows et `.github/dependabot.yml`.
4. Écrire les premiers tickets dans `docs/tickets/`.

## Points d'attention

- Questions ouvertes : nom de paquet exact (cadrage) ; contenu du rapport PDF (PRD).
- Hooks Git activés le 2026-11-26. `main` protégée le 2026-11-26 (ruleset « main », vérifié par l'API) : PR obligatoire sans approbation, 4 vérifications exigées (tests, gitleaks, Semgrep, dépendances) sur une branche à jour, ni suppression ni force push, aucun contournement.
- Le hook pre-push lance `scripts/test.sh`, qui échoue tant que la stack n'est pas en place : aucun push possible d'ici là (et `--no-verify` interdit). Les documents de préparation sont commités localement ; le prochain push se décide avec le porteur.

## Non vérifié

- Rien de codé pour l'instant.
