# 025 — Statistiques d'un groupe et d'un membre

Statut : à faire · Jalon : 2 · Zone sensible : non (affiche sans calculer : taux, cases et arrondi viennent du 023) · Trivial : non

Dépend de : 022 (`SessionSquares`), 023, 024 · Fichiers touchés : `src/app/stats/groupes/[id].tsx` (nouveau), `src/app/stats/membres/[id].tsx` (nouveau), `src/ui/SessionSquares.tsx` (case vide « hors inscription »), `src/config/libelles/stats.ts`, `src/appTests/statsGroup.test.tsx` (nouveau), `src/appTests/statsMember.test.tsx` (nouveau), `src/app/(tabs)/stats.tsx` (appui sur un groupe, report du 024) — 7 fichiers

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
- [ ] Un appui sur un groupe de l'onglet Stats ouvre ses statistiques (`stats/groupes/[id]`, avec `du` et `au` de la période affichée ; report du 024).
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

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Podium masqué jusqu'au jalon 5.
- RM-01 fait foi : la maquette « Statistiques d'un membre » affiche 64 % (7 sur 11), et la ligne de Hugo Moreau dans « Statistiques d'un groupe » aussi.

Reports de l'intégration du lot J2-1 (2026-11-27) :

- taux affiché avec l'espace insécable `NBSP` (U+00A0, constante exportée par `src/domain/attendanceRate.ts`) avant « % » : l'utiliser dans `getByText` (`64\u00a0%` ou `` `64${NBSP}%` ``) et dans les parcours Maestro ; un « 64 % » tapé avec une espace simple ne correspond pas (023).
- séance où le membre était inscrit sans statut : le 023 renvoie `status: null` et `enrolled: true`, l'affichage se décide ici (en attente du porteur, `docs/QUESTIONS.md`) ; `useMemberStats` rend `null` pour un membre hors de la liste du groupe ; `useStats` rend `inputError` pour des dates libres invalides (023).

Reports de l'intégration du lot J2-2 (2026-11-27) :

- onglet Stats (024) : les lignes de groupe ne sont pas appuyables ; ajouter l'appui dans `src/app/(tabs)/stats.tsx` vers `stats/groupes/[id]` avec `du` et `au` (AAAA-MM-JJ) de la période affichée.
- `src/ui/AttendanceBar.tsx` (024) : barre par statut (12 pt, rayon 4, ordre `SHARE_ORDER`, couleurs `theme.statuses`, libellé d'accessibilité des parts non nulles avec `NBSP`) et `AttendanceLegend`, à réutiliser tels quels.
- écran Période (024) : `src/app/stats/periode.tsx` revient vers `/stats` par `router.dismissTo` avec `du` et `au` (jamais `router.navigate`, qui empilait un second `(tabs)`).
- `useStats` garde la vue précédente pendant une relecture (`keepPrevious`, 024) ; `useGroupStats` et `useMemberStats` sont inchangés.
- `src/ui/SessionSquares.tsx` (022) : cases de 22 pt, non cliquables, icône et libellé d'accessibilité (« Absent, 03/12/2026 »), la plus récente d'abord, **sans case vide** : la case vide « hors inscription » (RM-03, `status: null`, `enrolled: true`) s'ajoute ici, avec son icône et son libellé (NF-06) ; l'écran d'alerte du 022 ne doit pas changer.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Stats : taux de présence de chaque membre d'un groupe, séance par séance (F-05, EX-27).
- Architecture : écrans `stats/groupes/[id].tsx`, `stats/membres/[id].tsx`, composant `SessionSquares`.
