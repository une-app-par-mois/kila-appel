# 014c — Base illisible au démarrage

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014, 014b, 014e, 015c · Fichiers touchés : `src/hooks/useDatabase.ts`, `src/data/open.ts`, `src/app/_layout.tsx`, `src/ui/Recovery.tsx`

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Une base illisible au démarrage mène à un écran de récupération, jamais à un plantage (EX-22).

## À lire

- Maquette : Base illisible
- Notes du ticket 007d dans le ticket 014

## Ce qui change

- État d'échec et réouverture dans `useDatabase` ; écran de récupération : restaurer une sauvegarde, repartir de zéro

## Critères d'acceptation

- [ ] Base illisible : écran de récupération, jamais de plantage (EX-22)
- [ ] « Repartir de zéro » demande une confirmation
- [ ] Version plus récente que l'appli : message « mettez l'appli à jour », sans « Repartir de zéro » mis en avant
- [ ] `SECURE_DELETE_OFF`, `FOREIGN_KEYS_OFF` et `JOURNAL_MODE_OFF` (ticket 015c) : écran d'erreur avec « Réessayer », sans action destructrice
- [ ] Au démarrage de l'appli (layout racine), jamais pendant une opération (`fileLock`) : `cache/sauvegardes/`, `cache/restauration/`, `cache/DocumentPicker/` et, sur iOS, `tmp/com.jitavision.kila-Inbox/` vidés (arrêt brutal pendant un partage ou une restauration ; revues de sécurité du 014b et du 014e) ; `expoStorage(…).clear()` et `expoPicker(Platform.OS).clearPicked()` existent

## Tests attendus

- Tests : base abîmée, version future, réglage SQLite refusé ; restauration depuis l'écran de récupération

## Hors périmètre

- Rappels (014d)

## Questions prévues

Séance du 2026-11-27 : « Repartir de zéro » confirmé (« Les données abîmées seront effacées définitivement. »), maquette annotée ; version plus récente : message à part.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
