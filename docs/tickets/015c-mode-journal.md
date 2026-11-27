# 015c — Mode de journal de la base fixé à l'ouverture

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/data/open.ts` et son test

Décidé par le porteur le 2026-11-27 (séance de clôture du lot 013-014-015).

## Contexte

`secure_delete` n'efface vraiment les valeurs supprimées du fichier que si la base n'est pas en mode WAL (sinon d'anciennes trames restent dans `-wal` jusqu'au prochain checkpoint). expo-sqlite n'active pas le WAL dans son code natif (vérifié dans `node_modules/expo-sqlite`), mais rien ne fixe ce mode (ABS-05, SEC-11).

## À lire

- `docs/SECURITE.md` SEC-11 ; ticket 007d (limites du journal de transaction)

## Ce qui change

- `src/data/open.ts` : `PRAGMA journal_mode = DELETE` à l'ouverture, puis vérifié comme `secure_delete` ; refus d'ouvrir sinon (cause à part, comme `SECURE_DELETE_OFF`)

## Critères d'acceptation

- [ ] Mode de journal fixé à `delete` et vérifié à chaque ouverture (SEC-11)

## Tests attendus

- Test de données : mode lu après ouverture ; base ouverte en WAL ramenée à `delete` ; refus si le mode ne peut pas être fixé

## Hors périmètre

- Écran de récupération (014c), qui traitera la cause comme `SECURE_DELETE_OFF`

## Questions prévues

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
