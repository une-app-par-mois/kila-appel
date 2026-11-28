# 032 — Import CSV : règles de l'import et aperçu

Statut : en cours · Jalon : 3 · Zone sensible : **oui** (import CSV : données de mineurs qui entrent dans la base, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun (reçoit les lignes `{ line, cells }[]` du 031 : contrat commun ci-dessous, type déclaré structurellement dans `memberImport.ts`) · Fichiers touchés : `src/domain/memberImport.ts` et son test (nouveaux), `src/domain/importFields.ts` et son test (nouveaux : dates, téléphone, longueurs), `src/__fixtures__/importRows.ts` (nouveau), `src/domain/validation.ts` et son test (limite de nom et prénom, décision du porteur du 2026-11-28), `src/config/libelles/commun.ts` (messages des deux nouveaux codes) — 8 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

**Contrat commun 031 ↔ 032** (séance de lancement du lot J3-1, 2026-11-28) : `parseCsv(text)` rend `{ separator, rows: { line: number; cells: string[] }[] }`, l'en-tête en `rows[0]` ; `line` est le numéro de ligne du tableur (en-tête = 1, lignes vides comptées dans la numérotation, un champ sur deux lignes compte pour une). Le 032 déclare ce type structurellement chez lui (`memberImport.ts`), le 034 unifiera. Refus du 031 en valeur de retour, liste fermée : `EMPTY`, `NOT_TEXT`, `TOO_LARGE`, `TOO_MANY_ROWS`, `MALFORMED` (avec le numéro de ligne), sans texte du fichier (ABS-04, SEC-12). `MAX_CSV_BYTES = 1024 * 1024` est exporté par `csvDecode.ts` ; le 033 reçoit la limite en paramètre (pas de valeur par défaut).

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
  - Espaces autour retirés ; nom et prénom écrits en NFC (ici, pas dans `validateMember`).
  - Dates avec une heure, ou à points ou à tirets (`14.03.2017`, `14-03-2017`) refusées ; `0033…` refusé ; le 0 n'est remis qu'après retrait des espaces, points et tirets. (Dates : changé après contradiction, voir « Décisions ».)
- `src/domain/validation.ts` : `validateMember` refuse un nom ou un prénom de plus de 100 caractères, comptés en points de code après `trim()` (`NAME_TOO_LONG`, « 100 caractères au plus. »), ou qui contient, après `trim()`, un caractère de U+0000 à U+001F, U+007F à U+009F, U+2028, U+2029, U+202A à U+202E ou U+2066 à U+2069 (`NAME_INVALID_CHAR`, « Retirez le caractère invisible (tabulation, retour à la ligne). ») ; messages dans `src/config/libelles/commun.ts` ; `validateName` inchangé. La même règle s'applique à la restauration : une sauvegarde avec un nom hors règle est refusée en entier (`checkRows` → `validateMember`, `backupRows.ts` inchangé) ; tests existants de sauvegarde et de restauration verts, données fictives conformes. Seuls nom et prénom d'un membre : saisons, groupes et libellés de contact inchangés. L'import et la saisie (032b) passent par la même règle.
- `src/domain/memberImport.ts` : `previewImport(rows, { existingMembers, groups, today })`.
  - En-têtes comparés sans casse, accents, espaces, `_` ni `-` : `nom`, `prenom`, `date_naissance` (aussi « date de naissance », « naissance »), `telephone` (aussi « tel », « téléphone d'urgence »), `groupe`. Toute autre colonne ignorée ; colonne en double : la première.
  - Sans `nom` ou sans `prenom` : refus `MISSING_COLUMNS` (« Fichier non reconnu »).
  - Cellules manquantes : vides ; en trop : ignorées ; ligne toute vide : ignorée. En-tête valide sans données : aperçu à zéro.
  - Chaque ligne : valide, **invalide**, ou **doublon** ; priorité invalide > doublon > groupe introuvable. Invalide : un seul motif (champ + code `NAME_REQUIRED`, `NAME_TOO_LONG`, `NAME_INVALID_CHAR`, `DATE_INVALID`, `DATE_IN_FUTURE`, `PHONE_INVALID`), le premier trouvé dans l'ordre nom, prénom, date, téléphone.
  - Doublon : nom et prénom égaux après `foldText`, espaces réduits et apostrophe ’ remplacée par ', et date de naissance égale ou absente d'un côté ; contre les membres de l'appli (archivés compris) et contre les lignes **valides** précédentes du fichier.
  - Groupe : groupe non archivé de la saison active dont le nom est égal après `foldText` ; introuvable, sans saison active, ou deux groupes de ce nom dans la saison active : membre importé sans groupe, ligne signalée « Groupe introuvable » ; cellule groupe vide : sans groupe, sans signal.
  - Rendu : compteurs (lignes, à importer, invalides, doublons), listes pour l'écran, et la liste à écrire selon les doublons que l'encadrant garde (`ignored` par défaut).
- Seuls les 5 champs sont gardés (ABS-03) ; un `=` en tête est gardé tel quel (neutralisation à l'export, 036).
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

Séance de lancement du lot J3-1 (2026-11-28), réponses du porteur :

- **Caractères refusés** dans nom et prénom (SEC-06) : en plus de U+0000 à U+001F et U+007F, **aussi U+0080 à U+009F, U+2028, U+2029 et les caractères de sens d'affichage U+202A à U+202E et U+2066 à U+2069**, à l'import comme à la saisie, dans `validateMember`. La règle complète remplace celle de la séance de découpage dans le report à SEC-06 (« À reporter »).
- **Restauration** : même règle ; une sauvegarde avec un nom hors règle est refusée en entier, par `checkRows` → `validateMember`, sans toucher `backupRows.ts`. Ligne à ajouter à SEC-10 à l'intégration (« À reporter »). Le 032 vérifie que les tests existants de sauvegarde et de restauration restent verts (données fictives conformes). La fiche du 032b est corrigée en conséquence (un nom plus long ne peut pas venir d'une sauvegarde).

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Contrat commun 031 ↔ 032 (en tête de la fiche).
- Cellules manquantes = vides, en trop ignorées, ligne toute vide ignorée ; en-tête valide sans données : aperçu à zéro.
- 100 caractères comptés en points de code après `trim()`, dans `validateMember` seulement (pas `validateName`) ; contrôle des caractères après `trim()`.
- Un motif par ligne invalide (champ + code), le premier trouvé dans l'ordre nom, prénom, date, téléphone ; textes de `NAME_TOO_LONG` et `NAME_INVALID_CHAR` dans `commun.ts`.
- Priorité invalide > doublon > groupe introuvable ; doublon interne comparé aux lignes valides précédentes seulement ; comparaison `foldText`, espaces réduits, apostrophe ’ → '.
- Nom et prénom écrits en NFC dans `importFields` (pas dans `validateMember`).
- Deux groupes de même nom dans la saison active : « Groupe introuvable » ; cellule groupe vide : sans groupe, sans signal.
- Dates avec heure, à points ou à tirets refusées ; `0033…` refusé ; 0 remis après retrait des espaces, points et tirets.
- Seuls les 5 champs gardés (ABS-03), aucune cellule dans une erreur (ABS-04), `=` gardé tel quel (neutralisation à l'export, 036).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Saison active pour le groupe | Groupes déjà filtrés par l'appelant ; saison passée en paramètre | `previewImport(rows, { existingMembers, groups, activeSeasonId, today })`, groupes de la forme de `Group` (`id`, `seasonId`, `name`, `archivedAt`) | Le domaine applique lui-même « non archivé, saison active » (testé) ; le 034 passe les listes des dépôts telles quelles | à relire |
| Ordre des motifs nom puis prénom | Appeler `validateMember` seul (prénom d'abord) ; exporter la règle d'un nom | `validateMemberName` exporté de `validation.ts`, appelé pour nom puis prénom ; `validateMember` rejoué ensuite sur le membre entier | Ordre du ticket (nom, prénom, date, téléphone) sans dupliquer la règle SEC-06 | à relire |
| Écriture du contrôle des caractères | Regex ; test des points de code | Fonction `isInvisible` sur les points de code | Biome refuse les caractères de contrôle dans une regex (`noControlCharactersInRegex`) ; la règle n'est pas désactivée | à relire |
| Comptage « 24 lignes » | Toutes les lignes ; lignes non vides | Lignes de données non vides (les lignes toutes vides ne comptent pas) | Maquette : 24 = 21 + 1 + 2 | à relire |
| Compteur « à importer » et doublons gardés | Compteur recalculé ; liste seule | `counts.toImport` = lignes valides (doublons ignorés) ; `membersToWrite(preview, kept)` rend la liste à écrire, dans l'ordre du fichier, avec les doublons gardés (numéros de ligne) | L'écran (035) recalcule le bouton à partir de la liste | à relire |
| Doublon interne et doublons précédents | Comparer aussi aux doublons ; aux valides seules | Un doublon n'est pas une ligne valide : les lignes suivantes ne lui sont pas comparées ; un doublon porte sa source (`app` ou `file`) | Décision « lignes valides précédentes » de la pré-analyse ; la source sert au texte de l'écran | à relire |
| Apostrophe dans un en-tête | Gardée ; retirée | Retirée avec espaces, `_` et `-` (« téléphone d'urgence » reconnu avec ' ou ’) | Sinon l'en-tête prévu par le ticket n'est pas reconnu | à relire |
| Date `J/M/AAAA` | Jour et mois tous deux à un chiffre ; chacun à 1 ou 2 chiffres | Chacun à 1 ou 2 chiffres (`04/3/2017` accepté) | Excel écrit les deux formes selon le format de cellule | à relire |
| Groupe introuvable à l'écran | Numéro de ligne seul ; avec la cellule | `{ line, group }`, la cellule pour l'écran (« Poussin mercredi », maquette) ; jamais dans une erreur ni un journal | La maquette montre le nom saisi ; ce n'est pas une donnée de personne | à relire |
| Fichiers du ticket | 8 fichiers ; plus les tests de sauvegarde | 10 : `src/data/backupRows.test.ts` et `src/data/backup.test.ts` en plus (tests seulement, demandés au lancement) | Montrer qu'un nom hors règle fait refuser la sauvegarde en entier ; `backupRows.ts` inchangé | à relire |
| Formes de date refusées (pré-analyse : points, tirets, heure refusés) | Refus ; tolérance | `J.M.AAAA` et `J-M-AAAA` (jour et mois sur 1 ou 2 chiffres, même séparateur), `AAAA-MM-JJ 00:00` et `AAAA-MM-JJ 00:00:00` acceptés ; année à 2 chiffres, autre heure, numéro de série d'Excel, date future toujours refusés | Excel et LibreOffice écrivent ces formes ; l'heure nulle vient d'une cellule date exportée | changée après contradiction |
| Synonymes d'en-tête | Liste du ticket ; liste élargie | Téléphone : aussi portable, mobile, téléphone parent(s), tel parent(s), tel urgence ; date : aussi date naiss., ddn ; `.` retiré des en-têtes comme les espaces | En-têtes courants des fichiers de club | changée après contradiction |
| Doublons en temps linéaire (revue) | Comparaison de chaque ligne à chaque membre ; index | Clé `nameKey(nom) + U+0000 + nameKey(prénom)` calculée une fois, rangée dans une `Map` (membres de l'appli, lignes valides du fichier) ; test de volume : 2 000 lignes contre 10 000 membres sous 2 s | 2 000 × 10 000 comparaisons figeaient l'aperçu | à relire |
| Doublon au groupe introuvable (revue) | Rien ; signalé sur le doublon | `unknownGroup` (cellule ou `null`) sur chaque doublon ; la section `unknownGroups` reste réservée aux lignes valides | L'écran (035) prévient quand un tel doublon est gardé | à relire |
| Membre existant d'un doublon (revue) | Source seule ; avec le membre | Doublon de source `app` : `memberId` et `archived` ; `ExistingMember` prend `id` et `archivedAt` (forme de `Member`) | L'écran peut dire « archivé » et ouvrir la fiche | à relire |
| Recherche du groupe (revue) | `foldText` seul ; clé des noms | Même clé que les doublons (`foldText`, espaces réduits, ’ ramené à ') | « Groupe d’Alix » et « Groupe d'Alix » sont un même groupe | à relire |
| En-têtes `constructor`, `__proto__` (revue) | Objet ; `Map` | `Map` : aucun en-tête hérité d'`Object.prototype` n'est une colonne (testé) | Un objet littéral reconnaissait `constructor` | à relire |
| Téléphone `33` sans `+` (revue) | Refus ; `+` remis | `33` suivi de 9 chiffres commençant par 1 à 9 → `+33…` puis `parsePhone` ; `0033…` toujours refusé | Excel retire le `+` d'un numéro saisi comme un nombre | à relire |
| Fichiers du ticket (corrections de revue) | 10 ; 12 | 12 : `memberImportColumns.test.ts` (tests d'en-têtes sortis de `memberImport.test.ts`, règle des 300 lignes) et `memberImportVolume.test.ts` en plus | Corrections demandées à l'intégration | à relire |
| Autres caractères invisibles dans nom et prénom (SEC-06) | Règle du lancement seule ; plus large | Aussi U+061C, U+200B, U+200E, U+200F, U+FEFF et les demi-caractères isolés (U+D800 à U+DFFF rendus seuls par `[...name]`) : `NAME_INVALID_CHAR` ; U+200D accepté (émojis composés, testé) | Réponse du porteur (cas réservé : SEC-06) | décidée par le porteur le 2026-11-28 |
| Doublon de l'appli à la rentrée | Ignoré seulement ; inscrit et désarchivé | Un doublon de source `app` laissé sur « Ignorer » sera inscrit au groupe du CSV s'il ne l'est pas déjà, et désarchivé s'il était archivé ; nom, date et contact jamais réécrits. Au 032 : le groupe trouvé est déjà porté par le doublon (`member.groupId`, testé), avec `memberId`, `archived` et `unknownGroup` | Réponse du porteur | décidée par le porteur le 2026-11-28 |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Import CSV : colonnes reconnues, lignes invalides et doublons repérés avant toute écriture (F-07, EX-30).
- Architecture : `src/domain/importFields.ts`, `src/domain/memberImport.ts` ; `validateMember` : 100 caractères, sans caractère de contrôle ni invisible.
- SECURITE : SEC-06, nom et prénom de 100 caractères au plus (points de code, après `trim()`), sans caractère de U+0000 à U+001F, U+007F à U+009F, U+2028, U+2029, U+202A à U+202E, U+2066 à U+2069, ni U+061C, U+200B, U+200E, U+200F, U+FEFF, ni demi-caractère (surrogate) isolé ; U+200D accepté (émojis composés) ; à l'import, à la saisie et à la restauration (décisions du porteur du 2026-11-28).
- SECURITE : SEC-10, une sauvegarde dont un nom ou un prénom est hors de cette règle est refusée en entier à la restauration (décision du porteur du 2026-11-28).
- Pour le 035 : montrer dans l'aperçu les colonnes reconnues (et celles ignorées).
- Pour le 035 : la cellule « groupe » d'un groupe introuvable s'affiche sur une seule ligne, tronquée à 100 points de code avec une ellipse.
- Pour le 035 : un doublon gardé dont `unknownGroup` n'est pas nul est importé sans groupe ; l'écran le dit.
- SECURITE : SEC-10, limite connue : une sauvegarde faite avant le 032 qui contient un nom hors règle est refusée en entier, et un tel membre ne peut plus être modifié dans l'appli (l'appli n'est pas publiée).
- Pour le 034 : un doublon de source `app` laissé sur « Ignorer » est inscrit au groupe du CSV (`member.groupId`) s'il ne l'est pas déjà, et désarchivé s'il était archivé (`memberId`, `archived`), dans la même transaction que l'import ; nom, date de naissance et contact jamais réécrits (décision du porteur du 2026-11-28).
- Pour le 035 : l'aperçu dit qu'un doublon ignoré sera inscrit à son groupe et, s'il est archivé, désarchivé.
- Maquette : « Import CSV : aperçu », écart validé par le porteur le 2026-11-28 (doublon ignoré inscrit et désarchivé), à ajouter à l'intégration.
