# 032 — Import CSV : règles de l'import et aperçu

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (import CSV : données de mineurs qui entrent dans la base, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun (reçoit des lignes `string[][]` : le format de sortie du 031 est fixé dans ce ticket et le 031) · Fichiers touchés : `src/domain/memberImport.ts` et son test (nouveaux), `src/domain/importFields.ts` et son test (nouveaux : dates, téléphone, longueurs), `src/__fixtures__/importRows.ts` (nouveau), `src/domain/validation.ts` et son test (limite de nom et prénom, décision du porteur du 2026-11-28), `src/config/libelles/commun.ts` (messages des deux nouveaux codes) — 8 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

EX-30 : nom et prénom obligatoires ; date de naissance, téléphone d'urgence et groupe facultatifs ; toute autre colonne ignorée ; aperçu avant toute écriture ; lignes invalides signalées ; doublons (nom, prénom, date de naissance) repérés, avec le choix de les ignorer. Ce ticket calcule l'aperçu à partir des lignes lues (031), des membres et des groupes existants, passés en paramètres. Domaine pur ; l'écriture vient au 034.

## À lire

- `docs/PRD.md` : EX-30, EX-03, EX-04, EX-05, RM-04 ; `docs/CADRAGE.md` : « Données manipulées » (ABS-03 : aucun autre champ), glossaire (membre, inscription, contact d'urgence, archiver)
- `docs/SECURITE.md` : SEC-06 (chaque champ validé avant toute écriture), SEC-12
- `design/maquettes/` : « Import CSV : choisir le fichier » (colonnes `nom`, `prenom`, `date_naissance`, `telephone`, `groupe`), « Import CSV : aperçu », « Import CSV : fichier illisible »
- `src/domain/validation.ts` (`validateMember`, `validateContact`), `src/domain/phone.ts` (`parsePhone`), `src/domain/formats.ts` (`parseDisplayDate`, `foldText`, `startInSeason`)

## Ce qui change

- `src/domain/importFields.ts` : lecture d'une cellule.
  - Date : `JJ/MM/AAAA`, `J/M/AAAA` ou `AAAA-MM-JJ` → `AAAA-MM-JJ` (RM-04, 1900 à 2100) ; année à deux chiffres refusée ; date future refusée.
  - Téléphone : `parsePhone`, plus 9 chiffres commençant par 1 à 9 → `0` remis devant (Excel retire le zéro d'un numéro).
  - Espaces autour retirés.
- `src/domain/validation.ts` : `validateMember` refuse un nom ou un prénom de plus de 100 caractères (`NAME_TOO_LONG`) ou qui contient un caractère de contrôle U+0000 à U+001F ou U+007F (`NAME_INVALID_CHAR`) ; messages dans `src/config/libelles/commun.ts`. Seuls nom et prénom d'un membre : saisons, groupes et libellés de contact inchangés. L'import et la saisie (032b) passent par la même règle.
- `src/domain/memberImport.ts` : `previewImport(rows, { existingMembers, groups, today })`.
  - En-têtes comparés sans casse, accents, espaces, `_` ni `-` : `nom`, `prenom`, `date_naissance` (aussi « date de naissance », « naissance »), `telephone` (aussi « tel », « téléphone d'urgence »), `groupe`. Toute autre colonne ignorée ; colonne en double : la première.
  - Sans `nom` ou sans `prenom` : refus `MISSING_COLUMNS` (« Fichier non reconnu »).
  - Chaque ligne : valide, **invalide** (motif : nom manquant, prénom manquant, trop long, date invalide, téléphone invalide), ou **doublon**.
  - Doublon : nom et prénom égaux après `foldText`, et date de naissance égale ou absente d'un côté ; contre les membres de l'appli (archivés compris) et contre une ligne précédente du fichier.
  - Groupe : groupe non archivé de la saison active dont le nom est égal après `foldText` ; introuvable ou sans saison active : membre importé sans groupe, ligne signalée (question prévue).
  - Rendu : compteurs (lignes, à importer, invalides, doublons), listes pour l'écran, et la liste à écrire selon les doublons que l'encadrant garde (`ignored` par défaut).
- Aucune valeur d'une cellule dans une erreur levée ou un code (ABS-04).

## Critères d'acceptation

- [ ] EX-30 : le fichier fictif de la maquette (24 lignes) donne « 21 à importer, 1 invalide (ligne 17 : prénom manquant), 2 doublons » ; colonnes inconnues ignorées.
- [ ] EX-30 : doublon avec date (« Léo Garcia, 14/03/2017 ») et sans date (« Zoé Blanc ») ; « ZOÉ blanc » est un doublon de « Zoé Blanc » ; doublon interne au fichier ; un doublon gardé est importé.
- [ ] EX-03, RM-04, SEC-06 : dates des trois formes ; « 31/02/2016 », « 02/05/16 » et une date future refusées ; téléphone à 9 chiffres complété, « 6,00E+08 » refusé ; 101 caractères refusés.
- [ ] SEC-06, EX-03 : `validateMember` refuse 101 caractères et une tabulation dans un nom (décision du porteur du 2026-11-28) ; 100 caractères acceptés.
- [ ] EX-04 : groupe trouvé sans casse ni accents ; groupe archivé ou d'une autre saison non trouvé.
- [ ] ABS-03 : la liste à écrire ne contient que nom, prénom, date de naissance, téléphone et groupe.

## Tests attendus

- `src/domain/importFields.test.ts`, `src/domain/memberImport.test.ts` (tests nommés `EX-30`, `SEC-06`), sur les lignes de `src/__fixtures__/importRows.ts`.

## Hors périmètre

- Lecture des octets (031) ; requêtes et écriture (034) ; écrans (035) ; création d'un groupe absent.

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- **Réservée (SEC-06, valeur à fixer)** : longueur maximale de nom et prénom (100 recommandé) et refus des caractères de contrôle.
- **Réservée (écart de maquette)** : groupe introuvable : section « Groupe introuvable » dans l'aperçu (recommandé), rien que la phrase du résultat, ou création du groupe.
- Décisions automatiques proposées :
  - Ligne avec une date ou un téléphone invalide : **ligne invalide entière** (motif affiché), plutôt qu'un membre importé sans ce champ : l'encadrant corrige son fichier, rien n'est perdu en silence.
  - Zéro d'Excel remis devant un numéro de 9 chiffres.
  - Doublon si la date manque d'un côté (la maquette montre « Zoé Blanc · déjà dans l'appli » sans date) ; membres archivés compris.
  - Doublons « Ignorer » cochés par défaut (maquette).

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28 ; ticket du premier lot du jalon (031, 032, 033).
- Longueurs (SEC-06) : **nom et prénom de 100 caractères au plus, caractères de contrôle refusés**, décision du porteur du 2026-11-28. La **même limite s'applique à la saisie dans l'appli** : la règle est posée ici dans `validateMember` (domaine), les formulaires viennent au 032b. Règle à ajouter à SEC-06 à l'intégration : « nom et prénom d'un membre : 100 caractères au plus, sans caractère de contrôle (U+0000 à U+001F, U+007F), à l'import comme à la saisie ».
- Groupe introuvable : **membre importé sans groupe, section « Groupe introuvable » dans l'aperçu** (écart de maquette validé le 2026-11-28 ; maquette à mettre à jour, écran au 035).
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Import CSV : colonnes reconnues, lignes invalides et doublons repérés avant toute écriture (F-07, EX-30).
- Architecture : `src/domain/importFields.ts`, `src/domain/memberImport.ts` ; `validateMember` : 100 caractères, sans caractère de contrôle.
- SECURITE : SEC-06, nom et prénom de 100 caractères au plus, sans caractère de contrôle, à l'import comme à la saisie (décision du porteur du 2026-11-28).
