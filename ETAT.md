# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-26

## En cours

Préparation (niveau renforcé), branche `ticket/000-mise-en-route`. Cadrage validé le 2026-11-26.

## Prochaines étapes

Mise en route d'une nouvelle app (à retirer une fois faites) :

1. Niveau renforcé : remplacer la section « 100 % local » de `CLAUDE.md` par les règles absolues du projet, puis produire les documents de la préparation renforcée (PRD, conception, sécurité, conformité, conventions, plan), chacun validé avant le suivant.
2. Charte et maquettes dans `design/`, validées avant le code.
3. Compléter `CLAUDE.md` (contexte, commandes), `scripts/test.sh`, `scripts/build.sh`, la mise en place de la stack dans les workflows et `.github/dependabot.yml`.
4. Activer les hooks : `./scripts/setup-hooks.sh` (gitleaks requis sur le poste).
5. Protéger `main` dans les réglages GitHub : PR obligatoire, travaux de la CI obligatoires.
6. Écrire les premiers tickets dans `docs/tickets/`.

## Points d'attention

- Questions ouvertes du cadrage : nom de paquet exact, usage de la marque Ki&La.
- Hooks à activer et `main` à protéger : réglages du porteur.

## Non vérifié

- Rien de codé pour l'instant.
