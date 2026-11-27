# 014 — Sauvegarde et restauration : données

Statut : codé, à relire (branche `ticket/014-sauvegarde-donnees`) · Jalon : 1 · Zone sensible : oui · Trivial : non

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
| Date de la sauvegarde | Fichier à part ; nom du fichier ; `settings` de la copie | `last_backup_at` écrit dans la copie seulement (ATTACH après `VACUUM INTO`), lu à la vérification ; illisible = résumé sans date | Décision prévue ; une seule clé : après une restauration, « dernière sauvegarde » = date des données restaurées | à relire |
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
| Copie vérifiée | Copiée par `verifyBackup` ; copiée par l'appelant | L'appelant (014b) copie le fichier choisi ; `verifyBackup` reçoit le chemin de la copie, qu'il peut migrer | Pas de système de fichiers dans ce ticket | à relire |
| Liste des tables recopiées | Liste écrite dans le code ; lue dans le schéma de l'appli | Lue dans `main.sqlite_schema` et `pragma_table_info`, noms contrôlés (`[a-z_]`), `PRAGMA defer_foreign_keys` pour l'ordre | Aucune table oubliée si le schéma change ; le contrôle EX-14 (tables du brouillon nommées) reste inchangé | à relire |
| Erreur de restauration | Relayer l'erreur de SQLite ; un code | `DataError('RESTORE_FAILED')`, journal `RESTORE_FAILED` | ABS-04 : rien du fichier ne sort | à relire |
| Forme du journal | `RESTORE_REJECTED { reason }` ; code avec la cause | `RESTORE_REJECTED_<CAUSE>`, puis `RESTORE_VERIFIED { version }`, `RESTORE_DONE { memberCount }`, `BACKUP_EXPORTED` | `log` n'accepte que des nombres et des booléens (liste blanche SEC-12) : l'élargir toucherait à la sécurité | à relire |
| ATTACH et transaction | ATTACH dans la transaction ; avant | ATTACH avant, DETACH après, même en cas d'échec (échec du DETACH ignoré : la restauration suivante échoue sans rien toucher) | Forme documentée par SQLite | à relire |
| Taille des fichiers (300 lignes) | Un fichier ; deux | `backup.ts` (export, restauration) et `backupCheck.ts` (vérification) | Lisibilité et limite de 300 lignes | à relire |
| Une restauration remplace l'appel en cours | — | Oui, comme toutes les tables (NF-04) | Décision prévue | à relire |
| Fichiers touchés au-delà de la liste | Découper ; garder | Gardé : 12 fichiers, dont 4 d'une ou deux lignes (`errors.ts` : `RESTORE_FAILED` ; `validation.ts` : `RETENTION_INVALID` ; `libelles/commun.ts` : son message ; `node.d.ts` : `writeFileSync` des tests) et la fixture `__fixtures__/backupFiles.ts` | Ajouts mécaniques imposés par les types ; une seule session | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Sauvegarde et restauration des données : copie datée de la base, vérification du fichier avant tout remplacement (cause précise, dont « version plus récente »), restauration en une seule transaction ; réglages de l'appli (EX-19, EX-20, NF-04 ; ticket 014).
- Architecture (§4.3) : `src/data/backup.ts` (`exportBackup` : `VACUUM INTO ?`, puis `last_backup_at` écrit dans la copie attachée ; `restoreBackup` : ATTACH de la copie vérifiée, tables vidées puis recopiées en une transaction, `defer_foreign_keys`, DETACH) ; `src/data/backupCheck.ts` (`verifyBackup` : taille ≤ 50 Mio et en-tête, version, schéma exact, `integrity_check`, `foreign_key_check`, migrations, contacts et `schedule_from`, résumé ; causes `RejectReason`) ; `src/data/settingsRepo.ts`, seul dépôt des réglages. Le fichier est lu par l'interface `BackupFiles` et la copie ouverte par `OpenDb`, fournies par l'appelant.
- Adaptateur expo (`src/data/expoDb.ts`, pour 014b, non modifié ici) : `openExpoDb(name)` n'ouvre que la base de l'appli. 014b doit pouvoir ouvrir la copie par son chemin (`openDatabaseAsync(nom, options, dossier)`) et une base `':memory:'` (schéma attendu). Les chemins passés à `VACUUM INTO` et `ATTACH` doivent être des chemins du système de fichiers, sans le préfixe `file://` des URI d'expo-file-system. `VACUUM INTO` et `ATTACH` n'ont été essayés qu'avec node:sqlite (SQLite 3.51.3), pas avec expo-sqlite.
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
