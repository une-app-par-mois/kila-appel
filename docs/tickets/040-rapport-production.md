# 040 — Rapport PDF : production du fichier et partage

Statut : **en attente du porteur** (dépend du 038 : expo-print non validé) · Jalon : 3 · Zone sensible : **oui** (sortie de données de mineurs ; WebView ; copies en clair dans le cache) · Trivial : non

Dépend de : 033, 038, 039 · Fichiers touchés : `src/data/expoPrint.ts` et son test (nouveaux), `src/hooks/useReport.ts` et son test (nouveaux), `src/hooks/cacheCopies.ts` (`cache/Print/`), `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts` (faux expo-print), `src/config/licences.json` (régénéré) — 8 fichiers

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
- [ ] **À la main sur l'émulateur puis l'A55** : PDF A4 de 1 + N pages, accents justes, sauts de page avant chaque groupe ; `adb logcat` sans tentative de connexion pendant le rendu ; PDF ouvert sur l'ordinateur (critère de sortie).

## Tests attendus

- `src/data/expoPrint.test.ts` (faux module : chemins refusés, dossier vidé), `src/hooks/useReport.test.tsx` (cycle complet, échecs, verrou), `src/hooks/useStartupCleanup.test.tsx`.

## Hors périmètre

- Écran (041) ; impression directe sur une imprimante (`printAsync`, refusée par le 038).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible), après la réponse du porteur au 038.
- Décision automatique proposée : PDF copié sous un nom lisible avant le partage (expo-print le nomme `<uuid>.pdf`), le fichier d'origine effacé aussitôt.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (visible au 041).
- Architecture : `src/data/expoPrint.ts` (seul importeur d'expo-print), `src/hooks/useReport.ts` ; `clearCacheCopies` vide aussi `cache/Print/`.
