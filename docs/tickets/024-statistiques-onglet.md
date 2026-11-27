# 024 — Statistiques : onglet et période

Statut : à faire · Jalon : 2 · Zone sensible : non (affiche sans calculer : taux et arrondi viennent du 023) · Trivial : non

Dépend de : 023 · Fichiers touchés : `src/ui/TabBar.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/stats.tsx` (nouveau), `src/app/stats/periode.tsx` (nouveau), `src/ui/AttendanceBar.tsx` (nouveau), `src/config/libelles/stats.ts` (nouveau), `src/config/libelles/index.ts`, `src/appTests/stats.test.tsx` (nouveau), `src/appTests/tabRoutes.tsx` — 9 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

L'onglet Stats prend la place vide gardée dans la barre d'onglets (décision du porteur du 2026-11-27, ticket 013). Écran « Statistiques » (synthèse, par groupe) et « Choix d'une période ».

## À lire

- `design/maquettes/` : « Statistiques », « Choix d'une période », « États vides du lot 2 » (Statistiques) ; `design/CHARTE.md` (couleurs des statuts, Plex Mono pour les chiffres)
- `docs/PRD.md` : EX-27, RM-01 ; ticket 023 (plan validé)
- `src/ui/TabBar.tsx` (place de Stats), `src/app/(tabs)/historique.tsx` (filtres `FilterChip`), `src/ui/FilterChip.tsx`

## Ce qui change

- Barre d'onglets : l'onglet Stats (icône, libellé « Stats ») remplace la place vide ; le rond « Nouvel appel » ne bouge pas.
- `src/app/(tabs)/stats.tsx` : filtres « Saison », « Ce mois », « Dates… » ; cartes « Taux de présence » et « Séances » ; « Par groupe » : nom, taux, barre par statut (présent, retard, excusé, absent), « — » et « Aucune séance sur la période. » ; légende des statuts ; un appui sur un groupe ouvre ses statistiques (025).
- `src/app/stats/periode.tsx` : « Du », « Au » (JJ/MM/AAAA, RM-04), « Appliquer » ; dates invalides refusées avec un message clair.
- `src/ui/AttendanceBar.tsx` : barre empilée par statut, réutilisée au 025 ; jamais la couleur seule : la légende et un libellé d'accessibilité (« 84 % présent, 7 % retard… ») l'accompagnent (NF-06).
- État vide : « Pas encore de statistiques : elles apparaissent après le premier appel enregistré. » et « Faire l'appel ».

## Critères d'acceptation

- [ ] EX-27 : sur le jeu fictif du 023, la synthèse et chaque groupe affichent les taux attendus, pour la saison, le mois et des dates libres.
- [ ] RM-01 : un groupe sans séance sur la période affiche « — » et « Aucune séance sur la période. ».
- [ ] La période choisie est gardée en changeant d'onglet (état de l'écran), pas en base.
- [ ] NF-06 : chaque barre a un libellé d'accessibilité ; textes agrandis du système lisibles ; zones d'appui de 44 pt.
- [ ] CONV-03, CONV-16 respectées ; écarts avec la maquette listés dans la PR.

## Tests attendus

- `src/appTests/stats.test.tsx` : filtres, période libre, état vide, ouverture d'un groupe ; `tabRoutes.tsx` : route de l'onglet.
- À la main (téléphone) : barre lisible, défilement avec beaucoup de groupes, tablette.

## Hors périmètre

- Boutons « Exporter (CSV) » et « Rapport PDF » de la maquette (F-08, F-09, jalon 3).
- Statistiques d'un groupe et d'un membre (025).

## Questions prévues

- Écart de maquette : boutons d'export absents jusqu'au jalon 3 (question du découpage).
- Groupes archivés ou d'une autre saison dans « Par groupe » (point 4 du plan du 023) : comment les signaler (question du découpage).

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Boutons « Exporter (CSV) » et « Rapport PDF » masqués jusqu'au jalon 3.
- Groupes archivés ou d'une autre saison : listés après les autres, avec la mention « Archivé », seulement s'ils ont une séance dans la période ; ils comptent dans la synthèse.
- RM-01 fait foi : la maquette a été corrigée (58 % → 64 %).

Reports de l'intégration du lot J2-1 (2026-11-27) :

- taux affiché avec l'espace insécable `NBSP` (U+00A0, constante exportée par `src/domain/attendanceRate.ts`) avant « % » : l'utiliser dans `getByText` (`64\u00a0%` ou `` `64${NBSP}%` ``) et dans les parcours Maestro ; un « 64 % » tapé avec une espace simple ne correspond pas (023).
- `useStats` rend `inputError` (`DATE_INVALID`, `END_BEFORE_START`) pour des dates libres invalides : afficher le message de saisie, pas l'erreur de lecture ; sans saison active, période par défaut « Ce mois » (`season` nul, en attente du porteur) (023).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Onglet Stats : taux de présence de la période et par groupe, période au choix (F-05, EX-27).
- Architecture : onglet `(tabs)/stats.tsx`, écran `stats/periode.tsx`, composant `AttendanceBar`.
