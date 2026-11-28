# 014c — Base illisible au démarrage

Statut : fait (PR #63 vers `main` ; PR #51, 2026-11-27 ; base abîmée réelle pas encore essayée sur l'A55) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

Dépend de : 014, 014b, 014e, 015c · Fichiers touchés : `src/data/open.ts`, `src/data/expoDb.ts` (`deleteAppDatabase`), `src/hooks/useDatabase.ts`, `src/hooks/fileLock.ts` (tâche `'cleanup'`), `src/app/_layout.tsx`, `src/ui/Recovery.tsx`, `src/config/libelles/recuperation.ts` (et `index.ts`), `scripts/maquettes.mjs`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014, puis en 014c et 014f (restaurer depuis l'écran de récupération) le même jour.

## Contexte

Une base illisible au démarrage mène à un écran de récupération, jamais à un plantage (EX-22).

## À lire

- Maquette : Base illisible
- Notes du ticket 007d dans le ticket 014

## Ce qui change

- Détection à l'ouverture (`open.ts`) : lecture d'essai de `sqlite_schema`, puis `PRAGMA quick_check`, avant les réglages ; échec ou erreur non reconnue = cause `DATABASE_DAMAGED` ; classement pur : réglages refusés (`FOREIGN_KEYS_OFF`, `SECURE_DELETE_OFF`, `JOURNAL_MODE_OFF`) / version plus récente / abîmée
- `useDatabase` : signature inchangée ; état partagé (ouverture, prête, échec et cause), `retryDatabase()`, `resetDatabase()` (fichier supprimé par `deleteDatabaseAsync`, avec `-journal`, `-wal`, `-shm`, puis base neuve)
- Layout racine : écran de récupération à la place de la pile en cas d'échec ; nettoyage des dossiers temporaires une fois au démarrage, sous le verrou commun
- Écran de récupération : trois variantes (ci-dessous) ; le bouton « Restaurer une sauvegarde » de la variante abîmée arrive avec 014f

## Critères d'acceptation

- [x] Base illisible : écran de récupération, jamais de plantage (EX-22) — vérifié par les tests ; pas encore sur l'A55 avec une base réellement abîmée
- [x] « Repartir de zéro » demande une confirmation
- [x] Version plus récente que l'appli : message « mettez l'appli à jour », sans « Repartir de zéro » mis en avant
- [x] `SECURE_DELETE_OFF`, `FOREIGN_KEYS_OFF` et `JOURNAL_MODE_OFF` (ticket 015c) : écran d'erreur avec « Réessayer », sans action destructrice
- [x] Au démarrage de l'appli (layout racine), jamais pendant une opération (`fileLock`) : `cache/sauvegardes/`, `cache/restauration/`, `cache/DocumentPicker/` et, sur iOS, `tmp/com.jitavision.kila-Inbox/` vidés (arrêt brutal pendant un partage ou une restauration ; revues de sécurité du 014b et du 014e) ; `expoStorage(…).clear()` et `expoPicker(Platform.OS).clearPicked()` existent

## Tests attendus

- Tests de données : fichier texte, fichier tronqué, page corrompue, version future, réglage refusé simulé, aucun nom dans le journal ; tests d'écran : chaque cause donne sa variante, Réessayer rouvre, Repartir de zéro seulement après confirmation puis Bienvenue ; nettoyage au démarrage sauté pendant une opération ; à la main sur l'A55 : base volontairement abîmée (APK de debug, `run-as`)

## Hors périmètre

- Restaurer depuis l'écran de récupération (014f) ; rappels (014d)

## Questions prévues

Séance du 2026-11-27 : « Repartir de zéro » confirmé (« Les données abîmées seront effacées définitivement. »), maquette annotée ; version plus récente : message à part.

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur :
  - découpage en 014c et 014f ;
  - détection : lecture d'essai + `quick_check` ; toute erreur non reconnue mène à l'écran « abîmée » (un fichier illisible n'est plus pris pour `JOURNAL_MODE_OFF`) ;
  - « Repartir de zéro » : suppression du fichier par expo-sqlite, puis base neuve ; limite ajoutée à SEC-11 (octets non écrasés, dans le stockage privé chiffré par le système) ;
  - version plus récente : le message seul (« Vos données viennent d'une version plus récente de l'appli : mettez l'appli à jour. Rien n'a été effacé. »), sans aucune action ;
  - maquette : une seule, trois variantes annotées — abîmée (actuelle), réglage refusé (« L'appli n'a pas pu préparer le fichier de données. Rien n'a été effacé. » et « Réessayer »), version plus récente (message seul) ;
  - plan validé.
- Réponses du porteur après les revues (2026-11-27) :
  1. « abîmée » seulement si le fichier est illisible (échec de la lecture d'essai reconnu comme `SQLITE_CORRUPT` ou `SQLITE_NOTADB`, ou `quick_check` différent de `ok`) ; toute autre erreur (ouverture, migration, réglage qui lève une exception, erreur passagère pendant la lecture d'essai) garde le fichier et montre la variante « réglage refusé » avec « Réessayer » ; « Réessayer » aussi dans la variante abîmée, au-dessus de « Repartir de zéro » ;
  2. effacement en échec : « L'effacement n'a pas abouti. Réessayez. » sous les boutons ; `kila.db` déjà absent = effacement réussi, base neuve ;
  3. texte « Vous pouvez restaurer… » gardé tel quel jusqu'au 014f ;
  4. textes de la confirmation validés ; annotation de la maquette séparée en « Réponses du porteur » et « Décisions automatiques ».

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| « Restaurer une sauvegarde » avant le 014f | Pas de bouton ; emplacement sans action | Pas de bouton ; textes de la maquette gardés tels quels (« Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro. ») ; « Repartir de zéro » reste secondaire, comme dans la maquette | Un bouton sans action trompe ; le texte reste vrai : après « Repartir de zéro », la restauration se fait depuis Paramètres › Sauvegarde ; le 014f ajoute le bouton | validée par le porteur (réponse 3) |
| Titre des variantes « réglage refusé » et « plus récente » | Titre de la maquette ; titre propre à chacune | Même titre pour les trois : « Vos données ne peuvent pas être ouvertes » | Maquette unique à trois variantes (réponse du porteur) ; seul le message change | à relire |
| Échec de l'ouverture du fichier (`open()` lui-même) ou des migrations | Cause à part ; « abîmée » | ~~« Abîmée »~~ → cause `unavailable` (`DATABASE_UNAVAILABLE`, code `DB_OPEN_UNAVAILABLE`), qui partage l'écran « réglage refusé » | Changée après la réponse 1 du porteur ; une cause à part garde un code du journal distinct de `settings` | changée (réponse du porteur) |
| Reconnaître une corruption | Message ; code ; les deux | `isCorruption` : `errcode` de node:sqlite, ou « Error code N » d'expo-sqlite (code natif 58 relu, Android et iOS), primaire 11 ou 26 (octet bas : codes étendus compris), ou texte de SQLite (« database disk image is malformed », « file is not a database ») ; pas d'`instanceof Error` (erreur d'un autre contexte) | Les deux formats sont fixes dans le code relu ; le texte sert de filet. Limite : jamais vu sur l'appareil | à relire |
| Vidage des dossiers par `useRestore` (revue de sécurité) | Le supprimer ; le faire sous le verrou | Sous le verrou `'restore'` : au début de la restauration, avant le sélecteur, plus au montage | Garde le nettoyage même si le nettoyage au démarrage a échoué ; plus de vidage sans verrou | à relire |
| Bouton principal de la variante abîmée avant le 014f | « Réessayer » principal ; tous secondaires | « Réessayer » principal, « Repartir de zéro » secondaire ; avec le 014f, « Restaurer une sauvegarde » devient principal | Un seul bouton principal par écran (charte) ; l'action sûre en premier | à relire |
| Démarrage avant que la base soit prête | Pile montée (avant) ; vue neutre | Vue vide fond Papier ; pile montée quand la base est prête **et** le nettoyage fini (réussi, en échec ou sauté) | Revue de code : aucun écran (Export, Restauration) avant la fin du nettoyage | à relire |
| Fichier absent à l'effacement | Vérifier avant ; reconnaître l'erreur | Texte de `DatabaseNotFoundException` d'expo-sqlite (« Database … not found ») | expo-file-system n'est permis que dans `expoFiles.ts` ; le texte est fixe dans le code natif relu | à relire |
| Nouvel essai après un échec | À chaque nouveau montage (avant) ; seulement par « Réessayer » ou « Repartir de zéro » | Seulement par les boutons ; pendant l'essai, l'écran reste affiché, boutons désactivés (`pending`) | La pile n'apparaît pas un instant pour disparaître ; un double appui ne lance qu'un essai | à relire |
| Garde de `resetDatabase()` | Toute cause ; base abîmée seulement | Abîmée seulement : sans effet pour un réglage refusé, une erreur non reconnue ou une version plus récente | Le fichier est sain dans ces deux cas : jamais d'effacement (critères d'acceptation) | à relire |
| `quick_check` et `sqlite_schema` | Sans préfixe ; `main.` | `main.sqlite_schema` et `PRAGMA main.quick_check` | Sans `main.`, `quick_check` parcourt aussi la base `temp` et la crée (tests de sauvegarde en échec sinon) | à relire |
| Nettoyage au démarrage sauté (verrou pris) | Réessayer plus tard ; sauter pour ce processus | Sauté pour ce processus | L'opération en cours efface elle-même ses copies ; un nettoyage tardif pourrait tomber au milieu d'une autre | à relire |
| Un des trois dossiers ne se vide pas | Arrêter ; vider les autres | Les trois sont tentés ; un seul code `STARTUP_CLEANUP_FAILED` | Un échec sur l'Inbox d'iOS ne doit pas laisser les copies du cache | à relire |
| Lieu du nettoyage | Dans le layout ; hook à part | `src/hooks/useStartupCleanup.ts` (fichier non prévu par la fiche) | CONV-10 : les écrans passent par les hooks ; testable seul | à relire |
| Test existant `migrations.test.ts` (« clés étrangères restent inactives ») | Le garder tel quel ; laisser la lecture d'essai à la vraie base | Sa fausse base ne répond plus `foreign_keys: 0` qu'au pragma des clés étrangères | Elle répondait la même ligne à toute requête, donc la lecture d'essai la classait « abîmée » ; le contrôle testé ne change pas | à relire |

## Questions pour le porteur

Aucune en attente : la question sur l'échec de l'effacement a reçu sa réponse (réponse 2, appliquée).

## À reporter

- CHANGELOG : Base illisible au démarrage : écran de récupération au lieu d'un plantage, en trois variantes (base abîmée : « Réessayer », ou « Repartir de zéro » après confirmation, puis Bienvenue ; réglage refusé ou erreur passagère : « Réessayer », rien n'est effacé ; version plus récente : « mettez l'appli à jour », sans action) ; dossiers temporaires des sauvegardes et restaurations vidés au démarrage (EX-22, SEC-10, SEC-11 ; ticket 014c).
- Architecture (§4.1, ouverture) : `prepareDatabase` commence par une lecture d'essai de `main.sqlite_schema` puis `PRAGMA main.quick_check` (refus `DATABASE_DAMAGED`), avant `foreign_keys`, `secure_delete` et le mode de journal ; `openAppDatabase` ferme la connexion à tout échec et lève une erreur au texte fixe ; `classifyOpenError` (pure) : `damaged` (lecture d'essai en erreur reconnue par `isCorruption`, ou `quick_check` différent de `ok`), `settings` (`FOREIGN_KEYS_OFF`, `SECURE_DELETE_OFF`, `JOURNAL_MODE_OFF`), `newer` (`UNKNOWN_VERSION`), `unavailable` (tout le reste, fichier gardé). `src/data/expoDb.ts` : `deleteAppDatabase()` (`deleteDatabaseAsync` d'expo-sqlite, avec `-journal`, `-wal`, `-shm`). `src/hooks/useDatabase.ts` : état partagé (`opening`, `ready`, `failed` avec cause et `pending`) lu par `useSyncExternalStore` (`useDatabaseState`), `retryDatabase()`, `resetDatabase()` (base abîmée seulement : suppression, puis base neuve) ; `useDatabase(): Db | null` inchangé. Layout racine : il lance l'ouverture, montre une vue neutre tant que la base n'est pas prête et que le nettoyage n'est pas fini, puis la pile ; `src/ui/Recovery.tsx` la remplace en cas d'échec (aucune navigation) ; `src/hooks/useStartupCleanup.ts` vide `cache/sauvegardes/`, `cache/restauration/` et les copies du sélecteur une fois par processus, sous le verrou commun (tâche `'cleanup'` de `src/hooks/fileLock.ts`). Libellés : `src/config/libelles/recuperation.ts`.
- Journal (codes seuls, ABS-04) : `DB_OPEN_DAMAGED`, `DB_OPEN_SETTINGS`, `DB_OPEN_NEWER`, `DB_OPEN_UNAVAILABLE` remplacent `DB_OPEN_FAILED` ; `DB_RESET_DONE`, `DB_RESET_FAILED`, `STARTUP_CLEANUP_FAILED`.
- SECURITE.md, SEC-11 (limites) : ajouter « « Repartir de zéro » (EX-22, ticket 014c) supprime le fichier de la base et ses fichiers `-journal`, `-wal`, `-shm` par expo-sqlite, sans écraser les octets : ils restent dans le stockage privé de l'appli, chiffré par le système, jusqu'à ce que le système réutilise la place (décision du porteur du 2026-11-27) ». Vérification : `src/hooks/useDatabase.test.tsx` (suppression seulement pour une base abîmée, avant la nouvelle ouverture), `src/appTests/recovery.test.tsx` (fichier effacé après confirmation seulement).
- SECURITE.md, SEC-10 : les copies laissées par un arrêt brutal (`cache/sauvegardes/`, `cache/restauration/`, `cache/DocumentPicker/`, et sur iOS `tmp/com.jitavision.kila-Inbox/`) sont effacées au démarrage suivant, hors opération en cours (`src/hooks/useStartupCleanup.test.tsx`).
- CONFORMITE et ABS-08 : aucune donnée nouvelle, aucune dépendance (`deleteDatabaseAsync` fait partie d'expo-sqlite, déjà installé) ; politique et déclarations inchangées, à confirmer à l'intégration.
- Pour 014f : bouton « Restaurer une sauvegarde » de la variante abîmée (`src/ui/Recovery.tsx`), à placer au-dessus de « Repartir de zéro » en bouton principal (maquette). La restauration devra ouvrir une base neuve d'abord : la base abîmée n'est pas ouverte.
- Pour 015b : `fileLock.ts` reçoit aussi `'cleanup'` ici (même ligne que `'erase'`) : conflit à résoudre en gardant les deux.
- Recette sur l'A55 : mesurer la durée de `quick_check` au démarrage avec une grosse base fictive (`quick_check` gardé à chaque démarrage, décision de l'intégration). Aucun écran ne peut s'ouvrir pendant le nettoyage : la pile attend sa fin.
- DECISIONS (taille du ticket) : 18 fichiers en comptant les tests, au-delà de la limite de 10 ; raison : le nettoyage au démarrage est prévu par les critères d'acceptation, et la moitié des fichiers sont des tests ; ticket non redécoupé.
- Restauration (`src/hooks/useRestore.ts`) : le vidage des dossiers se fait sous le verrou `'restore'`, au début de chaque restauration, et non plus au montage de l'écran (revue de sécurité du 014c). `useBackupExport.ts` vide encore son dossier au montage sans verrou (hors `'export'`) : à aligner sur un ticket à part si l'intégration le juge utile.
- À vérifier sur l'A55 (APK de debug) : base abîmée volontairement avec `run-as` (voir la PR), écran « abîmée », confirmation, puis Bienvenue ; fichier `kila.db` recréé.
- DECISIONS : les lignes de la section « Décisions » ci-dessus.
