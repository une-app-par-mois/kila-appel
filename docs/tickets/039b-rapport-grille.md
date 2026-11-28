# 039b — Rapport PDF : grille séance par séance

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (export de données de mineurs ; HTML échappé, SEC-08 ; statuts affichés) · Trivial : non

Dépend de : 039 (`reportHtml.ts`, fonction d'échappement, libellés `rapport.ts`) · Fichiers touchés : `src/domain/reportGrid.ts` et son test (nouveaux), `src/data/reportGridRepo.ts` et son test (nouveaux), `src/domain/reportHtml.ts` (place les pages de grille), `src/config/libelles/rapport.ts` (légende) — 6 fichiers

Découpé le 2026-11-28 (réponses du porteur au découpage du jalon 3 : contenu du rapport, option B).

## Contexte

Décision du porteur du 2026-11-28 : le rapport ajoute, pour chaque groupe, **la grille séance par séance de chaque membre**, en **A4 paysage**, **coupée par blocs d'environ 25 séances**, les noms répétés sur chaque bloc ; synthèse et taux restent en portrait (039). Séparé du 039 pour tenir en une session et sous 10 fichiers.

## À lire

- Ticket 039 (HTML, CSP, échappement, pages nommées) ; tickets 023 et 025 (« Statistiques d'un membre » : séance par séance, « hors inscription », RM-03)
- `docs/PRD.md` : EX-32, RM-03, NF-06, NF-08 ; `docs/SECURITE.md` : SEC-08 ; `design/CHARTE.md` (statuts, lettres et couleurs)
- `src/data/statsRepo.ts` (séances d'un membre), `src/data/statsSql.ts`

## Ce qui change

- `src/data/reportGridRepo.ts` : `grid(period, groupId | null)` : pour chaque groupe, ses séances enregistrées de la période (date, heure) et le statut de chaque membre à chacune, **en une requête** (NF-08) ; même attribution RM-03 que les statistiques ; case vide si le membre n'était pas inscrit ce jour-là.
- `src/domain/reportGrid.ts` : `gridPages(groupGrid, labels)` :
  - blocs de 25 séances ; un dernier bloc de moins de 5 séances est fusionné avec le précédent (29 colonnes au plus) ;
  - une page `paysage` par bloc (`@page paysage { size: A4 landscape }`, `page: paysage`), titre « Groupe · séances du JJ/MM au JJ/MM » ;
  - lignes : nom et prénom répétés sur chaque bloc ; colonnes : date `JJ/MM` ; cellules : lettre du statut (P, A, R, E), jamais la couleur seule (NF-06), légende en pied de page ;
  - grande liste de membres : la page continue sur la suivante, l'en-tête des dates répété (`thead`).
- Chaque valeur passe par la fonction d'échappement du 039 (SEC-08) ; aucune nouvelle source de texte.

## Critères d'acceptation

- [ ] EX-32 : sur le jeu fictif du 023, chaque case de la grille d'un membre égale son statut dans « Statistiques d'un membre » (025) ; les comptes P, R, E, A d'une ligne égalent ceux de son taux au 039.
- [ ] Découpage : 60 séances → blocs de 25, 25, 10 ; 26 séances → un bloc de 26 ; 30 séances → 25 + 5 ; noms répétés sur chaque bloc.
- [ ] RM-03 : membre changé de groupe : ses séances sous chaque groupe selon la date ; case vide hors inscription.
- [ ] SEC-08 : nom fictif `<script>` échappé dans la grille ; aucun `<script`, `http`, `url(`.
- [ ] NF-08 : 500 membres, 3 saisons, une requête, durée mesurée ; taille du HTML mesurée (indicatif) pour une saison complète.
- [ ] À la main (040) : orientation des pages de grille (risque ci-dessous).

## Tests attendus

- `src/domain/reportGrid.test.ts` (tests nommés `EX-32`, `SEC-08`), `src/data/reportGridRepo.test.ts` sur `node:sqlite`.

## Hors périmètre

- Conversion en PDF et vérification de l'orientation (040) ; écran (041).

## Questions prévues

- Aucune réservée : contenu et mise en page décidés par le porteur le 2026-11-28.
- **Risque à vérifier** (040) : pages d'orientations mélangées (`@page` nommées) dans un même PDF. Sur Android, `printToFileAsync` fixe une seule taille de média pour tout le document et la WebView pourrait ignorer les `@page` nommées ; sur iOS, la taille de page est aussi unique. Si le mélange ne tient pas, **repli appliqué d'office : tout le rapport en A4 paysage** (synthèse et taux compris), noté « en attente du porteur ».
- Décisions automatiques proposées :
  - Lettres P, A, R, E dans les cases (couleur de la charte en fond léger, en plus), case vide hors inscription.
  - Dernier bloc de moins de 5 séances fusionné avec le précédent, 29 colonnes au plus (pas de page presque vide ; « environ 25 » de la décision).

Reporté du lot J3-3 (2026-11-28, fiche 039) :

- La feuille de style est dans l'en-tête de confiance : `reportCss(palette)` de `src/domain/reportHtml.ts` (texte fixe, couleurs `#RRGGBB` vérifiées, refusée si elle contient « < »). Les styles de la grille et la page nommée `paysage` s'y ajoutent, jamais dans le gabarit (qui échapperait le `>` des sélecteurs).
- Les pages de grille sont rendues en `SafeHtml` par le gabarit balisé `html` de `src/domain/safeHtml.ts` (chaque valeur échappée par `escapeHtml`) et passées telles quelles à `reportHtml`.
- Contrôle statique : `src/domain/safeHtml.test.ts` refuse dans tout `src/` l'appel direct `html(…)`, `html.call`, `html.apply` et `as TemplateStringsArray` ; la grille n'utilise que la forme balisée ``html`…` ``.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (visible au 041).
- Architecture : `src/domain/reportGrid.ts`, `src/data/reportGridRepo.ts`.
