# 025 — Statistiques d'un groupe et d'un membre

Statut : à faire · Jalon : 2 · Zone sensible : non (affiche sans calculer : taux, cases et arrondi viennent du 023) · Trivial : non

Dépend de : 022 (`SessionSquares`), 023, 024 · Fichiers touchés : `src/app/stats/groupes/[id].tsx` (nouveau), `src/app/stats/membres/[id].tsx` (nouveau), `src/ui/SessionSquares.tsx` (case vide « hors inscription »), `src/config/libelles/stats.ts`, `src/appTests/statsGroup.test.tsx` (nouveau), `src/appTests/statsMember.test.tsx` (nouveau) — 6 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

EX-27 demande le taux par membre : écrans « Statistiques d'un groupe » (sans le podium, F-14 au jalon 5) et « Statistiques d'un membre » (taux, barre, comptes par statut, séance par séance).

## À lire

- `design/maquettes/` : « Statistiques d'un groupe (podium) », « Statistiques d'un membre »
- `docs/PRD.md` : EX-27, RM-01, RM-03 ; tickets 023 (plan validé) et 024 (`AttendanceBar`, période)
- `src/ui/Attendance.tsx` (icônes des statuts)

## Ce qui change

- `src/app/stats/groupes/[id].tsx` : titre = nom du groupe, « Saison 2026-2027 · 12 séances » (ou la période choisie), « Par membre » : nom, taux, un appui ouvre le membre ; « Triés par nom ; 22 membres. ».
- `src/app/stats/membres/[id].tsx` (paramètres : groupe et période) : taux en grand, barre, « 6 présent · 1 retard · 1 excusé · 4 absent » ; « Séance par séance » : une case par séance du groupe dans la période, avec l'icône du statut, case vide « hors inscription », légende « Case vide : séance hors inscription. ».
- `src/ui/SessionSquares.tsx` (posé au 022) : ajout de la case vide « hors inscription », avec son libellé d'accessibilité (NF-06).
- La période vient de l'écran Stats (paramètre de route), pas d'un réglage.

## Critères d'acceptation

- [ ] EX-27 : sur le jeu fictif du 023, chaque membre d'un groupe affiche le taux attendu et ses comptes par statut.
- [ ] RM-03 : un membre inscrit en cours de période a des cases vides avant son inscription ; ses présences dans un autre groupe n'apparaissent pas ici.
- [ ] RM-01 : membre sans séance sur la période : « — ».
- [ ] Accords des comptes (« 1 retard », « 2 retards » ; maquette : « présent », « absent » invariables dans la ligne) suivant les textes validés.
- [ ] NF-06, CONV-03, CONV-16 ; écarts avec la maquette listés dans la PR.

## Tests attendus

- `src/appTests/statsGroup.test.tsx`, `src/appTests/statsMember.test.tsx` : jeu fictif, membre inscrit en cours de période, membre archivé, période vide.
- À la main : 35 cases sur une saison complète, retour à la ligne sur téléphone et tablette.

## Hors périmètre

- Podium (F-14, EX-37, jalon 5) : la section « Podium » de la maquette n'est pas affichée.
- Export du membre (F-08, jalon 3).

## Questions prévues

- Écart de maquette : podium absent jusqu'au jalon 5 (question du découpage).
- Accord de « présent » et « absent » dans la ligne des comptes (« 6 présent ») : la maquette les laisse invariables ; à garder tel quel sauf avis contraire (même logique que le ticket 020).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Stats : taux de présence de chaque membre d'un groupe, séance par séance (F-05, EX-27).
- Architecture : écrans `stats/groupes/[id].tsx`, `stats/membres/[id].tsx`, composant `SessionSquares`.
