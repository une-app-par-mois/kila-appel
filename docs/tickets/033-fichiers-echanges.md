# 033 — Fichiers des échanges : adaptateur, verrou et nettoyage

Statut : fusionné dans le groupe (PR #95) · Jalon : 3 · Zone sensible : **oui** (fichiers en clair de données de mineurs dans le cache ; SEC-10 étendu aux échanges) · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/data/expoFiles.ts`, `src/data/expoFiles.test.ts`, `src/hooks/fileLock.ts`, `src/hooks/fileLock.test.ts`, `src/hooks/cacheCopies.ts`, `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts`, `src/appTests/eraseAll.test.tsx` (test seulement : `exports` dans les dossiers vidés après Tout effacer) — 8 fichiers ; si `expoFiles.ts` dépasse 300 lignes : un seul nouveau fichier de `src/data/` et `src/staticChecksFiles.test.ts` (`FILE_MODULE_OWNERS`), autorisé d'avance par le porteur le 2026-11-28

Fichiers réellement touchés (après la revue du 2026-11-28) : 12 fichiers et cette fiche.
- Liste validée : `src/data/expoFiles.ts`, `src/hooks/fileLock.ts`, `src/hooks/fileLock.test.ts`, `src/hooks/cacheCopies.ts`, `src/hooks/useStartupCleanup.test.tsx`, `src/__fixtures__/expoModules.ts`, `src/appTests/eraseAll.test.tsx` (`src/data/expoFiles.test.ts` n'a pas eu à changer).
- Découpage autorisé d'avance : `src/data/expoExports.ts` (nouveau) et `src/staticChecksFiles.test.ts` (`FILE_MODULE_OWNERS` seulement).
- **Hors de la liste validée, soumis au porteur à la relecture** : `src/data/expoFilesExchange.test.ts` et `src/data/expoExports.test.ts` (nouveaux fichiers de test), `src/hooks/useStartupCleanup.ts` (commentaire d'en-tête seulement : `exports/`).

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

L'import (034), l'export CSV (037) et le rapport PDF (040) lisent, écrivent et partagent des fichiers. `src/data/expoFiles.ts` est le seul fichier qui importe expo-file-system, expo-sharing et expo-document-picker (`src/staticChecksFiles.test.ts`) : ce ticket y ajoute, en une fois, ce dont les trois ont besoin, pour qu'aucun autre ticket du jalon ne le touche (lots sans conflit). Aucune dépendance nouvelle.

## À lire

- Tickets 014b, 014e, 014g, 014c, 015f (verrou commun, dossiers dédiés, vidage au démarrage et après Tout effacer)
- `docs/SECURITE.md` : SEC-06, SEC-09, SEC-10, SEC-12 ; `docs/ARCHITECTURE.md` §4.3 et lignes des tickets 014b, 014e
- `src/data/expoFiles.ts` (199 lignes), `src/hooks/fileLock.ts`, `src/hooks/cacheCopies.ts`, `src/staticChecksFiles.test.ts`

## Ce qui change

- `expoPicker(os, maxBytes = MAX_BACKUP_BYTES)` : limite passée par l'appelant (`MAX_CSV_BYTES` du 031 pour l'import, SEC-06) ; restauration inchangée.
- `readFileBytes(path, maxBytes)` (limite en paramètre, sans valeur par défaut) : seulement un enfant direct d'un dossier du sélecteur ; taille réelle vérifiée **avant** la lecture (la taille annoncée par le sélecteur peut manquer), lecture bornée à `maxBytes + 1` ; refus `TOO_LARGE` ; la copie du sélecteur est effacée par la lecture elle-même, en réussite comme en refus. Codes de journal par usage (`IMPORT_PICK_PATH_REFUSED`, `IMPORT_REJECTED_TOO_LARGE`), ceux de la restauration inchangés.
- Dossier dédié `cache/exports/` (`expoStorage('exports')`), un sous-dossier neuf par fichier, comme les sauvegardes, vidé au début de chaque export sous verrou ; sous-dossier effacé à la fermeture de la feuille de partage. `writeFile` (texte ou octets) limité à `<cache/exports>/<sous-dossier>/<nom>`, nom `^[a-z0-9-]+\.(csv|pdf)$`, erreur sans chemin.
- `shareFile(path, 'csv' | 'pdf')`, liste fermée de types : `text/csv` et `public.comma-separated-values-text`, `application/pdf` et `com.adobe.pdf` ; `shareBackup` inchangé.
- `fileLock` : tâches `'import'`, `'csv'` et `'report'` ; jamais pendant une restauration, une purge, Tout effacer ou le nettoyage du démarrage. `'import'` tenu du sélecteur à la fin de la lecture, jamais pendant l'aperçu (le 034 le reprendra pendant l'écriture) ; `'csv'` et `'report'` tenus de l'écriture à la fermeture de la feuille de partage. `useReminderTap.ts` inchangé.
- `clearCacheCopies` : vide aussi `cache/exports/` (au démarrage, après Tout effacer), quatre dossiers dans le même `Promise.allSettled` ; la copie du sélecteur de l'import est déjà couverte (`DocumentPicker/`, Inbox iOS).
- `expoFiles.ts` reste sous 300 lignes ; s'il les dépasse, il est découpé en un seul nouveau fichier de `src/data/`, ajouté à `FILE_MODULE_OWNERS` (`src/staticChecksFiles.test.ts`), la liste restant fermée (autorisé par le porteur le 2026-11-28, à relire avant la fusion).

## Critères d'acceptation

- [ ] SEC-06 : un fichier de 1 Mo + 1 octet est refusé par le sélecteur (taille annoncée) et par `readFileBytes` (taille réelle) ; la copie du sélecteur est alors effacée.
- [ ] SEC-10 : `cache/exports/` vidé au démarrage et après Tout effacer ; un sous-dossier ne s'efface que s'il est un enfant direct du dossier dédié.
- [ ] Verrou : un import ne démarre pas pendant une restauration, et inversement ; un export CSV ne démarre pas pendant une purge.
- [ ] Contrôles statiques inchangés et verts (`src/staticChecksFiles.test.ts`, SEC-01) : aucune fonction réseau d'expo-file-system ni d'expo-sharing.
- [ ] Sauvegarde et restauration inchangées (tests existants verts).

## Tests attendus

- `src/data/expoFiles.test.ts` (faux modules de `src/__fixtures__/expoModules.ts`) : limites, chemins refusés, types de partage.
- `src/hooks/fileLock.test.ts`, `src/hooks/useStartupCleanup.test.tsx` : nouvelles tâches, dossier vidé.
- `src/appTests/eraseAll.test.tsx` : `exports` dans les dossiers vidés après Tout effacer.
- Non vérifié sur appareil, à noter dans la PR : `File.size` d'une copie absente, BOM conservé par `File.write(string)`, `text/csv` accepté par Drive et Gmail.

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

Séance de lancement du lot J3-1 (2026-11-28), réponses du porteur :

- **`src/appTests/eraseAll.test.tsx` ajouté** au ticket : 8 fichiers, test seulement (`exports` dans la liste des dossiers vidés après Tout effacer).
- **Découpage de `expoFiles.ts` autorisé d'avance** (SEC-03) : s'il dépasse 300 lignes, un seul nouveau fichier de `src/data/` est ajouté à `FILE_MODULE_OWNERS` dans `src/staticChecksFiles.test.ts` ; la liste reste fermée ; à relire par le porteur avant la fusion du 033.

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Limite de lecture reçue en paramètre (`MAX_CSV_BYTES` du 031), sans valeur par défaut.
- Verrou `'import'` tenu du sélecteur à la fin de la lecture, jamais pendant l'aperçu (le 034 le reprendra pendant l'écriture) ; `'csv'` et `'report'` tenus de l'écriture à la fermeture de la feuille de partage ; `useReminderTap.ts` inchangé.
- `readFileBytes` : enfant direct d'un dossier du sélecteur, taille réelle, lecture bornée à `maxBytes + 1`, `TOO_LARGE` ; copie du sélecteur effacée par la lecture elle-même, en réussite comme en refus.
- Codes de journal par usage (`IMPORT_PICK_PATH_REFUSED`, `IMPORT_REJECTED_TOO_LARGE`), ceux de la restauration inchangés.
- `writeFile` limité à `<cache/exports>/<sous-dossier>/<nom>`, nom `^[a-z0-9-]+\.(csv|pdf)$`, erreur sans chemin ; texte ou octets.
- `shareFile(path, 'csv' | 'pdf')`, liste fermée de types.
- `cache/exports/` vidé au début de chaque export sous verrou ; sous-dossier effacé à la fermeture du partage.
- `clearCacheCopies` : quatre dossiers dans le même `Promise.allSettled`.
- Non vérifié sur appareil : `File.size` d'une copie absente, BOM conservé par `File.write(string)`, `text/csv` accepté par Drive et Gmail.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Codes de journal selon l'usage du sélecteur | Paramètre d'usage libre ; fabrique séparée | `expoPicker(os)` inchangé pour la restauration ; `expoImportPicker(os, maxBytes)`, sans valeur par défaut, fixe les codes `IMPORT_…` | Un appel ne peut plus mélanger la limite d'un usage et les codes de l'autre (revue) | changée après contradiction |
| Dossier du sélecteur pour `readFileBytes` | `Platform.OS` seul ; paramètre | `readFileBytes(path, maxBytes, os = Platform.OS)` | Même contrôle de chemin que `expoPicker(os)`, testable pour iOS | à relire |
| Verrou rendu après une erreur | Laisser chaque appelant faire `acquire`/`release` ; aide commune | `fileLock.run(task, work)` : rien n'est lancé si le verrou est pris, rendu dans un `finally`, erreur remontée ; `acquire`/`release` inchangés | 034, 037 et 040 ne peuvent pas oublier de rendre le verrou | à relire |
| Erreurs du module natif à la lecture, à l'écriture et au partage | Telles quelles ; remplacées | Remplacées par « Lecture du fichier impossible », « Écriture du fichier impossible », « Partage du fichier impossible » (partage ajouté après la revue) | Elles peuvent citer le chemin, donc le nom du fichier choisi (ABS-04) | à relire |
| Effacement de la copie du sélecteur en échec (M1, revue de sécurité) | Erreur native remontée ; code seul | Jamais d'erreur : code seul `IMPORT_COPY_CLEAR_FAILED` ou `RESTORE_COPY_CLEAR_FAILED`, copie reprise par le nettoyage du démarrage ; le résultat de `readFileBytes` et l'erreur « Chemin de fichier refusé » ne sont plus masqués ; idem dans `pick` (restauration comprise) | ABS-04 : l'erreur native peut citer le nom du fichier | changée après contradiction |
| `writeFile` : `write()` en échec après `create()` | Fichier laissé ; effacé | Effacé dans un `try` silencieux, puis « Écriture du fichier impossible » | Aucun fichier partiel laissé (SEC-10) | changée après contradiction |
| `writeFile` sur un fichier existant | Écraser ; refuser | Refuser (`create()` puis `write()`) | Le sous-dossier est neuf : un second fichier du même nom est une erreur d'appel | à relire |
| `shareFile` : contrôle du chemin | Type seul ; type et chemin | Même contrôle que `writeFile` (`<cache/exports>/<sous-dossier>/<nom>`), extension égale au type partagé | Aucun fichier hors de `exports/` partagé par cette fonction | à relire |
| Tests des échanges | Dans `expoFiles.test.ts` ; fichiers à part | `src/data/expoFilesExchange.test.ts` (sélecteur de l'import, `readFileBytes`) et `src/data/expoExports.test.ts` (exports) : nouveaux fichiers de test hors de la liste validée, soumis au porteur à la relecture | `expoFiles.test.ts` aurait dépassé 300 lignes | à relire |
| Découpage de `expoFiles.ts` | Resserrer ; découper (autorisé d'avance) | Découpé après la revue : `writeFile`, `shareFile` et les types de partage dans `src/data/expoExports.ts`, seul fichier ajouté à `FILE_MODULE_OWNERS` (liste fermée, rien d'autre de touché dans les contrôles statiques) ; `expoFiles.ts` exporte `checkChild` et `refused`, fonctions pures sans accès natif | Les corrections de la revue dépassaient 300 lignes ; décision du porteur du 2026-11-28, à relire avant la fusion | changée après contradiction |
| Faux sélecteur | — | `fakeDocumentPicker` prend un nom de fichier (`choisi.db` par défaut) ; `FakeFile` gagne `create` et `write` | Copie `.csv` pour l'import ; écriture des exports | à relire |

## Questions pour le porteur

- **Décision du porteur du 2026-11-28** : fusionné dans le groupe après sa relecture (PR #95).

## À reporter

- CHANGELOG : rien (aucun changement visible).
- Architecture : `expoFiles.ts` : `readFileBytes(path, maxBytes, os)`, `expoImportPicker(os, maxBytes)`, dossier `cache/exports/` ; `expoExports.ts` (nouveau, second fichier admis à importer les modules de fichiers) : `writeFile`, `shareFile(path, 'csv' | 'pdf')` ; `fileLock` : tâches `'import'`, `'csv'`, `'report'` et `fileLock.run(task, work)` (verrou rendu même après une erreur) ; `clearCacheCopies` vide `exports/`.
- SECURITE : SEC-10, les copies des échanges (`exports/`) sont vidées comme celles de la sauvegarde.
- Non vérifié sur appareil : `File.size` d'une copie absente (0 selon la doc), BOM conservé par `File.write(string)`, `File.create()` puis `write()` dans un sous-dossier neuf, `text/csv` accepté par Drive et Gmail, UTI `public.comma-separated-values-text` et `com.adobe.pdf` sur iOS.
- Pour le 034 : tenir le verrou `'import'` autour de `pick` et de `readFileBytes` avec `fileLock.run` ; revérifier les doublons à la confirmation si une restauration ou Tout effacer a eu lieu depuis l'aperçu ; ne jamais afficher ni journaliser `error.message`.
- Pour le 037 et le 040 : vérifier sur l'A55 qu'un envoi différé vers Drive lit bien le fichier avant l'effacement du sous-dossier à la fermeture du partage.
