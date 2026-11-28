# 033 — Fichiers des échanges : adaptateur, verrou et nettoyage

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (fichiers en clair de données de mineurs dans le cache ; SEC-10 étendu aux échanges) · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/data/expoFiles.ts`, `src/data/expoFiles.test.ts`, `src/hooks/fileLock.ts`, `src/hooks/fileLock.test.ts`, `src/hooks/cacheCopies.ts`, `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts` — 7 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

L'import (034), l'export CSV (037) et le rapport PDF (040) lisent, écrivent et partagent des fichiers. `src/data/expoFiles.ts` est le seul fichier qui importe expo-file-system, expo-sharing et expo-document-picker (`src/staticChecksFiles.test.ts`) : ce ticket y ajoute, en une fois, ce dont les trois ont besoin, pour qu'aucun autre ticket du jalon ne le touche (lots sans conflit). Aucune dépendance nouvelle.

## À lire

- Tickets 014b, 014e, 014g, 014c, 015f (verrou commun, dossiers dédiés, vidage au démarrage et après Tout effacer)
- `docs/SECURITE.md` : SEC-06, SEC-09, SEC-10, SEC-12 ; `docs/ARCHITECTURE.md` §4.3 et lignes des tickets 014b, 014e
- `src/data/expoFiles.ts` (199 lignes), `src/hooks/fileLock.ts`, `src/hooks/cacheCopies.ts`, `src/staticChecksFiles.test.ts`

## Ce qui change

- `expoPicker(os, maxBytes = MAX_BACKUP_BYTES)` : limite passée par l'appelant (1 Mo pour l'import, SEC-06) ; restauration inchangée.
- `readFileBytes(path, maxBytes)` : taille réelle vérifiée **avant** la lecture (la taille annoncée par le sélecteur peut manquer) ; refus `TOO_LARGE`.
- Dossier dédié `cache/exports/` (`expoStorage('exports')`), un sous-dossier neuf par fichier, comme les sauvegardes ; `writeFile(path, bytes | text)`.
- `shareFile(path, { mimeType, uti })` : `text/csv` et `public.comma-separated-values-text`, `application/pdf` et `com.adobe.pdf` ; `shareBackup` inchangé.
- `fileLock` : tâches `'import'`, `'csv'` et `'report'` ; jamais pendant une restauration, une purge, Tout effacer ou le nettoyage du démarrage.
- `clearCacheCopies` : vide aussi `cache/exports/` (au démarrage, après Tout effacer) ; la copie du sélecteur de l'import est déjà couverte (`DocumentPicker/`, Inbox iOS).
- `expoFiles.ts` reste sous 300 lignes ; s'il les dépasse, voir la question prévue.

## Critères d'acceptation

- [ ] SEC-06 : un fichier de 1 Mo + 1 octet est refusé par le sélecteur (taille annoncée) et par `readFileBytes` (taille réelle) ; la copie du sélecteur est alors effacée.
- [ ] SEC-10 : `cache/exports/` vidé au démarrage et après Tout effacer ; un sous-dossier ne s'efface que s'il est un enfant direct du dossier dédié.
- [ ] Verrou : un import ne démarre pas pendant une restauration, et inversement ; un export CSV ne démarre pas pendant une purge.
- [ ] Contrôles statiques inchangés et verts (`src/staticChecksFiles.test.ts`, SEC-01) : aucune fonction réseau d'expo-file-system ni d'expo-sharing.
- [ ] Sauvegarde et restauration inchangées (tests existants verts).

## Tests attendus

- `src/data/expoFiles.test.ts` (faux modules de `src/__fixtures__/expoModules.ts`) : limites, chemins refusés, types de partage.
- `src/hooks/fileLock.test.ts`, `src/hooks/useStartupCleanup.test.tsx` : nouvelles tâches, dossier vidé.

## Hors périmètre

- Contenu des fichiers (031, 036, 039) ; écrans ; dossier `cache/Print/` d'expo-print (040, après la décision du 038).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées :
  - **Un seul adaptateur** (`expoFiles.ts`) plutôt qu'un second fichier admis par le contrôle statique : le contrôle reste tel quel. Si le fichier dépasse 300 lignes, le découpage qui ajouterait un fichier à la liste du contrôle est posé au porteur (affaiblissement possible d'un contrôle).
  - Sélecteur ouvert sur tous les types (`*/*`), le contenu étant validé ensuite (031) : un CSV venu de Drive ou de Gmail arrive souvent avec un type inattendu (`application/vnd.ms-excel`, `text/plain`).
  - Un dossier `exports/` commun au CSV et au PDF.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28 ; ticket du premier lot du jalon (031, 032, 033).
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (aucun changement visible).
- Architecture : `expoFiles.ts` : `readFileBytes`, `writeFile`, `shareFile`, dossier `cache/exports/` ; `fileLock` : tâches `'import'`, `'csv'`, `'report'` ; `clearCacheCopies` vide `exports/`.
- SECURITE : SEC-10, les copies des échanges (`exports/`) sont vidées comme celles de la sauvegarde.
