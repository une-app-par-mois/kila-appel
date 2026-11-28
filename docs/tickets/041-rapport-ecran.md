# 041 — Rapport PDF : écran

Statut : à faire · Jalon : 3 · Zone sensible : non (écran ; production et nettoyage au 040) · Trivial : non

Dépend de : 037 (`stats.tsx`, libellés `exports.ts`), 040 · Fichiers touchés : `src/app/stats/rapport.tsx` (nouveau), `src/app/(tabs)/stats.tsx` (bouton « Rapport PDF »), `src/config/libelles/exports.ts`, `src/appTests/report.test.tsx` (nouveau) — 4 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

L'écran « Rapport PDF » de la maquette : période, groupes, aperçu de la feuille, « Créer et partager le PDF » ; et le bouton « Rapport PDF » de l'onglet Stats.

## À lire

- `design/maquettes/` : « Statistiques » (rangée « Exporter (CSV) » / « Rapport PDF »), « Rapport PDF » ; `design/CHARTE.md`
- Tickets 037 (écran d'export, période reçue), 039, 040 ; `docs/SECURITE.md` SEC-09 ; `docs/PRD.md` EX-32, NF-05, NF-06

## Ce qui change

- `src/app/(tabs)/stats.tsx` : bouton « Rapport PDF » (deux tiers de la rangée), qui passe la période affichée.
- `src/app/stats/rapport.tsx` : « Période » (Saison, Ce mois, Dates…, comme l'onglet ; période reçue par défaut), « Groupes » (« Tous les groupes » ou un groupe), aperçu de la feuille de la maquette (titre, période, barre de la synthèse), **bandeau d'avertissement** « Le fichier contient les noms des membres et leurs taux de présence, **en clair**. Partagez-le seulement avec qui doit le recevoir. » avant le bouton (SEC-09, écart de maquette validé le 2026-11-28), « Créer et partager le PDF » (indicateur pendant le rendu ; désactivé à 0 séance avec le texte « Aucune séance enregistrée sur cette période : rien à mettre dans le rapport. », écart de maquette validé le 2026-11-28).
- Textes ajoutés à `src/config/libelles/exports.ts`.

## Critères d'acceptation

- [ ] EX-32 : depuis Stats, l'écran s'ouvre sur la période affichée ; le bouton lance la production du 040.
- [ ] SEC-09 : avertissement présent et entier avant le bouton, test d'écran.
- [ ] Bouton désactivé pendant le rendu et pendant une autre opération sur les fichiers (verrou).
- [ ] Période sans séance : bouton désactivé, texte d'état vide.
- [ ] NF-05, NF-06 ; écran comparé à la maquette, écarts listés dans la PR.

## Tests attendus

- `src/appTests/report.test.tsx` (faux `useReport` ou faux modules) : période, groupe, bandeau, état vide, verrou.

## Hors périmètre

- Contenu du PDF (039) ; production et partage (040).

## Questions prévues

- **Réservée (écart de maquette et SEC-09)** : la maquette « Rapport PDF » n'a pas le bandeau « en clair » qu'exige SEC-09 (« avant toute sortie de données […] PDF »). Proposé : le même bandeau que l'export CSV, « Le fichier contient les noms des membres et leurs taux de présence, **en clair**. Partagez-le seulement avec qui doit le recevoir. », placé avant le bouton.
- **Réservée (écart de maquette)** : état vide de l'écran Rapport (absent de la maquette) : « Aucune séance enregistrée sur cette période : rien à mettre dans le rapport. », sur le modèle de l'état vide de l'export.
- Décision automatique proposée : « Période » propose les mêmes choix que l'onglet Stats (Saison, Ce mois, Dates…), la maquette n'en montrant qu'un (« Saison 2026-2027 ▾ »).

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Bandeau SEC-09 : **comme l'export CSV, avant le bouton**, texte proposé tel quel (écart de maquette validé le 2026-11-28).
- État vide : **bouton désactivé et texte d'état vide** proposé (écart de maquette validé le 2026-11-28).
- Maquette « Rapport PDF » et `scripts/maquettes.mjs` à mettre à jour (bandeau ; état vide dans « États vides » ; aperçu de la feuille : « Synthèse, puis une page par groupe et sa grille… »), à l'intégration, comme au jalon 2, avant la comparaison de la PR.
- Décision d'office ci-dessus appliquée, notée dans `docs/DECISIONS.md` (état « à relire »).

Reporté du lot J3-3 (2026-11-28, fiches 037 et 039) :

- Ajouter `rapport.ts` à `src/config/libelles/index.ts` (le 039 l'importe directement, aucun écran ne le lisait encore).
- Rangée de Stats : « Exporter (CSV) » occupe le premier tiers (037) ; le bouton « Rapport PDF » prend les deux tiers restants, aux mêmes conditions (séances et période valide).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : rapport PDF A4 (synthèse de la période, puis une page par groupe avec le taux de chaque membre), partagé par le système (F-09, EX-32).
- Architecture : `src/app/stats/rapport.tsx`.
- Reporté de la pré-analyse du 039 (lot J3-3) : vérifier qu'il y a des séances du groupe choisi avant de produire le rapport.
