# 039 — Rapport PDF : synthèse et taux (HTML)

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (calculs affichés : taux de présence ; export de données de mineurs ; HTML échappé, SEC-08) · Trivial : non

Dépend de : aucun (n'utilise pas expo-print : le HTML se teste seul ; la grille séance par séance vient au 039b) · Fichiers touchés : `src/domain/reportHtml.ts` et son test (nouveaux), `src/data/reportRepo.ts` et son test (nouveaux), `src/config/libelles/rapport.ts` (nouveau : textes du PDF, NF-07) — 5 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

EX-32 : « Format A4 : synthèse de la période, puis taux par groupe et par membre ». Le contenu exact est une question ouverte du PRD (« → ticket F-09 ») : il est posé au porteur à la séance de lancement, avec la proposition ci-dessous. Ce ticket produit les données (une requête) et la page HTML de la synthèse et des taux, en A4 portrait ; la grille séance par séance de chaque membre (réponse du porteur du 2026-11-28, option B) est au 039b, pour tenir en une session ; expo-print fera le PDF (040).

## À lire

- `docs/PRD.md` : EX-32, EX-27, RM-01, RM-03, NF-06, NF-08, §9 (question ouverte) ; `docs/CADRAGE.md` : « Données manipulées » (nom, prénom, présences : export « rapport PDF »)
- `docs/SECURITE.md` : SEC-08 (chaque valeur échappée, aucun script, aucune ressource externe), SEC-12
- `design/maquettes/` : « Rapport PDF » (aperçu de la feuille : « Ki&La · Rapport de présence », période, barre par statut, « Synthèse, puis une page par groupe… ») ; `design/CHARTE.md` (couleurs des statuts, NF-06 : jamais la couleur seule)
- Tickets 023 et 025 (plan validé des statistiques, arrondi, « — ») ; `src/data/statsRepo.ts`, `src/data/statsSql.ts`, `src/domain/attendanceRate.ts`

## Ce qui change (contenu validé par le porteur le 2026-11-28)

- `src/data/reportRepo.ts` : `report(period, groupId | null)` : synthèse, groupes et membres de chaque groupe **en une requête** d'agrégats (réutilise `statsSql.ts` ; mêmes règles que les écrans du 023 et du 025, donc les mêmes nombres).
- `src/domain/reportHtml.ts` : `reportHtml(report, labels)` → page HTML complète :
  - en tête : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`, aucun `<script>`, aucune adresse, police du système ; `@page { size: A4 portrait; margin: 15mm }` (page nommée `portrait`, la grille du 039b ajoute la page `paysage`) ;
  - **page 1, synthèse** : « Ki&La · Rapport de présence », période `JJ/MM/AAAA – JJ/MM/AAAA`, « Créé le JJ/MM/AAAA », taux de présence, nombre de séances, barre par statut avec les comptes écrits (Présent, Retard, Excusé, Absent), tableau des groupes (groupe, séances, taux) ;
  - **puis une page par groupe** (`break-before: page`) : nom, séances, taux, tableau des membres triés par nom (nom, prénom, P, R, E, A, taux) ; « — » sans séance (RM-01) ;
  - jamais : date de naissance, contact, commentaire de séance ; le détail séance par séance est la grille du 039b.
- `reportHtml` reçoit les pages de grille déjà rendues (039b) et les place après la page de chaque groupe ; sans grille, le rapport est complet.
- Échappement de chaque valeur (`&`, `<`, `>`, `"`, `'`) par une seule fonction ; aucun texte venu de la base hors de cette fonction.
- Textes dans `src/config/libelles/rapport.ts`, passés au générateur (le domaine n'importe pas la configuration).

## Critères d'acceptation

- [ ] EX-32, RM-01 : sur le jeu fictif du 023, les taux du HTML sont ceux du tableau vérifié à la main (87 %, 88 %, 78 %, 64 %…) ; groupe sans séance : « — ».
- [ ] SEC-08 : un nom fictif `<img src=http://x>` ou `</style><script>` apparaît échappé ; le HTML ne contient ni `<script`, ni `http:`, ni `https:`, ni `//` d'adresse, ni `url(` ; la CSP est la première balise de `<head>`.
- [ ] Filtre sur un groupe : synthèse et page de ce groupe seulement.
- [ ] NF-06 : chaque statut de la barre a son compte écrit ; contraste des couleurs de la charte.
- [ ] NF-08 : 500 membres, 3 saisons : une requête, durée mesurée.
- [ ] ABS-03 : aucune date de naissance ni téléphone dans le HTML (test sur un jeu qui en contient).

## Tests attendus

- `src/domain/reportHtml.test.ts` (tests nommés `SEC-08`, `EX-32`), `src/data/reportRepo.test.ts` sur `node:sqlite`.
- À la main (040) : rendu sur l'émulateur, puis sur l'A55, ouvert sur l'ordinateur.

## Hors périmètre

- Conversion en PDF, fichier, partage (040) ; écran (041) ; podium (F-14, jalon 5).

## Questions prévues

- **Réservée (question ouverte du PRD)** : contenu du rapport, voir la proposition ci-dessus et les options du découpage.
- Plan ci-dessus à valider (zone sensible).
- Décisions automatiques proposées :
  - Police du système (Roboto, San Francisco) plutôt qu'IBM Plex intégrée en `data:` (près de 600 Ko de HTML, et polices embarquées au build, pas lisibles comme fichiers).
  - Pas de numéro de page (les boîtes de marge `@page` ne sont pas garanties par toutes les WebView d'Android).
  - Membres archivés listés s'ils ont une présence dans la période (même règle que les statistiques).

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Contenu : **option B** (décision du porteur du 2026-11-28) : la proposition ci-dessus, plus **la grille séance par séance pour chaque membre** ; grille découpée dans le 039b (le 039 seul passait à environ 9 fichiers et plus d'une session).
- Mise en page : **synthèse et taux par membre en A4 portrait** ; pages de grille en A4 paysage (039b).
- **Risque à vérifier** : pages d'orientations mélangées (`@page` nommées, portrait et paysage) dans un même PDF. Sur Android, `printToFileAsync` fixe une seule taille de média (`width`, `height`) pour tout le document, et la WebView d'Android pourrait ne pas suivre les `@page` nommées ; sur iOS, le rendu par `UIPrintPageRenderer` a lui aussi une taille de page unique. Si le mélange ne tient pas, **repli appliqué d'office : tout le rapport en A4 paysage**, noté « en attente du porteur » dans `docs/DECISIONS.md`.
- Plan validé par le porteur le 2026-11-28 ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Police du rapport PDF | IBM Plex en `data:` ; police du système | Police du système pour le PDF seulement : `system-ui, sans-serif`, `font-variant-numeric: tabular-nums` ; SEC-08 inchangée ; exception notée dans `design/CHARTE.md` §4 | Réponse du porteur à la séance de lancement du lot J3-3 ; la CSP du rapport interdit toute police embarquée | décidée par le porteur le 2026-11-28 |
| Échappement et gabarit | — | `escapeHtml` et un gabarit balisé ; types `SafeHtml` et `ReportHtml` ; `safeHtml.ts` séparé si le fichier dépasse 300 lignes | Pré-analyse du lot J3-3 (D1 à D20, résumé) ; SEC-08 | à relire |
| CSP et tests de non-présence | — | CSP exacte en premier ; tests de non-présence de `<script`, `<a`, `<link`, `<base`, `<form`, `<iframe`, `<img`, `refresh`, `@import`, `url(`, `http` | Pré-analyse du lot J3-3 ; SEC-08 | à relire |
| Mise en page | — | Largeurs en entiers et en % ; `print-color-adjust` ; sauts de page ; orientation dans une seule constante | Pré-analyse du lot J3-3 ; repli paysage possible (039b) | à relire |
| Données du rapport | — | Une requête qui réutilise `credits` ; mêmes groupes et mêmes membres que les écrans de statistiques ; une page par groupe seulement s'il a des séances ; période sans séance : page valide ; `today` en paramètre | Pré-analyse du lot J3-3 ; mêmes nombres que les écrans (EX-32, RM-01) | à relire |
| Tests de règles | — | Test « RM-03 Q2 » qui fixe le comportement actuel (inversé au 043) ; ABS-03 testé | Pré-analyse du lot J3-3 | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (visible au 041).
- Architecture : `src/domain/reportHtml.ts`, `src/data/reportRepo.ts`, libellés `rapport.ts`.
- PRD (à l'intégration) : §9, question « Contenu exact du rapport PDF » close : synthèse, taux par groupe et par membre, grille séance par séance (décision du porteur du 2026-11-28).
