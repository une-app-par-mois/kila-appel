# 014 — Sauvegarde et restauration : données

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

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

- [ ] Copie de la base vers un fichier, date de la sauvegarde comprise (EX-19)
- [ ] Vérification avant tout remplacement ; un fichier invalide laisse les données intactes, avec une cause précise, dont « version plus récente » à part (EX-20, SEC-10)
- [ ] Restauration identique, table par table (NF-04)
- [ ] Réglages lus et écrits par `settingsRepo`

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

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
