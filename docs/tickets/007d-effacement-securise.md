# 007d — Effacement des données supprimées dans le fichier

Statut : en cours · Jalon : 1 · Zone sensible : oui (effacement) · Trivial : non

Ajouté le 2026-11-26 (décision du porteur), après la revue de sécurité du ticket 007.

## Contexte

Après un `DELETE`, SQLite laisse les anciennes valeurs dans les pages libérées du fichier, jusqu'à leur réécriture : un membre supprimé restait lisible dans une copie brute du fichier (ABS-05).

## Ce qui change

- `src/data/open.ts` : `PRAGMA secure_delete = ON` à chaque ouverture, vérifié comme les clés étrangères
- `docs/SECURITE.md` SEC-11 : effacement dans le fichier

## Critères d'acceptation

- [x] Après la suppression d'un membre, son nom ne se trouve plus dans le fichier de base
- [x] L'ouverture échoue si le réglage n'a pas pris

## Tests attendus

- Test sur un fichier `node:sqlite` : nom fictif absent des octets du fichier après suppression

## Limites connues (revues du 2026-11-26)

- **Journal de transaction** (`kila.db-journal`, mode DELETE par défaut, pas de WAL) : avant une suppression, SQLite y copie la page d'origine, puis efface ce fichier sans l'écraser. Le reste n'est lisible que dans le stockage privé de l'appli, chiffré par Android et iOS. `TRUNCATE` ou `PERSIST` n'y changeraient rien.
- **Pages libérées avant ce ticket** : `secure_delete` ne nettoie que les suppressions suivantes. Aucune version n'est publiée, donc aucune base d'utilisateur n'est concernée ; l'APK de test du porteur ne contient que des données fictives.
- Copies faites par le système : sauvegarde Android désactivée (`allowBackup` false).

## Hors périmètre

- Restauration d'une sauvegarde (ticket 014) : voir la note de ce ticket
