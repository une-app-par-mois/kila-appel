# 014 — Sauvegarde et restauration : données

Statut : fait (PR #63 vers `main` ; PR #39, relu et accepté par le porteur le 2026-11-27) · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/data/backup.ts`, `src/data/settingsRepo.ts` et leurs tests, `src/staticChecks.test.ts` si besoin

Découpé le 2026-11-27 (décision du porteur) : 014 données, 014b écrans Sauvegarde et Restauration, 014c base illisible, 014d rappels.

## Contexte

L'unique chemin de récupération des données (EX-19 à EX-22) ; le bogue le plus grave de l'ancienne version était ici.

## À lire

- `docs/PRD.md` EX-19 à EX-22
- `docs/ARCHITECTURE.md` §4.3
- `docs/SECURITE.md` SEC-09, SEC-10
- Maquettes : Sauvegarde et données, Restauration, Invitation à sauvegarder, Base illisible

## Ce qui change

- `src/data/backup.ts` :
  - export : `VACUUM INTO ?` vers un chemin donné, avec la date de la sauvegarde écrite dans la copie ;
  - vérification d'un fichier, sur la copie et avant tout remplacement : en-tête « SQLite format 3 » et taille plafonnée, `integrity_check`, `foreign_key_check`, schéma comparé exactement (tables, index, déclencheur ; rien de plus), `user_version` ≤ version de l'appli, migrations si la copie est plus ancienne, `slots.schedule_from` (le déclencheur est contourné, ticket 005) et chaque contact par `validateContact` (ticket 008) ;
  - résumé (membres, groupes, séances enregistrées, date de la sauvegarde) ;
  - restauration : **recopie en une seule transaction**. La copie vérifiée est attachée (`ATTACH`), les tables vidées puis recopiées ; un échec annule tout (décision du porteur du 2026-11-27, à la place de « fermée, remplacée, rouverte »).
- `src/data/settingsRepo.ts` : lecture et écriture de la table `settings` (date de la dernière sauvegarde, invitation vue, durée de conservation). C'est le seul dépôt des réglages, et 015b le réutilise.
- Aucune dépendance nouvelle : les chemins de fichiers sont passés en paramètre, et les tests utilisent `node:sqlite` avec des fichiers temporaires.

## Critères d'acceptation

- [x] Copie de la base vers un fichier, date de la sauvegarde comprise (EX-19)
- [x] Vérification avant tout remplacement ; un fichier invalide laisse les données intactes, avec une cause précise, dont « version plus récente » à part (EX-20, SEC-10)
- [x] Restauration identique, table par table (NF-04)
- [x] Réglages lus et écrits par `settingsRepo`

## Tests attendus

- Tests de données : sauvegarde puis restauration identique ; fichiers piégés produits à l'exécution (tronqué, texte, autre base SQLite, version future, déclencheur ou table en plus, `schedule_from` invalide, contact invalide) ; échec au milieu = comptes de lignes inchangés ; nom fictif supprimé absent des octets après une restauration

## Hors périmètre

- Écrans, partage et choix du fichier (014b), base illisible (014c), invitation et bandeau (014d), tout effacer et purge (015)

## Notes du ticket 007d (2026-11-26)

- ~~Après une restauration par copie de fichier, lancer un `VACUUM`~~ : sans objet depuis la décision du 2026-11-27 (recopie en transaction, les pages libérées sont effacées par `secure_delete`).
- L'écran de récupération (EX-22) ne traite pas `SECURE_DELETE_OFF` ni `FOREIGN_KEYS_OFF` comme une base abîmée à remplacer : ce sont des problèmes de configuration, le fichier est sain.

## Note du ticket 008 (2026-11-26)

- La base ne vérifie que le non-vide du téléphone d'un contact : la restauration valide chaque contact avec `validateContact` (nom obligatoire, téléphone français) avant d'écrire. Un numéro hors format s'affiche tel quel (`formatPhone`), sans faire planter l'écran.

## Questions prévues

Séance de lancement du 2026-11-27 (réponses du porteur) :
- découpage en 4 tickets ; plan de 014 données validé ;
- recopie en une transaction (ARCHITECTURE §4.3 corrigé) ;
- version plus récente que l'appli : cause à part, message « mettez l'appli à jour » (le texte vient en 014b et 014c).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Contrôle du fichier avant ouverture | En-tête seul ; en-tête et taille | En-tête « SQLite format 3\0 », taille de 512 octets à 50 Mio (`MAX_BACKUP_BYTES`) | Décision prévue par la pré-analyse ; 512 octets = plus petite page SQLite | à relire |
| Date de la sauvegarde | Fichier à part ; nom du fichier ; `settings` de la copie | `last_backup_at` écrit dans la copie seulement (ATTACH après `VACUUM INTO`), lu à la vérification ; absente = résumé sans date ; illisible = refus `INVALID_DATA` (réglages validés, voir plus bas) | Décision prévue ; une seule clé : après une restauration, « dernière sauvegarde » = date des données restaurées | changée après revue |
| L'export note-t-il la date dans la base de l'appareil ? | Oui, à l'export ; non, 014b la note une fois le fichier partagé | Non : `exportBackup` ne modifie pas la base de l'appareil | Un partage annulé ne doit pas faire croire à une sauvegarde (EX-21) | à relire |
| Fichier de destination déjà présent | Écraser ; refuser | Refusé (comportement de `VACUUM INTO`), fichier existant intact | Rien n'est écrasé sans que l'appelant l'ait voulu ; 014b choisit un chemin neuf | à relire |
| Résumé | — | Membres, groupes de toutes les saisons, séances `recorded`, date | Décision prévue ; maquette « Restaurer ? » | à relire |
| Réglages | — | `settingsRepo` : `last_backup_at`, `backup_invite_seen`, `retention_seasons` (3 par défaut, 1 à 3, `RETENTION_INVALID` sinon) ; valeur illisible en base = valeur par défaut ; restaurés avec la base | Décision prévue ; ABS-08 vérifiée : aucun champ personnel, politique et déclarations inchangées | à relire |
| Texte de `RETENTION_INVALID` (obligatoire : chaque code de saisie a son message) | — | « Choisissez de garder 1, 2 ou 3 saisons. » | Le sélecteur de 015b n'offre que ces valeurs ; message de secours | à relire |
| Causes d'un refus | Une seule ; plusieurs | `TOO_LARGE`, `NOT_SQLITE`, `DAMAGED` (ouverture, `integrity_check`, `foreign_key_check`, erreur SQLite), `NEWER_VERSION` (à part, décision du porteur), `NOT_A_BACKUP` (schéma différent, version 0), `INVALID_DATA` (contact, `schedule_from`) | Assez fin pour les messages de 014b et 014c, sans détail technique | à relire |
| Base en version 0 (vide ou étrangère) | La migrer ; la refuser | Refusée (`NOT_A_BACKUP`) | La migrer donnerait une sauvegarde vide qui effacerait tout | à relire |
| Ordre des contrôles | Ordre de la fiche ; version, schéma, puis intégrité | Taille et en-tête, ouverture, version, schéma exact, `integrity_check`, `foreign_key_check`, migrations, `checkRows`, résumé | Version avant schéma pour isoler `NEWER_VERSION` ; schéma avant `integrity_check`, qui évalue les `CHECK` du fichier : aucune expression inconnue n'est évaluée | à relire |
| `schedule_from` invalide | Compter sur `integrity_check` ; contrôle explicite | Les deux : `integrity_check` vérifie les `CHECK` (refus `DAMAGED`) ; `checkRows` le revérifie (`INVALID_DATA`) si une version de SQLite ne le faisait pas | Prévu par le plan ; ne dépend pas d'un comportement de SQLite | à relire |
| Lecture du fichier sans dépendance | Taille et en-tête passés en valeurs ; petite interface | Interface `BackupFiles` (`size`, `readHead`) et ouverture `OpenDb` passées par l'appelant ; node:fs et node:sqlite dans les tests, expo en 014b | Aucune dépendance (décision du porteur) ; même code testé et livré | à relire |
| Copie vérifiée | Copiée par `verifyBackup` ; copiée par l'appelant | `verifyBackup(fichier, copie, deps)` copie elle-même le fichier choisi (`BackupFiles.copy`) après le contrôle de taille et d'en-tête, recontrôle la copie, puis n'ouvre et ne migre que la copie ; le fichier choisi n'est jamais ouvert (octets inchangés, testé) ; `copyPath === sourcePath` est refusé dès le début (erreur `SAME_PATH`) ; un échec de `files.copy` donne `DAMAGED` | Contradicteur : l'appelant pouvait oublier la copie et faire migrer l'original | changée après contradiction |
| Liste des tables recopiées | Liste écrite dans le code ; lue dans le schéma de l'appli | Lue dans `main.sqlite_schema` et `pragma_table_info`, noms contrôlés (`[a-z_]`), `PRAGMA defer_foreign_keys` pour l'ordre | Aucune table oubliée si le schéma change ; le contrôle EX-14 (tables du brouillon nommées) reste inchangé | à relire |
| Erreur de restauration | Relayer l'erreur de SQLite ; un code | `DataError('RESTORE_FAILED')`, journal `RESTORE_FAILED` | ABS-04 : rien du fichier ne sort | à relire |
| Forme du journal | `RESTORE_REJECTED { reason }` ; code avec la cause | `RESTORE_REJECTED_<CAUSE>`, puis `RESTORE_VERIFIED { version }`, `RESTORE_DONE { memberCount }`, `BACKUP_EXPORTED` | `log` n'accepte que des nombres et des booléens (liste blanche SEC-12) : l'élargir toucherait à la sécurité | à relire |
| ATTACH et transaction | ATTACH dans la transaction ; avant | ATTACH avant (l'alias resté attaché est d'abord détaché, `pragma_database_list`), DETACH dans un `finally` dont l'échec est ignoré : l'erreur d'origine remonte telle quelle | Forme documentée par SQLite ; un DETACH raté ne bloque ni l'export ni la restauration suivants (revue de code) | changée après revue |
| Taille des fichiers (300 lignes) | Un fichier ; deux | `backup.ts` (export, restauration) et `backupCheck.ts` (vérification) | Lisibilité et limite de 300 lignes | à relire |
| Une restauration remplace l'appel en cours | — | Oui, comme toutes les tables (NF-04) | Décision prévue | à relire |
| Fichiers touchés au-delà de la liste | Découper ; garder | Gardé : `backupRows.ts` (règles des lignes) et les tests en quatre fichiers (`backup`, `backupExport`, `backupCheck`, `backupRows`) pour rester sous 300 lignes ; ajouts d'une ou deux lignes dans `errors.ts`, `validation.ts`, `libelles/commun.ts`, `node.d.ts` (`writeFileSync`, `copyFileSync`), `staticChecks.test.ts` ; fixture `__fixtures__/backupFiles.ts` | Ajouts mécaniques ; une seule session | à relire |
| Marque de `VerifiedBackup` | Facultative ; obligatoire | Obligatoire (`readonly [verifiedBrand]: true`, symbole non exporté), posée par conversion de type dans `verifyBackup` seulement ; test `@ts-expect-error` | Revue de code, revue de sécurité et contradicteur : un objet littéral passait | changée après contradiction |
| Copie modifiée entre la vérification et la restauration | Faire confiance ; recontrôler | Dans la transaction, avant d'écrire : schéma de la copie attachée identique à celui de la base (type, name, tbl_name, sql), même `user_version`, `checkRows` sur la copie attachée ; sinon `RESTORE_FAILED`, rien de changé | Revue de sécurité (SEC-10) | changée après revue |
| Règles des lignes (`checkRows`, `backupRows.ts`) | Contacts et `schedule_from` ; toutes les règles de l'appli ; seulement les lignes que l'appli écrirait | Seules passent les lignes que l'appli écrirait : sortie des validateurs égale à la valeur stockée (noms de saison, de membre, de groupe et de contact nettoyés, téléphone normalisé, commentaires nettoyés ; commentaire vide ou fait d'espaces refusé, l'appli écrit NULL) ; `isId` sur chaque colonne `id` et `*_id` (NULL seulement pour `slot_id`, EX-39), liste testée contre le schéma ; date de naissance bornée au `today` passé à `verifyBackup` (nouveau paramètre, gardé dans `VerifiedBackup` pour le recontrôle de la restauration) ; `slots.place` et `slots.name` nettoyés non vides ou NULL ; dates, heures, statuts, brouillon (`updated_at` `AAAA-MM-JJTHH:MM`, secondes tolérées), alertes, réglages (`isValidSetting`) ; toute ligne refusée = `INVALID_DATA` | Revues de sécurité : « toute entrée est validée », ABS-03 | changée après revue |
| Contrôle EX-14 (fichiers qui nomment les tables du brouillon) | Ne pas valider le brouillon ; ajouter `backupRows.ts` à la liste | `src/data/backupRows.ts` ajouté à la liste de `staticChecks.test.ts`, avec son motif | Il lit le brouillon pour le valider, jamais pour une statistique ; le contrôle garde son sens | à relire |
| Motif des noms SQL | `[a-z_]` ; `[a-z0-9_]` | `/^[a-z][a-z0-9_]*$/`, testé sur chaque table et colonne du schéma | Revue de code | changée après revue |
| Fermeture de la copie | Erreur relayée ; ignorée | `close()` de la copie et de la base en mémoire : erreur ignorée | Une fermeture ratée ne change ni le résultat ni la cause (revue de code) | changée après revue |

## Questions pour le porteur

Répondues à la séance de clôture du 2026-11-27 : fichiers hors du plan acceptés (`backupCheck.ts`, `backupRows.ts`, tests découpés) ; ajout de `src/data/backupRows.ts` à la liste du contrôle EX-14 accepté.

- Ajout de `src/data/backupRows.ts` à la liste du contrôle EX-14 (lecture des tables du brouillon pour les valider) — ticket en attente ; revue de sécurité : borné et justifié. Options : 1. garder l'ajout (recommandé : `backupRows.ts` n'exporte que `BACKUP_ALIAS` et `checkRows`, qui ne renvoie que `INVALID_DATA` ou `null`) ; 2. ne pas valider les tables du brouillon dans une sauvegarde.

