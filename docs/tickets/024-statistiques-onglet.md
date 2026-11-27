# 024 — Statistiques : onglet et période

Statut : fusionné dans le groupe (PR #73) · Jalon : 2 · Zone sensible : non (affiche sans calculer : taux et arrondi viennent du 023) · Trivial : non

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

- [x] EX-27 : sur le jeu fictif du 023, la synthèse et chaque groupe affichent les taux attendus, pour la saison, le mois et des dates libres. — tests d'écran (`src/appTests/stats.test.tsx`) : saison, « Ce mois », dates libres ; non vérifié sur le téléphone
- [x] RM-01 : un groupe sans séance sur la période affiche « — » et « Aucune séance sur la période. ». — test d'écran
- [x] La période choisie est gardée en changeant d'onglet (état de l'écran), pas en base. — état de l'onglet et paramètres `du`, `au` de l'adresse, jamais en base ; retour de l'écran Période (`router.dismissTo`) testé avec le routeur simulé, non vérifié sur le téléphone
- [x] NF-06 : chaque barre a un libellé d'accessibilité ; textes agrandis du système lisibles ; zones d'appui de 44 pt. — libellé d'accessibilité testé ; textes agrandis, zones d'appui de 44 pt, défilement avec beaucoup de groupes et tablette : non vérifié sur le téléphone
- [x] CONV-03, CONV-16 respectées ; écarts avec la maquette listés dans la PR. — contrôles de `./scripts/test.sh` ; écarts listés dans la PR #73

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
| Puce « Saison » sans saison active | masquer ; garder grisée | masquée : « Ce mois » sélectionnée, « Dates… » reste | décidée par le porteur le 2026-11-27 | décidée |
| Période affichée | rien (maquette) ; ligne sous les puces | ligne « Du JJ/MM/AAAA au JJ/MM/AAAA » toujours affichée, puce « Dates… » inchangée | décidée par le porteur le 2026-11-27 (écart voulu avec la maquette) | décidée |
| Taille du ticket | découper ; garder entier | entier, 12 fichiers : les 9 de la fiche, plus `libelles/accueil.ts` (`tabs.stats`), `ui/Icon.tsx` (`chart-column`, déjà installé) et `appTests/home.test.tsx` (seul le test des onglets) | ajouts d'une ligne, sans logique nouvelle | à relire |
| Ordre des onglets | — | `index, stats, historique, parametres` ; Stats prend la place vide, le rond reste au centre | maquette | à relire |
| Appui sur un groupe | appuyable ; non | lignes non appuyables, pas de route `stats/groupes` | l'écran du groupe arrive au 025 ; appui à ajouter au 025 (voir « À reporter ») | changée après contradiction |
| Écran Période | modale ; écran de la pile racine | `src/app/stats/periode.tsx` dans la pile racine, sans barre d'onglets ; retour par `router.dismissTo` vers `/stats` avec `du`, `au` (AAAA-MM-JJ), comme `membres/[id].tsx` : la pile garde un seul `(tabs)`, un retour ne rouvre pas l'écran Période ; période gardée dans l'état de l'onglet, jamais en base ; aucun `stats/index.tsx` | `router.navigate` empilait un second `(tabs)` (revue) ; test : deux applications de suite, pile `['(tabs)']` | changée après contradiction |
| Même période réappliquée après « Saison » ou « Ce mois » | — | ces puces effacent `du`, `au` de l'adresse (`setParams`) : réappliquer les mêmes dates les reprend | sinon les paramètres inchangés ne relancent rien (test dédié) | à relire |
| Saisie des dates | — | `parseDisplayDate` puis `choiceError` ; `DATE_INVALID` sous le champ fautif, `END_BEFORE_START` sous « Au » ; champs partis de `stats.period` ; dates futures et sur plusieurs saisons acceptées ; `inputError` affiché sur l'onglet en filet | CONV-15, RM-04 | à relire |
| État vide | — | `!anyRecorded` : seule la carte de la maquette, « Faire l'appel » par `useNewRollCallRoute` (désactivé tant que la route est nulle) | maquette « États vides du lot 2 » | à relire |
| Période sans séance | — | « — » et « 0 » ; « Aucune séance sur la période. » par groupe ; liste vide : une seule carte avec ce texte ; groupe à excusés seuls : « — » et la barre | RM-01 | à relire |
| Groupes archivés ou d'une autre saison | — | sous-titre « Archivé », après les autres (ordre du 023) | décision du porteur du découpage | à relire |
| Synthèse et somme des groupes | note ; rien | aucune note, aucun test de somme ; écart signalé dans la PR | la synthèse compte chaque présence une fois (séance sans groupe, séance commune) | à relire |
| Barre par statut | — | 12 pt, rayon 4, ordre `SHARE_ORDER`, couleurs `theme.statuses` ; libellé d'accessibilité des parts non nulles avec `NBSP` ; légende affichée sous « Par groupe » ; aucune barre sans présence | NF-06 | à relire |
| Chiffres et texte agrandi | — | Plex Mono, 26 dans les cartes ; cartes, champs et puces passent à la ligne | charte, NF-06 | à relire |
| Dates reçues invalides au premier affichage | lire saison et état vide quand même ; masquer « Saison » tant que c'est inconnu | « Saison » masquée tant que la saison active est inconnue ; « Ce mois » et « Dates… » restent pour sortir de l'erreur | le plus simple : aucune lecture de plus. Reste : sans aucune séance enregistrée, ces deux puces s'affichent jusqu'au choix d'une période, puis l'état vide les remplace (cas d'une adresse forgée seulement) | à relire |
| « Dates… » sans chiffres lus | — | champs remplis avec la période affichée, sinon avec les dates demandées (`choice`) ; une date non valide arrive vide | revue | à relire |
| Changement de puce | vider ; garder la vue précédente | vue précédente gardée pendant la relecture : `useStats` passe `keepPrevious` à `useLoaded` ; puce choisie sélectionnée tout de suite ; chiffres masqués quand des dates invalides sautent la lecture. Ajoute `src/hooks/useStats.ts` aux fichiers (13), `useGroupStats` et `useMemberStats` inchangés | revue ; test avec une lecture suspendue | à relire |
| Textes | — | `src/config/libelles/stats.ts`, clé unique `stats` ; `index.ts` : un import, une ligne | CONV-03 | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- Écarts avec la maquette, pour la PR : ligne « Du … au … » sous les puces (voulue par le porteur) ; boutons « Exporter (CSV) » et « Rapport PDF » masqués (jalon 3) ; écran Période sans la barre d'onglets ; lignes de groupe non appuyables jusqu'au 025.
- Pour le ticket 025 : ajouter `src/app/(tabs)/stats.tsx` à ses fichiers (appui sur une ligne de groupe vers `stats/groupes/[id]`, avec `du` et `au` de la période affichée) et le critère « un appui sur un groupe de l'onglet Stats ouvre ses statistiques ».
- Pour la PR : la synthèse ne vaut pas la somme des groupes (jeu fictif : 45 présents contre 44), car une séance sans groupe compte seulement dans la synthèse ; aucune note à l'écran.

- CHANGELOG : Onglet Stats : taux de présence de la période et par groupe, période au choix (F-05, EX-27).
- Architecture : onglet `(tabs)/stats.tsx`, écran `stats/periode.tsx`, composant `AttendanceBar`.
