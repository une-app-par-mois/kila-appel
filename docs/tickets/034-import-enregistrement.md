# 034 — Import CSV : enregistrement et parcours

Statut : en cours · Jalon : 3 · Zone sensible : **oui** (écriture en base de données importées, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : 031, 032, 033 · Fichiers touchés : `src/data/memberImportRepo.ts` et son test (nouveaux), `src/hooks/useMemberImport.ts` et son test (nouveaux), `src/hooks/importSession.ts` (nouveau : aperçu gardé en mémoire entre les écrans), `src/domain/memberImport.ts` (type `CsvRow` importé de `csvParse.ts` et réexporté, reporté du lot J3-1) — 6 fichiers au départ, 8 au plus avec deux fichiers de test séparés (séance de lancement du lot J3-2)

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

Relie les morceaux de l'import : choisir le fichier, le lire, le décoder et l'analyser (031), calculer l'aperçu (032), puis, seulement sur « Importer N membres », tout écrire d'un bloc. Les écrans viennent au 035.

## À lire

- Tickets 031, 032, 033 ; ticket 007 (création d'un membre et de son inscription), 007e (`startInSeason`), 008 (contacts)
- `docs/PRD.md` : EX-30, EX-03, EX-04, EX-05, NF-08 ; `docs/SECURITE.md` : SEC-05, SEC-06, SEC-10, SEC-12
- `docs/ARCHITECTURE.md` §4.1 (transactions : la base `tx` seulement dans une transaction)
- `src/data/membersRepo.ts` (`create`), `src/data/contactsRepo.ts`, `src/data/enrollmentsRepo.ts` (`expectEnrollable`), `src/hooks/useBackupExport.ts` et `src/hooks/useRestore.ts` (modèle verrou, copie du sélecteur, journal)

## Ce qui change

- `src/data/memberImportRepo.ts` :
  - `importContext(db)` : membres existants (nom, prénom, date de naissance, archivés compris) et groupes non archivés de la saison active, en deux requêtes (NF-08) ; appelé aussi avec `tx` dans la transaction de la confirmation.
  - `importMembers(...)` : **une seule transaction** ; recharge le contexte (`importContext(tx)`), relance `previewImport` sur les lignes gardées en mémoire avec la date du jour de la confirmation, et refuse tout (`IMPORT_STALE`, rien d'écrit) si le classement, un `memberId`, un `groupId` ou les doublons gardés ont changé. Puis, pour chaque membre : `members`, son contact (`emergency_contacts`, « Contact importé », position 0) et son inscription (`enrollments`, début `startInSeason(date du jour de la confirmation, saison active)`, fin vide) ; un échec annule tout. Requêtes paramétrées (SEC-05) ; `validateMember` et `validateContact` refaits avant l'écriture.
  - Doublon de source `app` laissé sur « Ignorer » et inscrit à un groupe du fichier : désarchivé d'abord s'il était archivé (une seule fois s'il revient sur plusieurs lignes), puis `expectEnrollable`, une inscription par groupe distinct ; « déjà inscrit » suit la règle de `enroll` (`notEnded`). Sans groupe trouvé (cellule vide, groupe introuvable, pas de saison active) : rien ne change pour lui (décision du porteur du 2026-11-28).
- `src/hooks/importSession.ts` : magasin du module (comme `fileLock`) qui garde les lignes lues, l'aperçu et `erasedCount()` entre les écrans, en mémoire seulement ; vidé à la fin du parcours, à l'abandon, au démontage de l'écran de choix, et si un Tout effacer est survenu depuis.
- `src/hooks/useMemberImport.ts` : `choose()` (verrou `'import'` ; sélecteur limité à 1 Mo ; lecture ; copie du sélecteur effacée **dès la lecture**, dans un `finally` ; décodage, analyse, aperçu) et `confirm(keptDuplicates)` (dans `fileLock.run('import', …)` : verrou pris, le hook rend `busy` et garde la session ; double appui sans effet ; écriture, `notifyDataChanged`, résultat `{ added, enrolled, duplicatesIgnored, invalid, duplicatesEnrolled, unarchived }` ; rien à écrire : ni transaction ni notification).
- Journal : codes seulement (`IMPORT_REJECTED_<raison>`, `IMPORT_WRITE_FAILED`, `IMPORT_STALE`, `IMPORT_DONE`), sans détail, jamais un nom ni un nombre de lignes lié à une personne (ABS-04) ; `error.message` n'est jamais journalisé ni rendu.

## Critères d'acceptation

- [x] EX-30 : rien n'est écrit avant `confirm` (base comparée avant et après `choose`).
- [x] EX-30 : après `confirm`, le fichier fictif donne 21 membres, leurs contacts et 18 inscriptions nouvelles, 2 doublons inscrits, et 1 désarchivé seulement s'il est inscrit ; « Voir les membres » les montre (`notifyDataChanged`).
- [x] Une erreur au 15e membre (contrainte forcée dans le test) : aucune ligne écrite, doublons désarchivés compris.
- [x] Une restauration entre l'aperçu et la confirmation : `IMPORT_STALE`, rien d'écrit.
- [x] SEC-10 : la copie du sélecteur est effacée après la lecture (par `readFileBytes`), en réussite, en refus et en erreur, le test vérifie que le dossier est vide ; l'aperçu est effacé à l'abandon.
- [x] Verrou : `choose` ne fait rien pendant une restauration, une purge ou Tout effacer.
- [x] NF-08 : 2 000 lignes importées en moins de 2 s sur `node:sqlite` (mesure indicative dans le test), 500 membres déjà présents.
- [x] SEC-12 : journal sans nom (test qui relit les codes journalisés).

## Tests attendus

- `src/data/memberImportRepo.test.ts` sur `node:sqlite` : transaction, cascades intactes, apostrophes et points-virgules dans les noms (SEC-05), saison sans groupe, groupe archivé entre l'aperçu et l'écriture (`IMPORT_STALE`), doublons inscrits et désarchivés (second fichier de test si le premier dépasse 300 lignes).
- `src/hooks/useMemberImport.test.tsx` : faux sélecteur et faux fichiers (033), verrou, effacement de la copie, abandon.

## Hors périmètre

- Écrans (035) ; annulation d'un import après coup (les membres se suppriment un par un, EX-03).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées :
  - Libellé du contact importé : « Contact importé » (le libellé est obligatoire, EX-05 ; modifiable ensuite sur la fiche).
  - Inscription au jour de l'import ramené dans la saison active (`startInSeason`, décision du porteur du 2026-11-26 pour EX-04).
  - Groupe archivé ou supprimé entre l'aperçu et la confirmation : import refusé en entier, message « Les groupes ont changé : recommencez l'import. », rien d'écrit.
  - Aperçu gardé en mémoire seulement (jamais écrit sur le disque) ; perdu si l'appli est fermée : on recommence.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28.
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

Reporté du lot J3-1 (2026-11-28) :

- Unifier le type `CsvRow` : `src/domain/memberImport.ts` importe celui de `src/domain/csvParse.ts` (`{ line: number; cells: string[] }`, déjà exporté) au lieu de le déclarer (fichier ajouté à la liste).
- `parseCsv` n'est appelé qu'après `decodeCsv`, qui borne la taille à 1 Mo ; le nombre de cellules par ligne n'est pas borné (jusqu'à environ 500 000 dans 1 Mo) : rester linéaire en nombre de cellules.
- Verrou : `pick` (`expoImportPicker(os, MAX_CSV_BYTES)`) et `readFileBytes(path, MAX_CSV_BYTES)` dans un même `fileLock.run('import', …)`, rendu avant l'aperçu ; repris par `fileLock.run('import', …)` pendant l'écriture.
- Si une restauration ou Tout effacer a eu lieu entre l'aperçu et la confirmation, revérifier les doublons (et les groupes) à la confirmation avant d'écrire.
- Ne jamais afficher ni journaliser `error.message` (une erreur native peut citer le nom du fichier, ABS-04) : codes seulement.
- **Décision du porteur du 2026-11-28** : un doublon de source `app` laissé sur « Ignorer » est inscrit au groupe du CSV (`member.groupId`) s'il ne l'est pas déjà, et désarchivé s'il était archivé (`memberId`, `archived`), dans la même transaction que l'import, sans réécrire ni nom, ni date de naissance, ni contact. Le résultat le compte (critère d'acceptation et test à ajouter).
- Fichiers : `src/domain/memberImport.ts` en plus (6 fichiers) ; probablement un second fichier de test du dépôt pour les doublons inscrits et désarchivés si `memberImportRepo.test.ts` dépasse 300 lignes (7). Le ticket reste sous 10 fichiers ; risque de dépassement faible, à surveiller si le verrou ou l'inscription demandent de toucher `membersRepo.ts` ou `enrollmentsRepo.ts` (sinon les requêtes restent dans `memberImportRepo.ts`).

Séance de lancement du lot J3-2 (2026-11-28), réponses du porteur :

- **Doublon archivé** : un doublon ignoré de source `app` et archivé n'est désarchivé **que s'il est inscrit à un groupe pendant cet import**. Sans groupe trouvé (cellule vide, groupe introuvable, pas de saison active), on ne touche à rien. Texte de la maquette (aperçu de l'import, section des doublons) précisé en conséquence : « … sera inscrit au groupe du fichier, et désarchivé s'il était archivé. Sans groupe trouvé, il reste tel quel. » (`scripts/maquettes.mjs`, `design/maquettes/index.html` régénéré).

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Confirmation : `importContext(tx)` rechargé dans la transaction, `previewImport` relancé sur les lignes gardées en mémoire avec la date du jour de la confirmation ; classement, `memberId`, `groupId` ou doublons gardés changés : tout refusé, rien d'écrit, code `IMPORT_STALE`, texte « Les membres ou les groupes ont changé : recommencez l'import. » (remplace l'ancien texte limité aux groupes).
- Session : `importSession` garde les lignes lues, l'aperçu et `erasedCount()` ; un Tout effacer survenu depuis vide la session ; rien sur le disque.
- Inscription : « déjà inscrit » suit la règle de `enroll` (`notEnded`) ; doublon désarchivé d'abord, puis `expectEnrollable` ; même membre existant sur plusieurs lignes : un seul désarchivage, une inscription par groupe distinct ; début `startInSeason(date du jour de la confirmation, saison active)`.
- Résultat : `{ added, enrolled, duplicatesIgnored, invalid, duplicatesEnrolled, unarchived }` ; fichier de la maquette : 21 membres, 18 inscriptions nouvelles, 2 doublons inscrits, 1 désarchivé seulement s'il est inscrit.
- Lecture : `importContext` en deux requêtes ; `memberImport.ts` importe et réexporte `CsvRow` de `csvParse.ts`.
- Verrou : confirmation dans `fileLock.run('import', …)` ; verrou pris : le hook rend `busy` et garde la session ; double appui sans effet.
- Rien à écrire : ni transaction ni notification.
- Journal : `IMPORT_REJECTED_<raison>`, `IMPORT_WRITE_FAILED`, `IMPORT_STALE`, `IMPORT_DONE`, sans détail ; `error.message` jamais journalisé ni rendu.
- Copie du sélecteur : déjà effacée par `readFileBytes` ; le test vérifie que le dossier est vide.
- Revalidation : `validateMember` et `validateContact` (« Contact importé », position 0) avant l'écriture.
- Tests à prévoir : 15ᵉ membre en échec, aucune ligne écrite (doublons désarchivés compris) ; restauration entre l'aperçu et la confirmation, `IMPORT_STALE`, rien d'écrit.
- Fichiers : 6 au départ, 8 au plus avec deux fichiers de test séparés.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Doublon ignoré de source `app`, archivé, déjà inscrit (inscription pas finie) au groupe du fichier | Reste archivé, rien d'inscrit ; désarchivé quand même | Reste archivé, rien d'inscrit, non compté | Lecture stricte de la décision du porteur : désarchivé seulement s'il est inscrit pendant cet import ; ajustement d'une décision du porteur, facile à défaire | en attente du porteur |
| Comparaison de l'aperçu à la confirmation | Classement et identifiants seulement ; aperçu entier | Aperçu recalculé comparé en entier (sérialisation), drapeau `archived` compris : un doublon désarchivé entre-temps donne `IMPORT_STALE` | Mêmes lignes et même code : un aperçu identique se sérialise à l'identique ; critère complet et simple, au prix de refus prudents | à relire |
| Code de journal d'une lecture impossible (sélecteur, lecture native, base) | Nouveau code ; `IMPORT_WRITE_FAILED` | `IMPORT_READ_FAILED`, sans détail ; `IMPORT_CANCELLED` non journalisé | La liste de la fiche ne couvrait pas la lecture ; même modèle que `RESTORE_PICK_FAILED` | à relire |
| Copies du sélecteur restées d'un arrêt brutal | Laissées au nettoyage du démarrage ; vidées avant le sélecteur | Vidées sous le verrou `'import'` avant le sélecteur (`clearPicked`), échec : `IMPORT_COPY_CLEAR_FAILED` | Même modèle que la restauration (SEC-10) | à relire |
| Place du libellé « Contact importé » | `src/config/libelles/` ; constante du dépôt | `IMPORTED_CONTACT_LABEL` dans `memberImportRepo.ts` | Donnée enregistrée en base, pas un texte d'écran ; aucun fichier hors de la liste touché | à relire |
| Session après une écriture en échec | Vidée ; gardée | Gardée (rien n'a été écrit, l'encadrant peut réessayer) ; vidée après une réussite ou `IMPORT_STALE` | Pas de perte de l'aperçu sur une erreur passagère | à relire |
| Tout effacer survenu depuis l'aperçu | Écriture ; refus | `erasedCount()` noté avant la lecture du contexte de l'aperçu ; session périmée vidée, `confirm` rend `stale` et journalise `IMPORT_STALE`, rien d'écrit | Décision de la pré-analyse appliquée ; aucune écriture sur des données remplacées | à relire |
| Forme du hook | Deux hooks ; un hook avec option | `useMemberImport(os = Platform.OS, { owner })` : `owner` (écran de choix) vide la session au démontage ; états `idle`, `reading`, `ready`, `rejected`, `failed`, `busy`, `writing`, `stale`, `done` ; `preview` lu dans la session partagée ; `abandon()` | Le même hook sert aux deux écrans du 035 ; `os` passé comme `readFileBytes` pour les tests | à relire |
| Notification après l'import | Toujours ; seulement si quelque chose est écrit | Seulement si `added > 0` ou `duplicatesEnrolled > 0` | « Rien à écrire : ni transaction ni notification » étendu au cas où tous les doublons sont déjà inscrits | à relire |
| Compte `duplicatesEnrolled` | Membres ; inscriptions | Membres inscrits au moins une fois | « 2 doublons inscrits » de la maquette compte des membres | à relire |
| Dates de la saison pour `startInSeason` | Troisième requête ; dans la requête des groupes | `importContext` lit la saison active avec ses groupes (`LEFT JOIN`) : saison connue même sans groupe, toujours deux requêtes | NF-08, deux requêtes | à relire |
| 8e fichier | Test de `importSession` à part ; base fictive partagée | `src/__fixtures__/importDb.ts` (base fictive de la maquette et aperçu calculé sur la base), partagé par les trois fichiers de test ; `importSession` testé dans `useMemberImport.test.tsx` ; 8 fichiers | Pas de duplication de la base fictive ; plafond de 8 fichiers respecté | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Import CSV : les membres de l'aperçu sont ajoutés d'un bloc, avec leur téléphone d'urgence et leur groupe (F-07, EX-30).
- Architecture : `src/data/memberImportRepo.ts` (`importContext`, `importMembers` : une transaction, aperçu recalculé avec `tx`, `IMPORT_STALE`), `src/hooks/useMemberImport.ts` (verrou `'import'` autour du sélecteur et de la lecture, puis de l'écriture), `src/hooks/importSession.ts` (lignes et aperçu en mémoire, périmés après Tout effacer).
- `docs/DECISIONS.md` : les lignes de la section « Décisions » ci-dessus (date 2026-11-28, ticket 034).
- Codes de journal ajoutés : `IMPORT_READ_FAILED`, `IMPORT_STALE`, `IMPORT_WRITE_FAILED`, `IMPORT_DONE`, `IMPORT_REJECTED_<raison>` (SEC-12).
