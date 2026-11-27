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
| Ligne des comptes du membre | invariable (maquette) ; accordée | Accordée, les quatre statuts toujours affichés, même à zéro : « 6 présents · 1 retard · 1 excusé · 4 absents », « 0 retard » | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Séance où le membre était inscrit sans statut (`status: null`, `enrolled: true`) | case vide ; autre case | Même case vide que « hors inscription », libellé « Sans statut, JJ/MM/AAAA » ; légende « Case vide : séance hors inscription ou sans statut. » | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Écart de maquette : membre ou groupe archivé | rien ; « Archivé » | « Archivé » sous le nom du membre et en sous-titre du groupe, tri par nom inchangé | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Écart de maquette : membre sans séance, groupe sans membre | — | Membre : « — », pas de barre, « Aucune séance sur la période. » à la place des cases ; groupe : « Aucun membre sur la période. » (et pas de ligne « Triés par nom ») | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Écart de maquette : légende des couleurs sur l'écran membre | afficher ; ne pas afficher | Pas de légende des couleurs | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Période en paramètres de route | `du`/`au` toujours (fiche) ; `periode=saison|mois`, `du`/`au` pour les dates libres | `periode=saison` ou `periode=mois`, `du`/`au` seulement pour des dates libres : « Saison » filtre par `season_id`, comme l'onglet (test avec deux saisons qui se chevauchent). **Critère « avec `du` et `au` » de la fiche ajusté : à signaler dans la PR.** | décidée par le porteur le 2026-11-27 | décidée par le porteur le 2026-11-27 |
| Sous-titre du groupe | — | « Saison 2026-2027 · 13 séances » ou « Du JJ/MM/AAAA au JJ/MM/AAAA · N séances », accordé (« 1 séance », « 0 séance ») | Pré-analyse | à relire |
| Sous-titre du membre | — | « Poussins · saison 2026-2027 » ou « Poussins · du … au … » ; le nom de saison ne perd sa majuscule que s'il commence par « Saison » (nom libre : « U13 » resterait tel quel) | Pré-analyse ; minuscule limitée au mot « Saison » pour ne pas abîmer un nom libre | à relire |
| Liste des membres | — | « Triés par nom ; N membres. », accordé | Pré-analyse | à relire |
| Nom affiché | — | `labels.memberForm.fullName` (la pré-analyse disait `labels.members.fullName`, qui n'existe pas : même fonction, sous `memberForm`) | Texte déjà utilisé par la fiche membre et l'alerte | à relire |
| Lignes appuyables | — | Toutes les lignes de groupe de l'onglet, archivées ou sans séance comprises ; ligne de membre appuyable entière, `zoneAppuiMin`, sans chevron (maquette). Ligne de groupe lue d'un bloc sans libellé imposé (le lecteur d'écran assemble nom, taux et parts de la barre) ; ligne de membre : « Nom, Archivé, 64 % » | Pré-analyse ; garder les parts de la barre dans la lecture (NF-06) | à relire |
| Ordre des cases | — | De la plus ancienne à la plus récente sur l'écran membre ; commentaire de `SessionSquares` corrigé (l'ordre est celui reçu) ; l'écran d'alerte garde le sien | Pré-analyse | à relire |
| `SessionSquares` : case vide | — | `status: AttendanceStatus \| null`, `enrolled` facultatif ; case vide fond Quadrillage (`--quad` de la maquette), sans icône ; « Hors inscription, JJ/MM/AAAA » ou « Sans statut, JJ/MM/AAAA » (`libelles/stats.ts`) ; `alerts.test.tsx` vert | Pré-analyse | à relire |
| Statut compté hors inscription (cas de secours de RM-03) | — | Icône et libellé du statut (testé avec Nour Garcia, Benjamins, 26/10) | Pré-analyse | à relire |
| Membre qui n'a que des excusés | — | « — » et la barre (100 % excusé) | Pré-analyse | à relire |
| Taux | — | `formatRate` avec `NBSP`, Plex Mono 26 sur l'écran membre, 16 dans la liste | Pré-analyse | à relire |
| Groupe ou membre introuvable | — | `labels.errors.NOT_FOUND` dans `Screen`, retour « ‹ » (vers `/stats` sans historique) ; membre hors de la liste du groupe compris | Pré-analyse, modèle de la fiche membre | à relire |
| Dates `du`/`au` invalides reçues | — | Message de saisie (`labels.errors[inputError]`), rien n'est lu, comme l'onglet | Même règle que l'onglet (024) | à relire |
| Aide de route partagée | dupliquer dans les deux écrans ; fichier commun | `src/ui/statsPeriodParams.ts` (nouveau, 20 lignes) : `periodParams` et `choiceFromParams`, utilisés par l'onglet et les deux écrans ; 9 fichiers au lieu de 8 | Une seule règle de lecture de la période ; un fichier de route Expo n'exporte que son écran | à relire |
| Fonction locale `periodParams` de l'onglet | — | Renommée `periodScreenParams` (elle masquait l'aide importée et envoyait `du`/`au` à l'écran du groupe ; vu par le test) | Nom sans ambiguïté | à relire |
| Coquille de la fiche | — | « 12 séances » se lit 13 (13 séances des Poussins dans le jeu du 023 et dans la maquette) | Pré-analyse | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Stats : taux de présence de chaque membre d'un groupe, séance par séance (F-05, EX-27).
- Architecture : écrans `stats/groupes/[id].tsx`, `stats/membres/[id].tsx` (période en paramètres `periode=saison|mois`, ou `du` et `au`, lus et écrits par `src/ui/statsPeriodParams.ts`), composant `SessionSquares` (case vide : hors inscription ou sans statut).
- PR : critère « avec `du` et `au` » ajusté (paramètre `periode` pour Saison et Ce mois, décision du porteur du 2026-11-27) ; écarts de maquette : podium masqué, « Archivé », états vides, pas de légende sur l'écran membre, comptes accordés.
