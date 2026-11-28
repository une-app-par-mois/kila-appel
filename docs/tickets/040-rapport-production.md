# 040a — Rapport PDF : adaptateur expo-print et nettoyage

Statut : à faire (expo-print accordé par le porteur le 2026-11-28 ; plan validé le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (sortie de données de mineurs ; WebView ; copies en clair dans le cache) · Trivial : non

Dépend de : 033, 038, 039, 039b · Fichiers touchés : `src/data/expoPrint.ts` et son test (nouveaux), `src/hooks/cacheCopies.ts` (`cache/Print/`), `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts` (faux expo-print), `src/data/expoExports.ts` et son test, `src/appTests/eraseAll.test.tsx` (dossier `Print`), `src/staticChecksPrint.test.ts` (« exactement », reporté du 038) — 9 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3). **Redécoupé le 2026-11-28** à la séance de lancement du lot J3-5 (décision du porteur) : cette fiche garde son nom de fichier et devient le **040a** (adaptateur et nettoyage) ; le cycle du rapport (`useReport`, branchement de la grille, plafond, orientation) passe au **040b** (`040b-rapport-cycle.md`), qui dépend du 040a.

## Contexte

Prépare la production du PDF du 039 par expo-print (038) : l'adaptateur, seul importeur du module, le déplacement du PDF vers le dossier des échanges (033) sous un nom lisible, et le nettoyage de `cache/Print/`. Le cycle complet (verrou, rendu, partage) vient au 040b, l'écran au 041.

## À lire

