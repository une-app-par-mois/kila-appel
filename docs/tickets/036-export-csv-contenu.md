# 036 — Export CSV des présences : contenu

Statut : en attente du porteur (Q2) · Jalon : 3 · Zone sensible : **oui** (export : données de mineurs qui sortent de l'appareil ; injection de formules, `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

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
| Colonne Groupe d'un export filtré, pour une présence qui compte aussi pour l'autre groupe de la séance | Groupe filtré seul ; tous les groupes de la présence | Groupe filtré seul (« Tous les groupes » : « A, B ») | Le fichier filtré parle d'un seul groupe ; rien de plus ne sort de l'appareil | à relire |
| Ordre des groupes joints « A, B » | Ordre SQL ; Collator français | Collator français (`sensitivity: 'base'`) | Ordre stable, comme à l'écran | à relire |
| Créneau dont le nom n'est fait que d'espaces | Gardé tel quel ; traité comme sans nom | Traité comme sans nom : jour de la date et heure de la séance | Cellule vide inutile dans le tableur | à relire |
| Tri dans une séance | — | `byName` de `statsSql.ts` (nom, puis prénom, Collator français) ; à nom égal, ordre des identifiants des membres (tri stable) | Même ordre que les statistiques | à relire |
| `groups(period)` | Requête propre ; liste des statistiques | `statsRepo.overview(period).groups` (une requête), réduits à `groupId`, `name`, `archived` | « Ceux des statistiques de la période » : même liste et même ordre, sans seconde règle à tenir | à relire |
| Groupe ou période invalides | — | Identifiant de groupe ou de saison invalide : `DataError('NOT_FOUND')` ; groupe inexistant : 0 ligne ; période revalidée par `customPeriod` | Comme `statsRepo` ; erreurs sans donnée (ABS-04) | à relire |
| Lignes SQL d'une présence comptée pour deux groupes | `group_concat` ; une ligne SQL par groupe | Une ligne SQL par groupe, regroupées en une ligne d'export par le dépôt | `group_concat` n'a pas d'ordre garanti et son séparateur peut figurer dans un nom | à relire |
| Test NF-08 | Dans le test du dépôt ; fichier séparé | `src/data/attendanceExportVolume.test.ts` (8 fichiers au total) | Le test du dépôt approchait les 300 lignes | à relire |
| Colonne Créneau d'une séance sans créneau (`slot_id` NULL) | « Sans créneau » ; « Sans créneau » et l'heure | « Sans créneau 18:00 » (heure de la séance) ; `noSlot` devient une fonction de l'heure dans `stats.csv` | Deux appels sans créneau le même jour restent distincts (revue) | changée après contradiction |
| Libellé du jour manquant | `?? ''` ; erreur | `weekdays` typé en tuple de 7 ; libellé absent : `Error('Libellé du jour manquant')`, sans donnée | Pas de cellule tronquée en silence ; ABS-04 (revue) | changée après contradiction |
| SEC-07 : caractère de formule après un séparateur suivi d'espaces ou d'invisibles (« A, -B ») | Juste après le séparateur ; après les espaces et invisibles aussi | Les espaces et invisibles sont sautés, comme en tête de cellule : « A, '-B » | Même règle en tête et après un séparateur ; « , =1 » s'ouvre aussi comme une formule après découpage | à relire |
| SEC-07 : cellule qui commence par une tabulation suivie d'un caractère de formule (« \t=1 ») | — | Deux apostrophes : « '\t'=1 » (règle de tête et règle du séparateur, appliquées l'une après l'autre) | Cas sans usage réel ; inoffensif | à relire |

## Questions pour le porteur

**Q1 — SEC-07 appliquée à toute cellule (cas réservé : sécurité).** Décidée par le porteur le 2026-11-28 : toute cellule, en-tête compris, avec la règle élargie (premier caractère visible, caractère de formule après `,`, `;` ou tabulation, guillemets dès qu'une virgule ou une tabulation figure dans la cellule). Appliquée. Texte d'origine : le plan validé dit « champs texte seulement (nom, prénom, groupe, créneau), pas la date ni le statut ». `toCsv` neutralise aujourd'hui toute cellule, en-tête compris. Le fichier produit est identique, car les dates (`JJ/MM/AAAA`), les statuts et l'en-tête ne commencent jamais par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot. Options :

1. **Toute cellule (recommandé, appliqué)** : une colonne ajoutée plus tard ne peut pas oublier la neutralisation ; `toCsv` reste simple (aucune liste de colonnes).
2. Champs texte seulement, à la lettre : `toCsv` reçoit la liste des colonnes à neutraliser.

Facile à défaire (une ligne dans `csvWrite.ts` et un test).

**Q2 — Présence d'une séance à deux groupes dont l'un est supprimé (cas réservé : règle RM-03, données personnelles, schéma).** Décision du porteur : une présence dont le groupe est supprimé devient « Sans groupe » et ne sort jamais d'un export filtré. Avec la règle actuelle (`credits`), elle passe au groupe restant : supprimer Vétérans fait sortir Paul (inscrit aux seuls Vétérans) dans l'export Benjamins (test « RM-03 Q2 » de `attendanceExportRepo.test.ts`, qui fixe le comportement actuel). **Les statistiques du jalon 2 ont le même défaut** : le même test montre le retard de Paul compté pour Benjamins dans `statsRepo.overview`.

Ce n'est pas faisable dans la seule requête de l'export : la base ne garde aucune trace du groupe supprimé. Supprimer un groupe efface sa ligne de `session_groups` et aussi les inscriptions du membre à ce groupe (`ON DELETE CASCADE`). La séance ressemble alors à une séance d'un seul groupe, et le membre n'a plus d'inscription à « un autre groupe de la saison » : l'heuristique proposée à la revue ne repère donc pas le cas (Paul, comme Léa dans l'exemple, n'a plus aucune inscription dans la saison). Options :

1. **Garder une trace dans le schéma (recommandé)** : par exemple, `sessions.group_count` figé à l'enregistrement de l'appel, ou une ligne de `session_groups` gardée avec `group_id` NULL (`ON DELETE SET NULL`). Le repli « un seul groupe » ne vaut que si la séance n'a jamais eu qu'un groupe ; la règle est corrigée dans `statsSql.ts`, pour les statistiques et l'export à la fois. Migration, et les séances déjà enregistrées restent dans l'état actuel (aucune trace à reconstituer). Ticket à part.
2. Heuristique sans schéma, dans `statsSql.ts` : le repli ne vaut que si le membre a eu, à une date quelconque, une inscription au groupe restant (Nour, inscription terminée, reste compté pour Benjamins ; Paul devient « Sans groupe »). Change RM-03 pour un membre jamais inscrit au groupe d'une séance d'un seul groupe (il devient « Sans groupe » et sort des statistiques du groupe).
3. Même heuristique dans l'export seul : l'export et les statistiques ne comptent plus pareil.
4. Garder la règle actuelle et l'écrire comme limite connue.

Statut : le 036 attend la réponse à Q2 ; le reste est terminé.

## À reporter

- CHANGELOG : rien (visible au 037).
- Architecture : `src/domain/csvWrite.ts` (`toCsv` : `;`, BOM, CRLF, SEC-07), `src/domain/attendanceCsv.ts` (lignes du CSV des présences, textes reçus en paramètre), `src/data/attendanceExportRepo.ts` (`rows`, `count`, `groups` ; une requête chacune, RM-03 par `credits` de `statsSql.ts`).
- SECURITE : nouveau texte de SEC-07 (décision du porteur du 2026-11-28) : « Toute cellule d'un CSV exporté, en-tête compris, est neutralisée par le préfixe `'` si elle commence par une tabulation ou un retour chariot, ou si son premier caractère visible (après les espaces, espace insécable compris, et les caractères invisibles U+200B à U+200F, U+2060, U+FEFF, U+061C, U+202A à U+202E, U+2066 à U+2069) est `=`, `+`, `-` ou `@`. Un caractère de formule placé après une virgule, un point-virgule ou une tabulation de la cellule (espaces et invisibles sautés) est précédé de `'`. Une cellule qui contient `;`, `,`, `"`, une tabulation, un CR ou un LF est mise entre guillemets. Limite : un réenregistrement du fichier par Excel retire la protection. »
- SECURITE : SEC-07, colonne Vérification : `src/domain/csvWrite.test.ts`, `src/domain/attendanceCsv.test.ts` et l'aller-retour piégé de `src/data/attendanceExportRepo.test.ts`.
- Décisions : les lignes du tableau « Décisions » ci-dessus, à recopier en bas de `docs/DECISIONS.md` ; Q1 décidée par le porteur le 2026-11-28 ; Q2 dans `docs/QUESTIONS.md`.
- Pour le 037 : mesurer la mémoire sur l'A55 avec `volumeSeed` (120 000 lignes, pic estimé entre 100 et 200 Mo) et prévoir un plafond de lignes si besoin.
- Limite : dans « A, B », un nom de groupe qui contient une virgule ne se distingue pas du séparateur à la lecture.
- `groups()` passe par la requête `OVERVIEW` des statistiques : durée à mesurer sur l'appareil.
- Mesures NF-08 (`attendanceExportVolume.test.ts`, poste local) : les trois cas passent en 1,7 s au total, 120 000 lignes comprises.
- CONFORMITE (à l'intégration) : §2.2, pour répondre au droit d'accès d'une famille, l'encadrant filtre l'enfant dans le tableur avant d'envoyer le fichier (décision du porteur du 2026-11-28, EX-31 inchangée).
