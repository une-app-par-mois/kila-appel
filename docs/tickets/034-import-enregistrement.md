# 034 — Import CSV : enregistrement et parcours

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (écriture en base de données importées, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : 031, 032, 033 · Fichiers touchés : `src/data/memberImportRepo.ts` et son test (nouveaux), `src/hooks/useMemberImport.ts` et son test (nouveaux), `src/hooks/importSession.ts` (nouveau : aperçu gardé en mémoire entre les écrans), `src/domain/memberImport.ts` (type `CsvRow` unifié, reporté du lot J3-1) — 6 fichiers (7 si un second fichier de test du dépôt est nécessaire)

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
  - `importContext(today)` : membres existants (nom, prénom, date de naissance, archivés compris) et groupes non archivés de la saison active, en deux requêtes (NF-08).
  - `importMembers(list, today)` : **une seule transaction** ; pour chaque membre : `members`, son contact (`emergency_contacts`, libellé fixe, position 0) et son inscription (`enrollments`, début `startInSeason(today, saison)`, fin vide) ; un échec annule tout. Requêtes paramétrées (SEC-05) ; validation du domaine refaite avant l'écriture.
- `src/hooks/importSession.ts` : magasin du module (comme `fileLock`) qui garde l'aperçu entre les écrans ; vidé à la fin du parcours, à l'abandon et au démontage de l'écran de choix.
- `src/hooks/useMemberImport.ts` : `choose()` (verrou `'import'` ; sélecteur limité à 1 Mo ; lecture ; copie du sélecteur effacée **dès la lecture**, dans un `finally` ; décodage, analyse, aperçu) et `confirm(keptDuplicates)` (écriture, `notifyDataChanged`, résultat : ajoutés, inscrits, doublons ignorés, invalides).
- Journal : codes seulement (`IMPORT_REJECTED_<raison>`, `IMPORT_WRITE_FAILED`, `IMPORT_DONE`), jamais un nom ni un nombre de lignes lié à une personne (ABS-04).

## Critères d'acceptation

- [ ] EX-30 : rien n'est écrit avant `confirm` (base comparée avant et après `choose`).
- [ ] EX-30 : après `confirm`, le fichier fictif donne 21 membres, leurs contacts et 18 inscriptions ; « Voir les membres » les montre (`notifyDataChanged`).
- [ ] Une erreur au 15e membre (contrainte forcée dans le test) : aucun membre écrit.
- [ ] SEC-10 : la copie du sélecteur est effacée après la lecture, en réussite, en refus et en erreur ; l'aperçu est effacé à l'abandon.
- [ ] Verrou : `choose` ne fait rien pendant une restauration, une purge ou Tout effacer.
- [ ] NF-08 : 2 000 lignes importées en moins de 2 s sur `node:sqlite` (mesure indicative dans le test), 500 membres déjà présents.
- [ ] SEC-12 : journal sans nom (test qui relit les codes journalisés).

## Tests attendus

- `src/data/memberImportRepo.test.ts` sur `node:sqlite` : transaction, cascades intactes, apostrophes et points-virgules dans les noms (SEC-05), saison sans groupe, groupe archivé entre l'aperçu et l'écriture (refus propre).
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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Import CSV : les membres de l'aperçu sont ajoutés d'un bloc, avec leur téléphone d'urgence et leur groupe (F-07, EX-30).
- Architecture : `src/data/memberImportRepo.ts`, `src/hooks/useMemberImport.ts`, `src/hooks/importSession.ts`.
