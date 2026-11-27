# 014c — Base illisible au démarrage

Statut : à faire · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

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

- [ ] Base illisible : écran de récupération, jamais de plantage (EX-22)
- [ ] « Repartir de zéro » demande une confirmation
- [ ] Version plus récente que l'appli : message « mettez l'appli à jour », sans « Repartir de zéro » mis en avant
- [ ] `SECURE_DELETE_OFF`, `FOREIGN_KEYS_OFF` et `JOURNAL_MODE_OFF` (ticket 015c) : écran d'erreur avec « Réessayer », sans action destructrice
- [ ] Au démarrage de l'appli (layout racine), jamais pendant une opération (`fileLock`) : `cache/sauvegardes/`, `cache/restauration/`, `cache/DocumentPicker/` et, sur iOS, `tmp/com.jitavision.kila-Inbox/` vidés (arrêt brutal pendant un partage ou une restauration ; revues de sécurité du 014b et du 014e) ; `expoStorage(…).clear()` et `expoPicker(Platform.OS).clearPicked()` existent

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

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
