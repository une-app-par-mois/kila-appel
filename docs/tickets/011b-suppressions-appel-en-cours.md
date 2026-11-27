# 011b — Suppressions et appel en cours

Statut : en cours · Jalon : 1 · Zone sensible : oui · Trivial : non

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 011.

## Contexte

Note de la revue de sécurité des tickets 006d et 007 : supprimer un groupe ou un membre efface aussi sa part du brouillon d'appel (cascades), sans que la confirmation le dise.

## Ce qui change

- Supprimer un groupe : quand le brouillon d'appel le concerne, la confirmation ajoute « l'appel en cours »
- Supprimer un membre : quand le brouillon d'appel a un statut pour lui, la confirmation le dit aussi

## Décisions du porteur (2026-11-27)

- Supprimer un groupe concerné par l'appel en cours **efface aussi ce brouillon** (il ne servirait plus qu'à être abandonné) ; la confirmation ajoute « l'appel en cours (non enregistré) »
- Le calcul se fait dans les dépôts (`deletionImpact` de `groupsRepo` et `membersRepo`, comme `slotsRepo`) ; ces deux fichiers rejoignent la liste du contrôle EX-14 de `staticChecks`
- Membre : « son statut dans l'appel en cours » ajouté à la liste de la confirmation

## Critères d'acceptation

- [ ] Message de suppression d'un groupe qui nomme l'appel en cours, seulement s'il le concerne
- [ ] Message de suppression d'un membre qui nomme l'appel en cours, seulement s'il le concerne

## Tests attendus

- Tests de données (`deletionImpact`) et d'écran
