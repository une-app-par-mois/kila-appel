# 039b — Rapport PDF : grille séance par séance

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (export de données de mineurs ; HTML échappé, SEC-08 ; statuts affichés) · Trivial : non

Dépend de : 039 (`reportHtml.ts`, fonction d'échappement, libellés `rapport.ts`) · Fichiers touchés : `src/domain/reportGrid.ts` et son test (nouveaux), `src/data/reportGridRepo.ts` et son test (nouveaux), `src/domain/reportHtml.ts` (styles de la grille dans `reportCss` ; branchement des pages au 040), `src/config/libelles/rapport.ts` (légende) — 7 fichiers d'après le plan du lot J3-4

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
  - une page `paysage` par bloc (`@page paysage { size: A4 landscape }`, `page: paysage`), titre « Groupe · séances du JJ/MM/AAAA au JJ/MM/AAAA » (décision 6 du lot J3-4) ;
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
  - Lettres P, A, R, E dans les cases (couleur de la charte en fond léger, en plus), case vide hors inscription. Fond léger précisé par le porteur le 2026-11-28 : teinte claire calculée, lettre en texte foncé.
  - Dernier bloc de moins de 5 séances fusionné avec le précédent, 29 colonnes au plus (pas de page presque vide ; « environ 25 » de la décision).

Reporté du lot J3-3 (2026-11-28, fiche 039) :

- La feuille de style est dans l'en-tête de confiance : `reportCss(palette)` de `src/domain/reportHtml.ts` (texte fixe, couleurs `#RRGGBB` vérifiées, refusée si elle contient « < »). Les styles de la grille et la page nommée `paysage` s'y ajoutent, jamais dans le gabarit (qui échapperait le `>` des sélecteurs).
- Les pages de grille sont rendues en `SafeHtml` par le gabarit balisé `html` de `src/domain/safeHtml.ts` (chaque valeur échappée par `escapeHtml`) et passées telles quelles à `reportHtml`.
- Contrôle statique : `src/domain/safeHtml.test.ts` refuse dans tout `src/` l'appel direct `html(…)`, `html.call`, `html.apply` et `as TemplateStringsArray` ; la grille n'utilise que la forme balisée ``html`…` ``.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Couleur des cases P/R/E/A | Fond plein de la charte ; `color-mix` ; teinte calculée | Teinte claire calculée en TypeScript à partir du fond `#RRGGBB` de la charte, lettre en couleur de texte foncée ; pas de `color-mix` ; ligne ajoutée à `design/CHARTE.md` | Lisible à l'impression, aucune fonction CSS récente dans la WebView | décidée par le porteur le 2026-11-28 |
| 1. Source du statut d'une case | — | Uniquement `credits` | Même attribution RM-03 que les statistiques | à relire |
| 2. Lignes de la grille | — | Les membres de `report.groups[i].members` du 039 | Mêmes lignes que les taux du rapport | à relire |
| 3. Requête | — | Une seule requête (NF-08) ; colonnes égales à `g.sessions` | Comptes cohérents avec le 039 | à relire |
| 4. Case vide et légende | — | Texte de la maquette : « P : présent · R : retard · E : excusé · A : absent. Case vide : hors inscription ou sans statut. » ; la première phrase est construite à partir de `letters` et des noms de statut de `commun` (CONV-16) | La maquette fait foi (le texte de `stats.ts` dit « séance hors inscription ») ; une lettre changée fait suivre la légende | changée après contradiction |
| 5. Ordre et en-tête des colonnes | — | Tri par date, heure, id ; en-tête `JJ/MM`, avec l'heure seulement si plusieurs séances tombent le même jour | Colonnes distinctes sans surcharge | à relire |
| 6. Titre d'un bloc | « du JJ/MM au JJ/MM » ; avec l'année | « Groupe · séances du JJ/MM/AAAA au JJ/MM/AAAA » | Une période peut couvrir deux années | à relire |
| 7. Groupe archivé ou sans membre | — | « Archivé » sur les blocs ; un groupe sans membre n'a pas de grille | Même mention qu'au 039 ; pas de page vide | à relire |
| 8. Place de la légende | Pied de page ; sous le bloc | Un paragraphe sous chaque bloc | Pied de page non fiable dans la WebView | à relire |
| 9. Styles | — | Constante `GRID_PAGE` ; tous les styles dans `reportCss` ; police 8 pt ; aucun style en ligne | Feuille de confiance du 039 (SEC-08) | à relire |
| 10. Sortie du module | Pages placées par `reportHtml` ; table | `reportGrid.ts` produit la table `groupId → SafeHtml[]` ; le branchement dans le rapport se fait au 040 (reporté dans la fiche 040) | Garder le 039b sous 10 fichiers | à relire |
| 11. Oracle EX-32 | Valeurs écrites en dur ; `statsRepo.member` | Comparaison à `statsRepo.member`, y compris après la suppression d'un groupe ; aucun test RM-03 Q2 écrit en dur | Une seule vérité, celle des statistiques | à relire |
| 12. Volume (NF-08) | — | Une requête en moins de 2 s ; taille du HTML journalisée sans seuil | Mesure indicative, pas de seuil arbitraire | à relire |
| Nombre de fichiers | — | 7 fichiers | Sous 10 | à relire |
| 13. Marge des pages paysage | 15 mm comme le portrait ; 10 mm | 10 mm (`@page paysage`) | Une place de plus pour 25 à 29 colonnes de dates | à relire |
| 14. Teinte claire des cases | Part du fond gardée : 20 %, 25 %, 33 % | 25 % du fond de la charte mêlé de blanc (`lightTint`, `TINT_SHARE`), couleur revérifiée `#RRGGBB` ; test : contraste texte foncé / teinte d'au moins 7:1 pour les quatre statuts | Couleur reconnaissable, lettre très lisible à l'impression | à relire |
| 15. Filtre introuvable ou invalide | `null` ; erreur ; grille vide | Grille vide (`Map` vide), sans requête pour un identifiant invalide ; période et saison revalidées (erreur, comme le 039) | Le rapport du 039 dit déjà « groupe introuvable » ; la grille n'ajoute rien | à relire |
| 16. Largeurs et en-tête des colonnes | `colgroup` à largeurs en ligne ; classes | Comme la maquette : une seule colonne « Nom Prénom » (`th.who`, en-tête vide, 40 mm `GRID_NAMES_MM`, coupure permise, texte normal) ; cases `.c` centrées sans marge latérale ; en-têtes de date sans gras ; heure sous la date par `<br>`. Test : (277 − 40) / 29 ≈ 8,2 mm par case, au moins 8 mm : la date reste en 8 pt | Maquette « Rapport PDF » ; décision 9 : aucun style en ligne | changée après contradiction |
| 17. Libellés de la grille | Objet séparé ; dans `rapport.report` | `gridTitle` et `gridLegend` dans `rapport.report` (type `GridLabels` = `archived`, `letters` de `ReportLabels` + ces deux textes) | Un seul objet de textes passé au rapport et à la grille | à relire |
| 19. Même JJ/MM sur deux années dans un bloc | Rien ; année partout ; année sur les colonnes concernées | Année (AA) sous la date, comme l'heure, seulement pour les colonnes dont le « JJ/MM » revient sur une autre année dans le même bloc | Colonnes distinctes sur une période de plusieurs saisons, sans surcharger le cas courant | à relire |
| 20. Aide « Archivé » | Une par fichier ; une seule | `named` exportée par `reportHtml.ts`, typée sur `{ archived: string }`, utilisée par le rapport et la grille | Pas de doublon (revue de code) | à relire |
| 18. Mesure de la taille du HTML | Octets ; caractères | Caractères (`length`), journalisés par `process.stdout.write` sans seuil | `Buffer` n'est pas typé dans la configuration de l'appli, qui vérifie aussi les tests | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (visible au 041).
- Architecture : `src/domain/reportGrid.ts` (pages A4 paysage de la grille, blocs de 25 séances, table `groupId → SafeHtml[]`), `src/data/reportGridRepo.ts` (séances et statuts par groupe, une requête sur `credits`) ; `GRID_PAGE` et `lightTint` dans `src/domain/reportHtml.ts`.
- SECURITE (SEC-08, colonne Vérification) : grille du 039b vérifiée par `src/domain/reportGrid.test.ts` (« SEC-08 nom fictif <script> échappé ; aucun <script, http, url( ni style en ligne », « SEC-08 couleur hors #RRGGBB refusée par la teinte »), styles de la grille dans `reportCss`.
- Mesures NF-08 (poste de développement, 2026-11-28) : requête de la grille 38 à 50 ms (une saison, 10 groupes, 400 séances) et 362 à 365 ms (3 saisons, séances à deux groupes, 30 groupes) ; HTML des pages de grille environ 650 k caractères (une saison) et 3 900 k caractères (3 saisons), indicatif.
- Code branché au ticket suivant : `reportGrids` et `reportGridRepo` ne sont appelés que par les tests au 039b ; le 040 les appelle. C'est voulu (décision 10).
- Fiche 040 :
  - brancher `reportGrids(report, grid, rapport.report)` dans `reportHtml` ; le rapport et la grille reçoivent exactement la même période et le même filtre de groupe ;
  - vérifier `@page paysage` et `page:` dans la WebView d'iOS et d'Android ; si l'orientation n'est pas respectée, repli : rapport tout en paysage, à reposer au porteur ;
  - plafond de taille du rapport (revue de sécurité, F1) : mesurer sur l'A55 une saison complète (environ 650 k caractères de HTML pour 500 membres) et le cas à 3,9 M caractères (3 saisons), puis fixer un plafond avec un refus clair (comme `CSV_REJECTED_TOO_MANY`) ou borner la période ;
  - vider `cache/Print/` aussi après un arrêt brutal (nettoyage au démarrage) ;
  - limite connue : la légende n'apparaît que sous la dernière page physique d'un très grand bloc (liste de membres sur plusieurs pages) ; à vérifier sur le PDF.
