# 040 — Rapport PDF : production du fichier et partage

Statut : à faire (expo-print accordé par le porteur le 2026-11-28) · Jalon : 3 · Zone sensible : **oui** (sortie de données de mineurs ; WebView ; copies en clair dans le cache) · Trivial : non

Dépend de : 033, 038, 039, 039b · Fichiers touchés : `src/data/expoPrint.ts` et son test (nouveaux), `src/hooks/useReport.ts` et son test (nouveaux), `src/hooks/cacheCopies.ts` (`cache/Print/`), `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts` (faux expo-print), `src/config/licences.json` (régénéré) — 8 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

Transforme le HTML du 039 en PDF A4 par expo-print (038), le range dans le dossier des échanges (033) sous un nom lisible, le partage, puis efface toutes les copies. L'écran vient au 041.

## À lire

- Tickets 033, 038, 039 ; ticket 028a (adaptateur en liste fermée d'expo-notifications : modèle)
- `docs/SECURITE.md` : SEC-08, SEC-09, SEC-10, SEC-12 ; `docs/ARCHITECTURE.md` §6
- `src/hooks/useBackupExport.ts`, `src/hooks/cacheCopies.ts`, `src/data/expoFiles.ts`

## Ce qui change

- `src/data/expoPrint.ts` : seul importeur d'expo-print (`src/staticChecksPrint.test.ts`, 038) ; `printPdf(html)` appelle `printToFileAsync({ html, width: 595, height: 842 })` et rend le chemin du fichier, contrôlé : enfant direct de `cache/Print/` (sinon refus, sans le chemin dans l'erreur) ; `clearPrintDir()`.
- `src/hooks/useReport.ts` : verrou `'report'` ; HTML (039) ; PDF ; copie dans un sous-dossier neuf de `cache/exports/` sous `kila-rapport-AAAA-MM-JJ.pdf` ; fichier de `cache/Print/` effacé tout de suite ; partage `application/pdf` ; sous-dossier effacé à la fermeture de la feuille, réussite ou échec ; journal par codes (`REPORT_SHARED`, `REPORT_FAILED`).
- `src/hooks/cacheCopies.ts` : `cache/Print/` vidé avec les autres copies (démarrage, Tout effacer).
- `src/config/licences.json` : régénéré par `scripts/licences.js` (EX-42), expo-print y entre.

## Critères d'acceptation

- [ ] EX-32 : le fichier partagé est un PDF (`%PDF-` en tête, faux module dans les tests) nommé `kila-rapport-AAAA-MM-JJ.pdf`.
- [ ] SEC-10 : après un partage, une erreur de rendu ou une erreur de copie, rien ne reste ni dans `cache/Print/` ni dans `cache/exports/` ; `cache/Print/` vidé au démarrage et après Tout effacer.
- [ ] SEC-08 : l'adaptateur n'accepte que du HTML produit par `reportHtml` (type marqué) ; aucun appel avec `uri`.
- [ ] Verrou commun respecté (export, restauration, purge, Tout effacer).
- [ ] EX-42 : expo-print listé dans les licences, avec sa mention MIT.
- [ ] **Orientations** : pages de synthèse et de taux en portrait, pages de grille en paysage dans le même PDF, vérifié sur l'émulateur dès le début du ticket ; sinon repli (tout en paysage, `width: 842, height: 595`), appliqué d'office et noté « en attente du porteur ».
- [ ] **À la main sur l'émulateur puis l'A55** : PDF A4, accents justes, sauts de page avant chaque groupe et chaque bloc de grille ; `adb logcat` sans tentative de connexion pendant le rendu ; PDF ouvert sur l'ordinateur (critère de sortie).

## Tests attendus

- `src/data/expoPrint.test.ts` (faux module : chemins refusés, dossier vidé), `src/hooks/useReport.test.tsx` (cycle complet, échecs, verrou), `src/hooks/useStartupCleanup.test.tsx`.

## Hors périmètre

- Écran (041) ; impression directe sur une imprimante (`printAsync`, refusée par le 038).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible), après la réponse du porteur au 038.
- Décision automatique proposée : PDF copié sous un nom lisible avant le partage (expo-print le nomme `<uuid>.pdf`), le fichier d'origine effacé aussitôt.

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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- Reporté du lot J3-4 (039b, décision automatique 10) : `src/domain/reportGrid.ts` produit la table `groupId → SafeHtml[]` des pages de grille ; le 040 la branche dans `reportHtml` (pages après chaque groupe) et vérifie l'orientation paysage à la main.

- CHANGELOG : rien (visible au 041).
- Architecture : `src/data/expoPrint.ts` (seul importeur d'expo-print), `src/hooks/useReport.ts` ; `clearCacheCopies` vide aussi `cache/Print/`.