## À reporter

- CHANGELOG : Sauvegarde et restauration des données : copie datée de la base, vérification du fichier avant tout remplacement (cause précise, dont « version plus récente »), restauration en une seule transaction ; réglages de l'appli (EX-19, EX-20, NF-04 ; ticket 014).
- Architecture (§4.3) : `src/data/backup.ts` (`exportBackup` : `VACUUM INTO ?`, puis `last_backup_at` écrit dans la copie attachée ; `restoreBackup` : ATTACH de la copie vérifiée, dans une transaction recontrôle du schéma, de la version et des lignes, puis tables vidées et recopiées, `defer_foreign_keys`, DETACH) ; `src/data/backupCheck.ts` (`verifyBackup(fichier, copie)` : taille ≤ 50 Mio et en-tête, copie, version, schéma exact, `integrity_check`, `foreign_key_check`, migrations, règles des lignes, résumé ; causes `RejectReason`) ; `src/data/backupRows.ts` (`checkRows` : toutes les règles de l'appli sur chaque ligne) ; `src/data/settingsRepo.ts`, seul dépôt des réglages. Le fichier est lu par l'interface `BackupFiles` et la copie ouverte par `OpenDb`, fournies par l'appelant.
- Adaptateur expo (`src/data/expoDb.ts`, pour 014b, non modifié ici) : `openExpoDb(name)` n'ouvre que la base de l'appli. 014b doit pouvoir ouvrir la copie par son chemin (`openDatabaseAsync(nom, options, dossier)`) et une base `':memory:'` (schéma attendu). Les chemins passés à `VACUUM INTO` et `ATTACH` doivent être des chemins du système de fichiers, sans le préfixe `file://` des URI d'expo-file-system. `VACUUM INTO` et `ATTACH` n'ont été essayés qu'avec node:sqlite (SQLite 3.51.3), pas avec expo-sqlite.
- Contrat de l'appelant (014b) :
  - `OpenDb` ouvre la copie **telle quelle**, sans `prepareDatabase` ni migrations (sinon une base en version 0 serait migrée puis acceptée) ; 014b ajoute un test de bout en bout qui attend `NOT_A_BACKUP` sur un fichier en version 0 ;
  - `BackupFiles.copy(from, to)` copie octet pour octet vers un chemin temporaire neuf ;
  - si l'export échoue après `VACUUM INTO`, l'appelant supprime le fichier ; il utilise un chemin neuf à chaque essai ;
  - l'appelant efface la copie temporaire et ses fichiers `-wal`, `-shm` et `-journal` dans un `finally` qui couvre la vérification et la restauration ; la copie se fait dans le dossier cache, exclu de la sauvegarde du système, avec un nom unique à chaque fois ; un test du 014b le vérifie ;
  - `verifyBackup` reçoit `today` (AAAA-MM-JJ, date locale) : borne de la date de naissance ; un chemin de copie égal au fichier choisi est refusé (`SAME_PATH`).
- Pour le porteur et 014b :
  - l'export n'est pas plafonné, alors qu'une base de plus de 50 Mio donnerait une sauvegarde refusée à la restauration ;
  - un fichier tronqué à moins de 512 octets est annoncé « pas une sauvegarde » (`NOT_SQLITE`), pas « abîmé » ;
  - un `validateContact` (ou tout validateur) plus strict à l'avenir rendrait d'anciennes sauvegardes impossibles à restaurer (`INVALID_DATA`).
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
