# 016 — Campagne Maestro du jalon 1

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Parcours de bout en bout en fin de jalon, sur l'APK de la CI.

## À lire

- `docs/CONVENTIONS.md` §5.2
- `docs/PLAN.md` jalon 1

## Ce qui change

- `.maestro/` : trois parcours ; script `e2e`

## Critères d'acceptation

- [ ] Appel de 20 membres chronométré
- [ ] Brouillon retrouvé après fermeture forcée
- [ ] Sauvegarde jusqu'à la feuille de partage (avertissement « en clair » visible) → tout effacer → restauration d'une sauvegarde fictive générée par le script (déposée dans Téléchargements), données vérifiées à l'écran ; aller-retour réel à faire à la main sur un téléphone

## Tests attendus

- Les trois parcours verts sur l'émulateur local ; passage sur l'A55 « non vérifié » (téléphone indisponible)

## Hors périmètre

- Parcours iOS (jalon 7)

## Questions prévues

- Séance de lancement du lot 018-016 (2026-11-27), réponses du porteur :
  - aller-retour : export jusqu'à la feuille de partage, puis Tout effacer, puis restauration d'une sauvegarde fictive générée par le script (pas de binaire versionné) et déposée par `adb push` dans Téléchargements ; vérification à l'écran ;
  - A55 : émulateur seul ; passage sur l'A55 noté « non vérifié » dans ETAT et la PR ; le script refuse de tourner si un appareil réel est branché, sauf option explicite ;
  - où : émulateur local (Maestro 2.12.0 déjà installé, émulateurs présents) ; mise au point sur un APK de production construit en local ; campagne finale sur l'artefact de la CI de la PR du jalon ; aucun workflow modifié ; statistiques de Maestro désactivées (`MAESTRO_CLI_NO_ANALYTICS=1`).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