- Tickets 033, 038, 039 ; ticket 028a (adaptateur en liste fermée d'expo-notifications : modèle)
- `docs/SECURITE.md` : SEC-08, SEC-10, SEC-12 ; `docs/ARCHITECTURE.md` §6
- `src/hooks/cacheCopies.ts`, `src/data/expoFiles.ts`, `src/data/expoExports.ts`

## Ce qui change

- `src/data/expoPrint.ts` : seul importeur d'expo-print (`src/staticChecksPrint.test.ts`, durci en « exactement [`src/data/expoPrint.ts`] ») ; `printPdf(html)` reçoit un `ReportHtml` (type marqué, seul `reportHtml` en produit), appelle `printToFileAsync({ html, width, height })` et rend le chemin du fichier, contrôlé : enfant direct de `cache/Print/` (sinon refus, sans le chemin dans l'erreur) ; aucun appel avec `uri`.
- `src/data/expoExports.ts` : les opérations sur les fichiers du rapport y vivent (`FILE_MODULE_OWNERS` n'est pas élargi) : déplacement du PDF de `cache/Print/` vers un sous-dossier neuf de `cache/exports/` sous `kila-rapport-AAAA-MM-JJ.pdf` (date du jour), original effacé si le déplacement échoue ; contrôle de l'en-tête `%PDF-` ; vidage de `cache/Print/`.
- `src/hooks/cacheCopies.ts` : `cache/Print/` vidé avec les autres copies (démarrage, sous le verrou `'cleanup'`, et Tout effacer).
- `src/__fixtures__/expoModules.ts` : faux expo-print, sans clé `printToFileAsync` dans `__fixtures__` (la clé n'est permise que dans un fichier de test, 038).
- `src/config/licences.json` : laissé tel quel si `scripts/licences.js --check` passe (expo-print y est depuis le 038).

## Critères d'acceptation

- [ ] EX-32 : le fichier déplacé commence par `%PDF-` (faux module dans les tests) et s'appelle `kila-rapport-AAAA-MM-JJ.pdf`.
- [ ] SEC-08 : l'adaptateur n'accepte que du HTML produit par `reportHtml` (type marqué) ; aucun appel avec `uri` ; chemin hors de `cache/Print/` refusé sans le chemin dans l'erreur.
- [ ] SEC-10 : `cache/Print/` vidé au démarrage (après un arrêt brutal) et après Tout effacer ; original effacé si le déplacement échoue.
- [ ] `src/staticChecksPrint.test.ts` : importeurs d'expo-print **exactement** [`src/data/expoPrint.ts`].
- [ ] EX-42 : expo-print listé dans les licences, avec sa mention MIT (`--check`).

## Tests attendus

- `src/data/expoPrint.test.ts` (faux module : chemins refusés), `src/data/expoExports.test.ts` (déplacement, nom, en-tête `%PDF-`, échec du déplacement), `src/hooks/useStartupCleanup.test.tsx`, `src/appTests/eraseAll.test.tsx`, `src/staticChecksPrint.test.ts`.

## Hors périmètre

- Cycle du rapport (`useReport`, verrou `'report'`, partage), branchement de la grille, plafond de taille, orientation : 040b.
- Écran (041) ; impression directe sur une imprimante (`printAsync`, refusée par le 038).

## Questions prévues

- ~~Plan ci-dessus à valider à la séance de lancement~~ : découpage en 040a et 040b et plan validés par le porteur le 2026-11-28 (séance de lancement du lot J3-5) ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- Décisions automatiques prévues par la pré-analyse (« à relire ») : faux expo-print sans clé `printToFileAsync` dans `__fixtures__` ; PDF déplacé de `cache/Print/` vers un sous-dossier de `cache/exports/` sous `kila-rapport-AAAA-MM-JJ.pdf` (date du jour), original effacé si le déplacement échoue ; contrôle de l'en-tête `%PDF-` ; `licences.json` laissé tel quel si `--check` passe. Les autres (vidage sous le verrou `report`, rapport `null`, 0 séance, lectures) vont au 040b.
- **Répartition des points reportés ci-dessous** (2026-11-28) : 040a prend (b) et (c) et (d) du 038, et « `cache/Print/` après un arrêt brutal » du 039b ; tout le reste (verrou, Drive, CSP, NF-08, grille, orientation, plafond, légende) va au **040b**.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- expo-print accordé (038) ; plan validé par le porteur le 2026-11-28 ; relecture du porteur avant la fusion dans le groupe (zone sensible).
- **Risque à vérifier en premier** : pages d'orientations mélangées (`@page` nommées, portrait et paysage) dans un même PDF. Sur Android, `printToFileAsync` fixe une seule taille de média (`width`, `height`) pour tout le document, et la WebView d'Android pourrait ne pas suivre les `@page` nommées ; sur iOS, le rendu par `UIPrintPageRenderer` a lui aussi une taille de page unique. Si le mélange ne tient pas, **repli appliqué d'office : tout le rapport en A4 paysage**, noté « en attente du porteur » dans `docs/DECISIONS.md`.

Reporté du lot J3-1 (2026-11-28) :

- Vérifier sur l'A55 qu'un envoi différé vers Drive lit bien le fichier avant l'effacement du sous-dossier à la fermeture de la feuille de partage (033).
- Tenir le verrou `'report'` par `fileLock.run('report', …)` (rendu dans un `finally`, même après une erreur), de l'écriture à la fermeture de la feuille de partage.

Reporté du lot J3-2 (2026-11-28, fiche 038) :

- (a) iOS : la `WKWebView` d'expo-print a JavaScript activé et aucune permission réseau à retirer. Tout le texte du rapport est échappé ; le gabarit commence par `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` ; tests de l'échappement et de la présence de la CSP (SEC-08, « à venir 039/040 »).
- (b) Effacer le PDF de `cacheDir/Print/` après le partage (et au démarrage, et après Tout effacer : SEC-08).
- (c) Les tests simulent expo-print par une fabrique `jest.mock('expo-print', () => …)` et une variable `mock…` : la clé `printToFileAsync:` n'est permise que dans un fichier de test ; aucun nom de module non littéral (« ABS-01 module non littéral »).
- (d) Durcir dans `src/staticChecksPrint.test.ts` « importeurs ⊆ [`src/data/expoPrint.ts`] » en « exactement [`src/data/expoPrint.ts`] ».

Reporté du lot J3-3 (2026-11-28, fiche 039) :

- Mesurer NF-08 sur l'A55 : requête du rapport (`reportRepo(db).report(period, groupId, today)`) et rendu PDF. Sur le poste de développement (`volumeSeed`, médiane de 5) : 36 ms sur une saison, 525 ms sur 3 saisons à deux groupes, HTML 3 ms (57 Ko) et 8 ms (166 Ko) ; le test garde « une requête » et une limite de 2 s, à surveiller sur un runner de CI chargé.
- Vérifier la CSP en rendu réel sur iOS (`WKWebView` d'expo-print, JavaScript activé) : aucune ressource chargée, styles en ligne appliqués.
- `printToFileAsync` reçoit un `ReportHtml` (seul `reportHtml` en produit) ; `report(…)` rend `null` pour un groupe introuvable.

Reporté du lot J3-4 (2026-11-28, fiche 039b) :

- **Brancher la grille** : appeler `reportGrids(report, grid, rapport.report)` (`src/domain/reportGrid.ts`, table `groupId → SafeHtml[]`) dans `reportHtml`, pages de grille après chaque groupe ; `reportGridRepo(db).grid(period, groupId)` reçoit **exactement la même période et le même filtre de groupe** que `reportRepo(db).report(…)` (un test le vérifie). Jusqu'ici, `reportGrids` et `reportGridRepo` ne sont appelés que par les tests (décision 10 du 039b, voulu).
- **Orientation** : vérifier `@page paysage` et `page: paysage` (`GRID_PAGE`) dans la WebView d'Android et dans la `WKWebView` d'iOS ; si l'orientation n'est pas respectée, repli « tout le rapport en paysage » appliqué d'office et **reposé au porteur** (« en attente du porteur »).
- **Plafond de taille du rapport** (revue de sécurité du 039b, F1) : mesurer sur l'A55 le rendu d'une saison complète (environ 650 000 caractères de HTML pour 500 membres) et du cas à trois saisons (environ 3,9 millions de caractères) ; puis fixer un plafond avec un refus clair (code et texte, comme `CSV_REJECTED_TOO_MANY`), ou borner la période.
- **`cache/Print/` après un arrêt brutal** : le vider aussi au démarrage suivant (nettoyage du 014c, sous le verrou `'cleanup'`), pas seulement après le partage.
- **Légende d'un grand bloc** : limite connue, la légende n'apparaît que sous la dernière page physique d'un bloc dont la liste de membres tient sur plusieurs pages ; à vérifier sur le PDF, et à reposer au porteur si elle gêne.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Découpage | Un ticket ; 040a et 040b | 040a : adaptateur et nettoyage (9 fichiers) ; 040b : cycle du rapport ; fiche 040 gardée sous son nom et recentrée en 040a | Plus de 10 fichiers en zone sensible ; nom de fichier gardé, liens intacts | décidée par le porteur le 2026-11-28 |
| Place des opérations sur les fichiers | `expoPrint.ts` ; `expoExports.ts` | `expoExports.ts`, `FILE_MODULE_OWNERS` non élargi | Toutes les opérations sur les fichiers y vivent | décidée par le porteur le 2026-11-28 |
| Faux expo-print | Clé `printToFileAsync` dans `__fixtures__` ; fabrique sans la clé | `fakePrint(printRoot)` rend `{ state, render }` ; la clé n'est écrite que dans le `jest.mock` du test | Clé permise seulement dans un fichier de test (038) | à relire (prévue par la pré-analyse) |
| Déplacement du PDF | Copie ; déplacement | `moveReport(printed, dir, période)` : `File.move` vers `<cache/exports/sous-dossier>/kila-rapport-AAAA-MM-JJ-au-AAAA-MM-JJ.pdf` (début et fin de la période), original effacé si le déplacement échoue | Une seule copie en clair à la fois (SEC-10) ; même forme que le CSV du 037 : deux rapports de périodes différentes ne portent plus le même nom | changée après contradiction (nom à la date du jour → période, comme DECISIONS l.729) |
| Dates du nom du PDF | Forme `AAAA-MM-JJ` seule ; vraies dates | Vraies dates : la date est reconstruite (`Date.UTC`) et doit redonner le même texte (mois 00 ou 13, 30 février, 29 février d'une année non bissextile refusés) ; début avant ou égal à la fin ; sinon refus, original effacé | Le nom ne doit jamais porter une date impossible | à relire (correction de la revue) |
| iOS résout sans `uri` | Faire confiance au type ; contrôler | `typeof uri !== 'string'` → « Rendu du PDF impossible » | `ExpoPrintToFile.swift` (58.0.9) résout au lieu de rejeter | à relire (correction de la revue) |
| Fichier partiel après un rendu en échec | Effacé par `printPdf` ; laissé au cycle | Laissé : `printPdf` ne touche pas aux fichiers ; le 040b vide `cache/Print/` dans son `finally` ; le faux module crée le fichier avant de lever, comme Android | Toutes les opérations sur les fichiers dans `expoExports.ts` (décision du porteur) | à relire (correction de la revue) |
| Fonctions sans appelant | Les brancher au 040a ; attendre le 040b | `printPdf`, `moveReport`, `printedPath` (hors `printPdf`) n'ont d'appelant que les tests jusqu'au 040b ; seul `clearPrint` est branché (`clearCacheCopies`) | Voulu : découpage 040a / 040b décidé par le porteur le 2026-11-28 | à relire |
| En-tête `%PDF-` | Contrôlé ; non contrôlé | Lu sur la source (5 octets) avant le déplacement ; fichier vide, court, absent ou illisible : « Fichier PDF invalide », original effacé | EX-32, rien d'autre qu'un PDF ne sort | à relire (prévue par la pré-analyse) |
| `licences.json` | Modifié ; laissé tel quel | Laissé tel quel : `node scripts/licences.js --check` passe (63 entrées) | expo-print y est depuis le 038 | à relire (prévue par la pré-analyse) |
| Taille de page de `printPdf` | `width`, `height` libres ; liste fermée | `printPdf(html, orientation)`, `orientation` ∈ `portrait` (595 × 842 pt), `landscape` (842 × 595 pt), A4 seulement ; le choix revient au 040b | Argument fermé (SEC-08) ; prépare le repli paysage | à relire |
| Contrôle du chemin rendu | Dans `expoPrint.ts` ; dans `expoExports.ts` | `printedPath(uri)` dans `expoExports.ts` (`uriToPath`, enfant direct de `cache/Print/`, extension `.pdf`) ; `expoPrint.ts` n'importe pas expo-file-system | `FILE_MODULE_OWNERS` non élargi (décision du porteur) | à relire |
| Chemin rendu refusé | Effacer le fichier ; ne pas le toucher | Pas touché : un chemin non contrôlé n'est jamais effacé ; s'il est dans `cache/Print/` (sous-dossier), le vidage le reprend | Ne jamais effacer hors des dossiers dédiés | à relire |
| Destination refusée (dossier, date) | Garder l'original ; l'effacer | Effacé : une fois la source contrôlée, tout échec efface l'original | SEC-10 : aucune copie qui reste | à relire |
| Vidage de `cache/Print/` | `expoStorage('Print')` (expoFiles.ts) ; `clearPrint` (expoExports.ts) | `clearPrint` dans `expoExports.ts`, appelé par `clearCacheCopies` avec les autres dossiers (démarrage sous `'cleanup'`, Tout effacer sous `'erase'`) | `expoFiles.ts` hors du périmètre ; toutes les opérations du rapport dans `expoExports.ts` | à relire |
| Faux `File.move` | `renameSync` ; copie puis effacement | Copie puis effacement (`copyFileSync`, `rmSync`), refus si la destination existe | `src/node.d.ts` ne déclare pas `renameSync` : 9 fichiers gardés | à relire |

## Questions pour le porteur

## À reporter

- Reporté du lot J3-4 (039b, décision automatique 10) : branchement de la grille dans `reportHtml` → **040b**.

- CHANGELOG : rien (visible au 041).
- Architecture : `src/data/expoPrint.ts` (seul importeur d'expo-print : `printPdf(html: ReportHtml, orientation)`, A4 portrait ou paysage, chemin rendu contrôlé) ; `src/data/expoExports.ts` (`printedPath`, `moveReport` vers `kila-rapport-AAAA-MM-JJ-au-AAAA-MM-JJ.pdf`, `clearPrint`) ; `clearCacheCopies` vide aussi `cache/Print/`.
- `docs/SECURITE.md` (intégration) : SEC-08, vérification « vidage de `cache/Print/` : à venir, 040 » → `src/data/expoExports.test.ts` (« SEC-10 clearPrint »), `src/hooks/useStartupCleanup.test.tsx`, `src/appTests/eraseAll.test.tsx` ; chemin rendu hors de `cache/Print/` refusé sans le chemin : `src/data/expoPrint.test.ts` ; importeurs d'expo-print exactement [`src/data/expoPrint.ts`] : `src/staticChecksPrint.test.ts`. SEC-10 : `cache/Print/` dans les dossiers vidés au démarrage et après Tout effacer ; original effacé si le déplacement échoue.
- 040b : vider `cache/Print/` par `clearPrint()` au début du rapport, sous le verrou `'report'` ; `printPdf(html, orientation)` puis `moveReport(chemin, sousDossier, { from, to })` (période du rapport) ; le sous-dossier de `cache/exports/` effacé à la fermeture de la feuille ; `printPdf` ne vide pas `cache/Print/` lui-même.
- 040b : `clearPrint()` aussi dans le `finally` du cycle, sous le verrou `'report'`, après une erreur de rendu comme après un chemin refusé (Android laisse un fichier partiel) ; un test avec le faux module en mode `fail` (fichier partiel laissé dans `cache/Print/`) vérifie que rien ne reste ; un test vérifie que le verrou `'report'` exclut `'cleanup'` et `'erase'` (et réciproquement).
- Intégration (`docs/DECISIONS.md`) : la ligne l.506 (nom `kila-rapport-AAAA-MM-JJ.pdf`) est remplacée par la l.827 (nom à la période, changée après contradiction).
