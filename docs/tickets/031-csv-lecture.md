# 031 — Import CSV : décodage et lecture du fichier

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (import CSV : fichier extérieur lu, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/domain/csvDecode.ts` et son test (nouveaux), `src/domain/csvParse.ts` et son test (nouveaux), `src/__fixtures__/csvFiles.ts` (nouveau : fichiers fictifs et piégés, en octets) — 5 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

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
  - BOM UTF-16 (`FF FE`, `FE FF`, « Texte Unicode » d'Excel) ou octet nul : refus `NOT_TEXT`. Fichier vide : refus `EMPTY`.
- `src/domain/csvParse.ts` : `parseCsv(text)` → `{ rows: string[][], separator }` ou refus.
  - Séparateur détecté sur la ligne d'en-tête, hors guillemets : `;` (Excel français), tabulation ou `,`, le plus fréquent.
  - Guillemets RFC 4180 : `""` dans un champ entre guillemets, séparateur et retour à la ligne permis dans un champ entre guillemets ; guillemet non fermé : refus `MALFORMED`.
  - Fins de ligne CRLF, LF ou CR seul ; lignes entièrement vides ignorées et non comptées.
  - SEC-06 : plus de 2 000 lignes de données (en-tête non comptée) : refus `TOO_MANY_ROWS`, sans lire la suite.
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
- Fichiers fictifs dans `src/__fixtures__/csvFiles.ts`, réutilisés par 032, 034 et la campagne Maestro (042).

## Hors périmètre

- Colonnes, validation des membres, doublons, groupes (032) ; sélecteur et lecture du fichier (033, 034) ; écrans (035).

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées (recommandation nette) :
  - **Décodage à la main** (UTF-8 strict et table Windows-1252) plutôt que `TextDecoder` : Hermes en contient un (chaînes `TextDecoder`, `windows-1252`, `fatal` relevées dans `libhermesvm.so` le 2026-11-28), mais rien n'a été vérifié à l'exécution sur le téléphone ; la table fait 32 entrées et rend le domaine indépendant du moteur.
  - Fichier UTF-16 refusé (« Fichier non reconnu ») plutôt que décodé : Excel ne le produit que par « Texte Unicode », qui n'est pas un CSV.
  - 2 000 lignes de **données**, en-tête et lignes vides non comptées.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Import CSV : lecture des fichiers d'Excel, de LibreOffice et de Google Sheets, en UTF-8 ou Windows-1252, séparés par point-virgule, virgule ou tabulation (F-07, EX-30, SEC-06).
- Architecture : `src/domain/csvDecode.ts`, `src/domain/csvParse.ts`.
