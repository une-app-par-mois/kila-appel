# 034 — Import CSV : enregistrement et parcours

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (écriture en base de données importées, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : 031, 032, 033 · Fichiers touchés : `src/data/memberImportRepo.ts` et son test (nouveaux), `src/hooks/useMemberImport.ts` et son test (nouveaux), `src/hooks/importSession.ts` (nouveau : aperçu gardé en mémoire entre les écrans) — 5 fichiers

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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Import CSV : les membres de l'aperçu sont ajoutés d'un bloc, avec leur téléphone d'urgence et leur groupe (F-07, EX-30).
- Architecture : `src/data/memberImportRepo.ts`, `src/hooks/useMemberImport.ts`, `src/hooks/importSession.ts`.
