# 040b — Rapport PDF : cycle du rapport (verrou, grille, plafond, orientation)

Statut : à faire (plan validé par le porteur le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (sortie de données de mineurs ; WebView ; copies en clair dans le cache) · Trivial : non

Dépend de : 040a (`040-rapport-production.md` : adaptateur expo-print, déplacement du PDF, nettoyage) · Fichiers touchés : `src/hooks/useReport.ts` et son test (nouveaux), `src/domain/reportHtml.ts` et son test (branchement de `reportGrids`, orientation) — 4 à 5 fichiers

Créé le 2026-11-28 à la séance de lancement du lot J3-5 (découpage du 040 validé par le porteur). Reprend de la fiche 040 le cycle du rapport et les points reportés des lots J3-1 à J3-4 qui le concernent (voir la répartition dans la fiche 040a).

## Contexte

Le 040a fournit l'adaptateur d'expo-print et les opérations sur les fichiers. Ce ticket enchaîne le cycle : verrou, lecture du rapport et de la grille, HTML, plafond de taille, PDF, déplacement, partage, effacement. L'écran vient au 041.

## À lire

- Fiche 040a et ses points reportés (lots J3-1 à J3-4) ; tickets 033, 039, 039b (décision 10 : branchement de la grille)
- `docs/SECURITE.md` : SEC-08, SEC-09, SEC-10, SEC-12 ; `docs/PRD.md` : EX-32, NF-08
- `src/hooks/useBackupExport.ts` (modèle du cycle), `src/hooks/useAttendanceExport.ts` (refus `CSV_REJECTED_TOO_MANY`), `src/domain/reportHtml.ts`, `src/domain/reportGrid.ts`

## Ce qui change

- `src/hooks/useReport.ts` : `fileLock.run('report', …)` (rendu dans un `finally`, même après une erreur), de l'écriture à la fermeture de la feuille de partage ; au début, `cache/Print/` et le dossier des échanges du rapport vidés sous le verrou ; lecture du rapport (039) et de la grille (039b) ; HTML ; plafond ; PDF (040a) ; déplacement sous `kila-rapport-AAAA-MM-JJ.pdf` ; partage `application/pdf` ; sous-dossier effacé à la fermeture de la feuille, réussite ou échec ; journal par codes (`REPORT_SHARED`, `REPORT_FAILED`, `REPORT_REJECTED_TOO_LARGE`).
- **Branchement de la grille** : `reportGrids(report, grid, rapport.report)` dans `reportHtml`, pages de grille après chaque groupe ; `reportGridRepo(db).grid(period, groupId)` reçoit **exactement la même période et le même filtre de groupe** que `reportRepo(db).report(…)` (un test le vérifie).
- **Plafond** (décision du porteur du 2026-11-28) : 1 000 000 caractères de HTML, mesurés par `length` après `reportHtml` et avant `printToFileAsync` ; constante nommée, **provisoire**, à ajuster après la mesure sur l'A55 ; au-delà, échec `'tooLarge'`, code `REPORT_REJECTED_TOO_LARGE`, aucun PDF produit. Texte du refus (écran, 041) : « Rapport trop long : réduisez la période ou choisissez un groupe ».
- **Orientation** (décision du porteur du 2026-11-28) : Android suit le résultat de l'émulateur : pages mélangées (synthèse et taux en portrait, grille en paysage) si elles tiennent, sinon tout en paysage (`width: 842, height: 595`) ; iOS : tout en paysage d'office (`Platform.OS`), à revoir au jalon 7. L'orientation se vérifie tôt sur l'émulateur, avec un banc d'essai **jamais commité**.
- Issues : rapport `null` (groupe introuvable) → `'failed'` ; 0 séance → `'empty'` ; lectures sans transaction commune.

## Critères d'acceptation

- [ ] EX-32 : le fichier partagé est un PDF (`%PDF-` en tête, faux module) nommé `kila-rapport-AAAA-MM-JJ.pdf`, avec les pages de grille après chaque groupe.
- [ ] La grille reçoit la même période et le même filtre de groupe que le rapport (test).
- [ ] Plafond : un HTML de plus de 1 000 000 caractères → `'tooLarge'`, `REPORT_REJECTED_TOO_LARGE`, `printToFileAsync` jamais appelé, rien dans le cache.
- [ ] SEC-10 : après un partage, une erreur de rendu, une erreur de copie ou un refus, rien ne reste ni dans `cache/Print/` ni dans `cache/exports/`.
- [ ] Verrou commun respecté (export, restauration, purge, Tout effacer) ; verrou rendu après une erreur.
- [ ] Rapport `null` → `'failed'` ; 0 séance → `'empty'`.
- [ ] Orientation : Android selon l'émulateur (mélange ou repli paysage) ; iOS en paysage (`Platform.OS`), testé.
- [ ] ABS-04 : aucun nom dans le journal ni dans les erreurs.
- [ ] **À la main sur l'émulateur puis l'A55** : PDF A4, accents justes, sauts de page avant chaque groupe et chaque bloc de grille ; `adb logcat` sans tentative de connexion pendant le rendu ; PDF ouvert sur l'ordinateur (critère de sortie).

## Tests attendus

- `src/hooks/useReport.test.tsx` (cycle complet, échecs, plafond, verrou, `null`, 0 séance, même période et même filtre pour la grille), `src/domain/reportHtml.test.ts` (pages de grille, orientation).

## Hors périmètre

- Adaptateur, déplacement et nettoyage (040a) ; écran et libellés (041, dans `src/config/libelles/exports.ts`).

## Mesures et vérifications reportées

- **Mesure sur l'A55** (décision du porteur du 2026-11-28) : au prétest du jalon 3, après le 041 ; le 040b est fusionné avec la valeur provisoire du plafond. Mesurer le rendu d'une saison complète (environ 650 000 caractères pour 500 membres) et du cas à trois saisons (environ 3,9 millions), et NF-08 (requête du rapport et rendu PDF).
- Vérifier sur l'A55 qu'un envoi différé vers Drive lit bien le fichier avant l'effacement du sous-dossier (033).
- Vérifier la CSP en rendu réel sur iOS (`WKWebView` d'expo-print, JavaScript activé) : aucune ressource chargée, styles en ligne appliqués (038, 039).
- Légende d'un grand bloc : n'apparaît que sous la dernière page physique d'un bloc sur plusieurs pages ; à vérifier sur le PDF et à reposer au porteur si elle gêne (039b).

## Questions prévues

- Plan et découpage validés par le porteur le 2026-11-28 (séance de lancement du lot J3-5) ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- Décisions automatiques prévues par la pré-analyse (« à relire ») : `cache/Print/` et le dossier des échanges vidés au début de chaque rapport, sous le verrou `report` ; rapport `null` → `'failed'` ; 0 séance → `'empty'` ; lectures sans transaction commune.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Découpage | Un ticket ; 040a et 040b | 040b : `useReport`, branchement de la grille, plafond, orientation ; dépend du 040a | Plus de 10 fichiers en zone sensible | décidée par le porteur le 2026-11-28 |
| Plafond de taille | Plafond ; période bornée | 1 000 000 caractères de HTML (`length`, après `reportHtml`, avant `printToFileAsync`), constante nommée provisoire ; `'tooLarge'`, `REPORT_REJECTED_TOO_LARGE` ; texte « Rapport trop long : réduisez la période ou choisissez un groupe » (041) | Rendu borné avant la WebView ; valeur à ajuster après la mesure sur l'A55 | décidée par le porteur le 2026-11-28 |
| Orientation | Pages mélangées ; tout en paysage | Android : selon l'émulateur (mélange s'il tient, sinon paysage) ; iOS : paysage d'office (`Platform.OS`), à revoir au jalon 7 ; banc d'essai jamais commité | Taille de page unique probable sur iOS | décidée par le porteur le 2026-11-28 |
| Mesure sur l'A55 | Avant la fusion ; au prétest | Au prétest du jalon 3, après le 041 ; fusion avec la valeur provisoire | Ne pas bloquer le lot | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

## À reporter

- 041 : libellé du refus « Rapport trop long : réduisez la période ou choisissez un groupe » dans `src/config/libelles/exports.ts`, affiché sur `'tooLarge'`.
- CHANGELOG : rien (visible au 041).
- Architecture : `src/hooks/useReport.ts` (verrou `'report'`, plafond `REPORT_REJECTED_TOO_LARGE`).
