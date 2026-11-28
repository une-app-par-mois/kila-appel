# 031 — Import CSV : décodage et lecture du fichier

Statut : fusionné dans le groupe (PR #93) · Jalon : 3 · Zone sensible : **oui** (import CSV : fichier extérieur lu, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/domain/csvDecode.ts` et son test (nouveaux), `src/domain/csvParse.ts` et son test (nouveaux), `src/__fixtures__/csvFiles.ts` (nouveau : fichiers fictifs et piégés, en octets) — 5 fichiers (6 si `csvParse.test.ts` dépasse 300 lignes : second fichier de test)

Découpé le 2026-11-28 (séance de découpage du jalon 3).

**Contrat commun 031 ↔ 032** (séance de lancement du lot J3-1, 2026-11-28) : `parseCsv(text)` rend `{ separator, rows: { line: number; cells: string[] }[] }`, l'en-tête en `rows[0]` ; `line` est le numéro de ligne du tableur (en-tête = 1, lignes vides comptées dans la numérotation, un champ sur deux lignes compte pour une). Le 032 déclare ce type structurellement chez lui (`memberImport.ts`), le 034 unifiera. Refus du 031 en valeur de retour, liste fermée : `EMPTY`, `NOT_TEXT`, `TOO_LARGE`, `TOO_MANY_ROWS`, `MALFORMED` (avec le numéro de ligne), sans texte du fichier (ABS-04, SEC-12). `MAX_CSV_BYTES = 1024 * 1024` est exporté par `csvDecode.ts` ; le 033 reçoit la limite en paramètre (pas de valeur par défaut).

## Contexte

F-07 (EX-30) commence par lire un fichier que l'appli ne maîtrise pas : un CSV enregistré par Excel (UTF-8 avec ou sans BOM, ou Windows-1252), LibreOffice ou Google Sheets. Ce ticket transforme des octets en un tableau de lignes de texte, ou en un refus motivé ; il ne sait rien des membres (032). Domaine pur, sans React ni fichier. Critère de sortie du jalon : « import d'un CSV fictif Excel (UTF-8 et Windows-1252) ».

## À lire

- `docs/PRD.md` : EX-30 ; `docs/SECURITE.md` : SEC-06 (1 Mo, 2 000 lignes, UTF-8 et Windows-1252), SEC-12 (ABS-04)
- `docs/CONVENTIONS.md` §5.2 (cas obligatoires du domaine : CSV, SEC-06) ; CONV-14 (données venues de l'extérieur validées, jamais simplement converties)
- `docs/ARCHITECTURE.md` §1, §3 (domaine pur), §7 (journaux)

## Ce qui change

- `src/domain/csvDecode.ts` : `decodeCsv(bytes: Uint8Array)` → `{ text, encoding: 'utf-8' | 'windows-1252' }` ou refus `{ reason }`.
  - BOM UTF-8 (`EF BB BF`) : retiré, UTF-8.
  - Sinon, UTF-8 **strict** valide (séquences courtes, surrogates et sur-longues refusés) : UTF-8.
  - Sinon : Windows-1252, par une table écrite à la main (0x80 à 0x9F selon WHATWG, le reste identique à Latin-1).
  - BOM UTF-16 (`FF FE`, `FE FF`, « Texte Unicode » d'Excel) ou octet nul : refus `NOT_TEXT`. Fichier de 0 octet, BOM seul ou blancs seuls : refus `EMPTY`.
  - BOM UTF-8 suivi d'octets invalides : refus `MALFORMED`, sans repli sur Windows-1252.
  - `MAX_CSV_BYTES = 1024 * 1024` exporté.
- `src/domain/csvParse.ts` : `parseCsv(text)` → `{ separator, rows: { line, cells }[] }` (contrat ci-dessus) ou refus.
  - Séparateur détecté sur la première ligne non vide, hors guillemets : `;` (Excel français), tabulation ou `,`, le plus fréquent ; égalité : `;` puis tabulation puis `,` ; aucun : `;`. Directive `sep=` en première ligne respectée, et non lue comme en-tête.
  - Guillemets RFC 4180 : `""` dans un champ entre guillemets, séparateur et retour à la ligne permis dans un champ entre guillemets ; guillemet non fermé, ou texte après un guillemet fermant : refus `MALFORMED` ; un guillemet au milieu d'un champ sans guillemets (`O"Brien`) est gardé.
  - Fins de ligne CRLF, LF ou CR seul ; lignes vides ou faites seulement de séparateurs et d'espaces ignorées, mais comptées dans la numérotation.
  - Champs rendus tels quels : ni `trim()` ni complétion des cellules manquantes (032).
  - SEC-06 : plus de 2 000 lignes de données (en-tête et lignes vides non comptées) : refus `TOO_MANY_ROWS`, sans lire la suite.
  - Chaque ligne garde son numéro dans le fichier (pour « Ligne 17 » de l'aperçu, ticket 032).
- La limite de 1 Mo est vérifiée avant la lecture (ticket 034) ; `decodeCsv` la revérifie sur la longueur reçue (`TOO_LARGE`).
- Aucune erreur ne contient un morceau du fichier : code et numéro de ligne seulement (ABS-04, SEC-12).

## Critères d'acceptation

- [ ] F-07, EX-30, SEC-06 : un même tableau fictif (« Zoé », « Léo », « Noël », « Françoise », « Œ » et « ’ ») enregistré en UTF-8 avec BOM, UTF-8 sans BOM et Windows-1252 donne exactement les mêmes lignes.
- [ ] SEC-06 : 2 000 lignes de données acceptées, 2 001 refusées ; plus de 1 Mo refusé ; UTF-16 et fichier binaire (en-tête d'un `.xlsx`, `PK…`) refusés.
- [ ] Champs entre guillemets avec `;`, `,`, `""` et retour à la ligne lus comme un seul champ ; numéro de ligne juste après un champ sur deux lignes.
- [ ] Séparateurs `;`, `,` et tabulation reconnus ; CRLF, LF et CR.
- [ ] Aucune erreur levée ne contient un texte du fichier (test qui cherche les noms fictifs dans les messages).

## Tests attendus

- `src/domain/csvDecode.test.ts` : les 256 octets de Windows-1252 comparés au `TextDecoder('windows-1252')` de Node (oracle des tests seulement : l'appli n'en dépend pas) ; UTF-8 invalide (octet de suite isolé, séquence tronquée, sur-longue, surrogate) → Windows-1252 ; BOM.
- `src/domain/csvParse.test.ts` : RFC 4180, séparateurs, limites, lignes vides, guillemet non fermé.
- Fichiers fictifs dans `src/__fixtures__/csvFiles.ts`, réutilisés par 032, 034 et la campagne Maestro (042) ; fichiers Windows-1252 écrits en hexadécimal (le `TextDecoder` de Node sert seulement à vérifier ces fixtures) ; gros fichiers fabriqués par une fonction.

## Hors périmètre

- Colonnes, validation des membres, doublons, groupes (032) ; sélecteur et lecture du fichier (033, 034) ; écrans (035).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées (recommandation nette) :
  - **Décodage à la main** (UTF-8 strict et table Windows-1252) plutôt que `TextDecoder` : Hermes en contient un (chaînes `TextDecoder`, `windows-1252`, `fatal` relevées dans `libhermesvm.so` le 2026-11-28), mais rien n'a été vérifié à l'exécution sur le téléphone ; la table fait 32 entrées et rend le domaine indépendant du moteur.
  - Fichier UTF-16 refusé (« Fichier non reconnu ») plutôt que décodé : Excel ne le produit que par « Texte Unicode », qui n'est pas un CSV.
  - 2 000 lignes de **données**, en-tête et lignes vides non comptées.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28 ; ticket du premier lot du jalon (031, 032, 033).
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

Séance de lancement du lot J3-1 (2026-11-28), réponses du porteur :

- SEC-06 (règle appliquée au 032, dans `validateMember`) : nom et prénom refusent aussi U+0080 à U+009F, U+2028, U+2029 et les caractères de sens d'affichage U+202A à U+202E et U+2066 à U+2069, en plus de U+0000 à U+001F et U+007F, à l'import comme à la saisie. Le 031 rend les champs tels quels.

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Contrat commun 031 ↔ 032 (en tête de la fiche) : type de `parseCsv`, numérotation des lignes, liste fermée des refus, `MAX_CSV_BYTES`.
- Lignes faites seulement de séparateurs ou d'espaces : ignorées, mais numérotées.
- Séparateur détecté sur la première ligne non vide ; égalité `;` > tabulation > `,` ; aucun séparateur : `;`.
- Directive `sep=` en première ligne respectée et non lue comme en-tête.
- `O"Brien` gardé ; texte après un guillemet fermant : `MALFORMED`.
- BOM UTF-8 suivi d'octets invalides : `MALFORMED`, sans repli sur Windows-1252.
- 0 octet, BOM seul ou blancs seuls : `EMPTY` ; en-tête sans données : pas un refus (le 032 rend un aperçu à zéro).
- Champs non retouchés (ni `trim()` ni complétion).
- Fixtures Windows-1252 écrites en hexadécimal, `TextDecoder` de Node seulement pour les vérifier ; gros fichiers fabriqués par une fonction.
- Octet nul : `NOT_TEXT`.
- `csvParse.test.ts` au-delà de 300 lignes : second fichier de test (6 fichiers).
- Non vérifié, à noter dans la PR : un fichier ISO-8859-15 ou MacRoman est lu comme Windows-1252, sans signal.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Numérotation après une directive `sep=` | Directive comptée (en-tête = 2) ; non comptée | Non comptée : l'en-tête qui suit est la ligne 1 | Contrat « en-tête = 1 » ; Excel consomme la directive et montre l'en-tête en ligne 1 | à relire |
| Forme de la directive `sep=` | Toute valeur ; `;`, `,` ou tabulation seuls | `sep=;`, `sep=,` ou `sep=` + tabulation en première ligne, casse ignorée, suivi au plus d'autres séparateurs ou d'espaces jusqu'à la fin de la ligne (`sep=;;;;`, `sep=; `) ; `sep=;Nom` reste une ligne de données | Un tableur qui réenregistre la directive y ajoute des séparateurs (revue du 031) | changée après contradiction |
| Ligne « vide » | Espaces et séparateur choisi ; espaces et les trois séparateurs | Cellules faites seulement d'espaces, `;` et `,` (la tabulation est un espace) : ligne ignorée, comptée ; même règle pour la ligne qui sert à détecter le séparateur | Une ligne `,,` dans un fichier en `;` reste du bruit ; détection et lecture d'accord | à relire |
| Ligne donnée avec `MALFORMED` | Ligne de l'éditeur de texte ; ligne du tableur | Ligne du tableur de l'enregistrement où se trouve le guillemet fautif (non fermé, ou suivi d'un autre texte) | Une seule convention, celle du contrat 031 ↔ 032 (revue du 031) | changée après contradiction |
| Espaces autour d'un champ entre guillemets (`Martin, "Dupont, Léa" `) | Champ sans guillemets ; espaces ignorés | Espaces entre le séparateur et le guillemet ouvrant, et entre le guillemet fermant et le séparateur ou la fin de ligne, ignorés : cellule `Dupont, Léa` ; seul un autre texte après le guillemet fermant reste `MALFORMED` ; sans guillemet ouvrant, le champ reste tel quel, espaces compris | Google Sheets et des exports écrits à la main mettent une espace après la virgule (revue du 031) | changée après contradiction |
| BOM dans le texte reçu par `parseCsv` | Laissé ; retiré | U+FEFF de tête retiré aussi par `parseCsv` | Le 032 et ses tests appellent `parseCsv` sur un texte direct ; l'en-tête resterait « U+FEFF Nom » | à relire |
| Exports pour les tests | Tester par `decodeCsv` seulement ; exporter la table | `decodeWindows1252` exporté (les 256 octets comparés au `TextDecoder` de Node, octet nul compris) ; `MAX_CSV_DATA_ROWS = 2000` exporté par `csvParse.ts` | L'octet nul est refusé par `decodeCsv` : seule la fonction seule permet le test des 256 octets | à relire |
| Ordre des refus du décodage | — | `TOO_LARGE`, puis `NOT_TEXT` (BOM UTF-16, octet nul, BOM UTF-8 suivi d'octets invalides), puis `EMPTY` (texte fait de blancs selon `trim()`) ; `decodeCsv` ne rend plus `MALFORMED` | Taille d'abord, sans parcourir un gros fichier | changée après contradiction |
| Second fichier de test | — | `src/domain/csvParseLimits.test.ts` (limites, refus, trois encodages de bout en bout, ABS-04) : 6 fichiers | Décision de la pré-analyse ; `csvParse.test.ts` garde les guillemets, lignes, fins de ligne et séparateurs | à relire |
| Numéro de ligne d'un champ sur plusieurs lignes | Lignes physiques ; lignes du tableur | `line` = numéro de ligne du tableur : un retour à la ligne entre guillemets ne fait pas avancer le numéro ; seules les fins d'enregistrement et les lignes vides comptent ; directive `sep=` non comptée (en-tête = 1) | Contrat 031 ↔ 032 : « Ligne 17 » est celle du tableur (revue du 031) | changée après contradiction |
| BOM UTF-8 suivi d'octets invalides (décision de la pré-analyse) | `MALFORMED` ; `NOT_TEXT` | `NOT_TEXT`, toujours sans repli sur Windows-1252 | Le fichier n'est pas un texte lisible ; `MALFORMED` reste réservé au découpage, avec un numéro de ligne (revue du 031) | changée après contradiction |
| Guillemets pendant la détection du séparateur | Bascule à chaque guillemet ; même règle que la lecture | Même règle que la lecture : un guillemet n'ouvre un champ qu'en tête de champ (après des espaces), et ne le ferme que suivi d'espaces puis d'un séparateur, d'une fin de ligne ou du texte ; `Taille 5",Nom,Prénom` détecté `,` | Un guillemet en milieu de champ faussait la détection (revue du 031) | changée après contradiction |
| Guillemets doublés | Concaténation par paire ; une tranche puis un remplacement | Tranche entre les guillemets, puis un seul `replace(/""/g, '"')` | Coût linéaire sous Hermes (revue du 031) | à relire |
| `FICTIVE_NAMES` des fixtures | Liste écrite à la main ; tirée du tableau | Noms et prénoms de toutes les lignes de `MEMBERS_TABLE` | Aucun nom oublié dans les tests ABS-04 (revue du 031) | à relire |
| Fichier « CSV (Macintosh) » d'Excel (MacRoman) | Lu comme du Windows-1252 ; repéré et refusé | Repéré et refusé : `UNSUPPORTED_ENCODING`, sans texte du fichier ; ni décodé ni lu en Windows-1252 ; seulement pour un fichier qui n'est pas de l'UTF-8 valide | Un nom lu de travers serait importé sans signal (SEC-06) | décidée par le porteur le 2026-11-28 |
| Heuristique du repérage MacRoman | Au moins un octet MacRoman et aucun en 0xC0–0xFF ; majorité | Majorité : plus d'octets parmi `82 83 87 88 89 8D 8E 8F 90 95 99 9D 9F` (Ç É á à â ç é è ê ï ô ù ü en MacRoman, signes rares ou indéfinis en Windows-1252) que d'octets 0xC0–0xFF (lettres accentuées de Windows-1252) ; € Œ œ ‘ ’ “ ” – — … jamais comptés | La règle « aucun octet 0xC0–0xFF » laissait passer un fichier MacRoman avec ’ (D5) ou « (C7) ; limite connue : un fichier Windows-1252 dont les seuls caractères hors ASCII sont Ž, ‰ ou ™ serait refusé à tort | à relire |

## Questions pour le porteur

- **Décision du porteur du 2026-11-28** : fusionné dans le groupe après sa relecture (PR #93).

## À reporter

- CHANGELOG : Import CSV : lecture des fichiers d'Excel, de LibreOffice et de Google Sheets, en UTF-8 ou Windows-1252, séparés par point-virgule, virgule ou tabulation (F-07, EX-30, SEC-06).
- Architecture : `src/domain/csvDecode.ts`, `src/domain/csvParse.ts`.
- Pour le 034 (et le 032) : `parseCsv` n'est appelé qu'après `decodeCsv`, qui borne la taille à 1 Mo. Le nombre de cellules par ligne n'est pas borné (jusqu'à environ 500 000 dans 1 Mo) : le 032 et le 034 doivent rester linéaires en nombre de cellules.
- Pour le 035 : texte du refus `UNSUPPORTED_ENCODING` : « Ce fichier est enregistré dans un ancien format Mac. Dans Excel : Enregistrer sous › CSV UTF-8. Rien n'a été importé. »
- SEC-06 (règle à ajouter à l'intégration, décision du porteur du 2026-11-28) : un CSV en MacRoman (« CSV (Macintosh) » d'Excel) est repéré et refusé (`UNSUPPORTED_ENCODING`), ni décodé ni lu comme du Windows-1252 ; repérage seulement pour un fichier qui n'est pas de l'UTF-8 valide (heuristique dans `src/domain/csvDecode.ts`).
