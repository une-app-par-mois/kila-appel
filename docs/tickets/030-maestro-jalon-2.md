# 030 — Campagne Maestro du jalon 2

Statut : à faire · Jalon : 2 · Zone sensible : non (parcours de test, aucun code de l'appli) · Trivial : non

Dépend de : 022, 024, 025 (et 029 pour le dernier parcours) · Fichiers touchés : `.maestro/alerte-traitee.yaml` (nouveau), `.maestro/statistiques.yaml` (nouveau), `.maestro/relance-reglage.yaml` (nouveau), `src/__fixtures__/e2eBackup.ts`, `scripts/e2e/sauvegarde-fictive.test.ts`, `scripts/e2e.sh` — 6 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

Parcours de bout en bout de fin de jalon (`docs/CONVENTIONS.md` §5.2), sur l'APK de la CI, comme le 016. Le critère de sortie du jalon (`docs/PLAN.md` §2) reste un prétest du porteur sur son téléphone ; la campagne en vérifie ce qui s'automatise.

## À lire

- Ticket 016 (décisions : émulateur seul, sauvegarde fictive générée, `--appareil-reel`) ; `docs/CONVENTIONS.md` §5.2 ; `docs/ARCHITECTURE.md` §8
- Tickets 022 à 025 (jeu fictif vérifié à la main du 023), 029
- `.maestro/`, `scripts/e2e.sh`, `src/__fixtures__/e2eBackup.ts`

## Ce qui change

- Sauvegarde fictive enrichie (ou seconde sauvegarde) : un membre à 3 absences de suite, et le jeu du 023 dont les taux sont écrits en clair dans le test.
- `alerte-traitee.yaml` : restauration de la sauvegarde fictive → alerte sur l'accueil → « Marquer comme traitée » → alerte disparue → appel avec une absence de plus → alerte revenue (EX-25, EX-26).
- `statistiques.yaml` : onglet Stats → taux de la saison et d'un groupe égaux aux valeurs du test → membre (EX-27, RM-01).
- `relance-reglage.yaml` : activer la relance → écran de permission → « Pas maintenant » → relance non activée (EX-29) ; la boîte du système n'est pas pilotée.

## Critères d'acceptation

- [ ] Les trois parcours verts sur l'émulateur, puis sur l'APK de la CI de la PR du jalon.
- [ ] Taux affichés égaux au tableau vérifié à la main (023).
- [ ] Le parcours de la campagne du jalon 1 reste vert.

## Tests attendus

- `scripts/e2e/sauvegarde-fictive.test.ts` : contenu de la sauvegarde fictive (série, taux attendus).
- **À la main sur le téléphone** (critère de sortie, non automatisable) : relance reçue écran verrouillé, sans nom de membre ; appui → appel ; après redémarrage ; en mode avion.

## Hors périmètre

- La notification elle-même dans Maestro (écran verrouillé, volet du système) : vérifiée à la main.
- Parcours iOS (jalon 7).

## Questions prévues

- Aucune : mêmes réponses du porteur que le 016 (émulateur, sauvegarde fictive générée, A55 « non vérifié » s'il n'est pas disponible).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Relance dans Maestro | Piloter le volet des notifications ; vérifier à la main | À la main, comme le demande le critère de sortie | Volet du système fragile selon la version d'Android ; le critère exige le téléphone réel | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (tests seulement).
- Architecture : §8, trois parcours Maestro de plus.
