# 036 — Export CSV des présences : contenu

Statut : en cours · Jalon : 3 · Zone sensible : **oui** (export : données de mineurs qui sortent de l'appareil ; injection de formules, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `src/domain/csvWrite.ts` et son test (nouveaux), `src/domain/attendanceCsv.ts` et son test (nouveaux), `src/data/attendanceExportRepo.ts` et son test (nouveaux), `src/config/libelles/stats.ts` (en-tête, « Sans créneau », « Sans groupe » ; séance de lancement du lot J3-2) — 7 fichiers (8 si le test NF-08 va dans un fichier séparé ; le jeu fictif `src/__fixtures__/statsSeed.ts` est réutilisé sans modification)

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

F-08 (EX-31) : une ligne par séance et par membre (date, créneau, groupe, nom, prénom, statut), sur une période et un groupe choisis. Ce ticket produit le texte du fichier et ses lignes ; l'écran et le partage viennent au 037. Critère de sortie du jalon : « CSV ouvert sur l'ordinateur ».

## À lire

- `docs/PRD.md` : EX-31, RM-03, RM-04, NF-08 ; `docs/CADRAGE.md` : glossaire (séance enregistrée, présence) ; `docs/CONFORMITE.md` §2.2 (droit d'accès d'une famille : export filtrable)
- `docs/SECURITE.md` : SEC-05, SEC-07 (neutralisation des formules), SEC-12
- Ticket 023 (plan validé : seules les séances `recorded`, RM-03, groupes listés, bornes de période)
- `src/data/statsSql.ts` (`RECORDED`, `credits` : attribution d'une présence à un groupe), `src/data/statsRepo.ts`, `src/domain/statsPeriod.ts`, `src/domain/formats.ts`

## Ce qui change

- `src/domain/csvWrite.ts` : `toCsv(header, rows)` :
  - séparateur `;`, fins de ligne CRLF, BOM UTF-8 en tête (Excel français ouvre le fichier sans perdre les accents) ;
  - champ entre guillemets s'il contient `;`, `"`, CR ou LF, `"` doublé ;
  - **SEC-07** : champ texte qui commence par `=`, `+`, `-`, `@`, tabulation ou retour chariot préfixé par `'` (premier caractère seulement ; neutralisé d'abord, mis entre guillemets ensuite) ;
  - BOM, en-tête, CRLF après chaque ligne ; période vide : BOM, en-tête et un CRLF ; `toCsv` rend une chaîne.
- `src/domain/attendanceCsv.ts` : `attendanceCsv(rows, labels)` → en-tête `Date;Créneau;Groupe;Nom;Prénom;Statut`, date `JJ/MM/AAAA` (RM-04), statut en toutes lettres (`labels.statuses`), créneau : son nom s'il en a un, sinon le jour de la date de la séance (`labels.weekdays`) et `sessions.start_time` (« Mercredi 14:00 ») ; `slot_id` NULL (EX-39) : « Sans créneau ». En-tête, « Sans créneau » et « Sans groupe » dans `src/config/libelles/stats.ts`, reçus en paramètre par le domaine.
  - Une présence qui compte pour deux groupes d'une séance : une seule ligne, groupes joints « A, B ».
  - Présence qui ne compte pour aucun groupe (groupe supprimé) : Groupe = « Sans groupe » (décision du porteur du 2026-11-28).
- `src/data/attendanceExportRepo.ts` :
  - `rows(period, groupId | null)` : une requête (NF-08), écrite par le dépôt (`statsSql.ts` inchangé) ; séances enregistrées de la période seulement (brouillons jamais exportés, aucune ligne sans présence) ; groupe de chaque présence selon RM-03 (même règle que les statistiques) ; présences sans groupe (groupe supprimé) dans l'export « Tous les groupes » seulement, jamais dans un export filtré ; membres archivés compris ; tri en SQL par date, `start_time` et id, puis par Collator français à l'intérieur d'une séance seulement.
  - `count(period, groupId | null)` : nombre de lignes pour le bouton « Exporter (2 418 lignes) », présences sans groupe comprises.
  - `groups(period)` : groupes proposés (ceux des statistiques de la période).

## Critères d'acceptation

- [ ] EX-31 : sur le jeu fictif du 023, la saison donne le nombre de lignes attendu, écrit en clair dans le test ; un groupe filtré ne donne que ses lignes ; séances préparées, annulées et non planifiées absentes.
- [ ] RM-03 : un membre passé d'un groupe à l'autre en cours de période apparaît sous chacun selon la date ; séance à deux groupes : chaque présence sous le groupe du membre.
- [ ] SEC-07 : « =1+1 », « +33… », « -Marie », « @SOMME », tabulation et retour chariot en tête neutralisés ; « Marie-Ève » et « O'Brien » intacts ; `;` et `"` dans un nom bien entourés.
- [ ] Bornes de période comprises ; période sans séance : 0 ligne.
- [ ] SEC-05 : requêtes paramétrées ; NF-08 : 500 membres, 3 saisons, une requête, durée mesurée (< 2 s, comme le 023).
- [ ] Le fichier produit se relit par le `parseCsv` du 031 quand il sera fusionné (test d'aller-retour ajouté par le premier des deux fusionné après l'autre).

## Tests attendus

- `src/domain/csvWrite.test.ts`, `src/domain/attendanceCsv.test.ts` (tests nommés `SEC-07`, `EX-31`).
- `src/data/attendanceExportRepo.test.ts` sur `node:sqlite`, jeu `statsSeed` et jeu de volume (`volumeSeed` ; NF-08 dans un fichier séparé si le test dépasse 300 lignes).
- Aller-retour `decodeCsv` puis `parseCsv` ; jeu piégé dans le test (`=1+1`, `-Marie`, `@SOMME`, `;`, `"`, `O'Brien`, `Marie-Ève`, groupe nommé `=…`, créneau supprimé, groupe supprimé) ; aucune erreur ne contient de nom.

## Hors périmètre

- Écran, fichier et partage (037) ; export d'autres données (membres, contacts) : hors EX-31.

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées :
  - Format pour Excel français : `;`, UTF-8 avec BOM, CRLF ; dates `JJ/MM/AAAA` ; statuts en toutes lettres ; en-têtes accentués.
  - Libellé du créneau et « Sans créneau » comme ci-dessus.
  - Groupes archivés et d'une autre saison exportés s'ils ont une séance dans la période (même règle que les statistiques, plan du 023 point 4).
  - Neutralisation SEC-07 sur les champs texte seulement (nom, prénom, groupe, créneau), pas sur la date ni le statut, que l'appli produit.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28.
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

Séance de lancement du lot J3-2 (2026-11-28), réponses du porteur :

- **Présences sans groupe** (groupe supprimé) : elles sortent dans l'export « Tous les groupes » avec Groupe = « Sans groupe » ; elles ne sortent pas d'un export filtré sur un groupe ; `count()` les compte. Le dépôt écrit sa propre requête, sans toucher `statsSql.ts`.
- **EX-31 reste tel quel.** À l'intégration du 036, `docs/CONFORMITE.md` §2.2 dira que, pour répondre au droit d'accès d'une famille, l'encadrant filtre l'enfant dans le tableur avant d'envoyer le fichier (« À reporter »). Idée « filtre par membre dans l'export » ajoutée à `docs/IDEES.md`.

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Séance à deux groupes : une seule ligne par présence, groupes joints « A, B ».
- Colonne Créneau : nom du créneau, sinon jour de la date de la séance et `sessions.start_time` ; « Sans créneau » si `slot_id` est NULL.
- Textes : `labels.statuses` et `labels.weekdays` réutilisés ; en-tête, « Sans créneau » et « Sans groupe » dans `src/config/libelles/stats.ts` (fichier ajouté) ; le domaine les reçoit en paramètre.
- Tri : en SQL par date, `start_time` et id, puis Collator français seulement à l'intérieur d'une séance ; `statsSql.ts` inchangé.
- Contenu : membres archivés compris ; brouillons jamais exportés ; aucune ligne sans présence.
- SEC-07 à la lettre : premier caractère seulement ; neutralisé d'abord, puis mis entre guillemets.
- Format : BOM, en-tête, CRLF après chaque ligne ; période vide : BOM, en-tête et un CRLF ; `toCsv` rend une chaîne.
- Tests : aller-retour `decodeCsv` puis `parseCsv` ; jeu piégé dans le test (`=1+1`, `-Marie`, `@SOMME`, `;`, `"`, `O'Brien`, `Marie-Ève`, groupe nommé `=…`, créneau supprimé, groupe supprimé) ; aucune erreur ne contient de nom ; NF-08 avec `volumeSeed` (une requête par appel, moins de 2 s), fichier séparé au-delà de 300 lignes.
- Fichiers : 7, ou 8.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (visible au 037).
- Architecture : `src/domain/csvWrite.ts`, `src/domain/attendanceCsv.ts`, `src/data/attendanceExportRepo.ts`.
- CONFORMITE (à l'intégration) : §2.2, pour répondre au droit d'accès d'une famille, l'encadrant filtre l'enfant dans le tableur avant d'envoyer le fichier (décision du porteur du 2026-11-28, EX-31 inchangée).
