# 041 — Rapport PDF : écran

Statut : **en attente du porteur** (dépend du 038 par le 040) · Jalon : 3 · Zone sensible : non (écran ; production et nettoyage au 040) · Trivial : non

Dépend de : 037 (`stats.tsx`, libellés `exports.ts`), 040 · Fichiers touchés : `src/app/stats/rapport.tsx` (nouveau), `src/app/(tabs)/stats.tsx` (bouton « Rapport PDF »), `src/config/libelles/exports.ts`, `src/appTests/report.test.tsx` (nouveau) — 4 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

L'écran « Rapport PDF » de la maquette : période, groupes, aperçu de la feuille, « Créer et partager le PDF » ; et le bouton « Rapport PDF » de l'onglet Stats.

## À lire

- `design/maquettes/` : « Statistiques » (rangée « Exporter (CSV) » / « Rapport PDF »), « Rapport PDF » ; `design/CHARTE.md`
- Tickets 037 (écran d'export, période reçue), 039, 040 ; `docs/SECURITE.md` SEC-09 ; `docs/PRD.md` EX-32, NF-05, NF-06

## Ce qui change

- `src/app/(tabs)/stats.tsx` : bouton « Rapport PDF » (deux tiers de la rangée), qui passe la période affichée.
- `src/app/stats/rapport.tsx` : « Période » (Saison, Ce mois, Dates…, comme l'onglet ; période reçue par défaut), « Groupes » (« Tous les groupes » ou un groupe), aperçu de la feuille de la maquette (titre, période, barre de la synthèse), **bandeau d'avertissement** (question prévue), « Créer et partager le PDF » (indicateur pendant le rendu ; désactivé à 0 séance avec un état vide).
- Textes ajoutés à `src/config/libelles/exports.ts`.

## Critères d'acceptation

- [ ] EX-32 : depuis Stats, l'écran s'ouvre sur la période affichée ; le bouton lance la production du 040.
- [ ] SEC-09 : avertissement présent avant le bouton (si le porteur le retient), test d'écran.
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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : rapport PDF A4 (synthèse de la période, puis une page par groupe avec le taux de chaque membre), partagé par le système (F-09, EX-32).
- Architecture : `src/app/stats/rapport.tsx`.
