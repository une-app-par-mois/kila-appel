# 014c — Base illisible au démarrage

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014, 014b, 014e, 015c · Fichiers touchés : `src/hooks/useDatabase.ts`, `src/data/open.ts`, `src/app/_layout.tsx`, `src/ui/Recovery.tsx`

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Une base illisible au démarrage mène à un écran de récupération, jamais à un plantage (EX-22).

## À lire

- Maquette : Base illisible
- Notes du ticket 007d dans le ticket 014

## Ce qui change

- État d'échec et réouverture dans `useDatabase` ; écran de récupération : restaurer une sauvegarde, repartir de zéro

## Critères d'acceptation

- [ ] Base illisible : écran de récupération, jamais de plantage (EX-22)
- [ ] « Repartir de zéro » demande une confirmation
- [ ] Version plus récente que l'appli : message « mettez l'appli à jour », sans « Repartir de zéro » mis en avant
- [ ] `SECURE_DELETE_OFF`, `FOREIGN_KEYS_OFF` et `JOURNAL_MODE_OFF` (ticket 015c) : écran d'erreur avec « Réessayer », sans action destructrice
- [ ] `cache/sauvegardes/` vidé au démarrage de l'appli (layout racine), en cas d'arrêt pendant un partage (revue de sécurité du 014b)

## Tests attendus

- Tests : base abîmée, version future, réglage SQLite refusé ; restauration depuis l'écran de récupération

## Hors périmètre

- Rappels (014d)

## Questions prévues

Séance du 2026-11-27 : « Repartir de zéro » confirmé (« Les données abîmées seront effacées définitivement. »), maquette annotée ; version plus récente : message à part.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
