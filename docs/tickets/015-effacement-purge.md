# 015 — Tout effacer et purge : données

Statut : fait (PR #63 vers `main` ; PR #37, relu et accepté par le porteur le 2026-11-27) · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/data/eraseAll.ts`, `src/data/purge.ts` et leurs tests ; `src/data/errors.ts` (trois codes)

Découpé le 2026-11-27 (décision du porteur) : 015 données, 015b écrans (Conservation, Tout effacer, Paramètres), après 014b.

## Contexte

Effacement réel et conservation bornée (EX-23, EX-24, ABS-05).

## À lire

- `docs/PRD.md` EX-23, EX-24
- Maquettes : Tout effacer, Purge des anciennes saisons

## Ce qui change

- `eraseAll(db)` : une seule transaction, `DELETE` sur une liste fixe des 16 tables (`settings` et l'appel en cours compris), schéma et `user_version` gardés
- Purge : `purgeCandidates(db, retention)` (saisons rangées par date de début décroissante, au-delà des N premières, **saison active toujours exclue**), `purgeImpact(db, ids)` (comptes, membres compris), `purge(db, ids)` (une transaction, saison active revérifiée dedans)
- **Membres effacés par la purge** (décision du porteur du 2026-11-27, maquette) : ceux qui ont une inscription ou une présence dans les saisons purgées et aucune dans les saisons gardées, archivés compris ; un membre jamais inscrit est gardé
- La durée de conservation est reçue en paramètre : sa lecture dans `settings` vient avec 015b (dépôt `settingsRepo` du 014)

## Critères d'acceptation

- [x] Tout effacer vide la base et les réglages (EX-23, SEC-11)
- [x] Purge des saisons au-delà de la durée, jamais la saison active, et des membres qui ne figurent plus dans aucune saison gardée (EX-24)
- [x] Ce que la purge effacera est compté avant (pour la confirmation de 015b)

## Tests attendus

- Tests de données : comptes de lignes avant et après, dans chaque table ; liste de `eraseAll` comparée aux tables de la migration ; nom fictif absent des octets du fichier ; saison active jamais purgée, même la plus ancienne ; membre jamais inscrit gardé, membre inscrit dans une saison gardée gardé

## Hors périmètre

- Écrans, réglage de conservation, double confirmation (015b)

## Questions prévues

Séance de lancement du 2026-11-27 (réponses du porteur) : découpage en 015 données et 015b écrans ; plan validé ; purge des membres sans saison gardée (maquette ; SEC-11, ARCHITECTURE et CONFORMITE mis à jour à la séance) ; conservation de 1 à 3 saisons (015b).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| `eraseAll` : comment vider la base ? | `DELETE` sur une liste fixe ; noms lus dans `sqlite_master` ; recréer le fichier | Une transaction, `DELETE` sur une liste fixe de 13 tables (les 3 du brouillon vidées par la cascade, voir plus bas), des filles aux mères ; schéma et `user_version` gardés ; pas de `VACUUM` | Décision prévue par la pré-analyse : requêtes statiques, `secure_delete` suffit (test des octets) | à relire |
| `purgeCandidates` : quelles saisons ? | Date de début ; date de fin ; date de création | Rangées comme `seasonsRepo.list` (début décroissant), au-delà des N premières ; une saison à venir compte parmi les gardées ; l'active jamais candidate | Décision prévue par la pré-analyse | à relire |
| `purgeImpact` : quels comptes ? | Requête propre ; somme des `deletionImpact` | Somme des `seasonsRepo.deletionImpact`, plus `seasons` (nombre de saisons) et `members` ; `rollCallDraft` vrai si une saison en a un | Décision prévue : pas de cascade dupliquée | à relire |
| `purge` : saison active visée ? | Erreur, rien d'effacé ; l'ignorer | `DataError('ACTIVE_SEASON')` levée dans la transaction, rien d'effacé ; saisons effacées par `seasonsRepo(tx).remove` | Décision prévue par la pré-analyse | à relire |
| `purge` : revérifier les candidates ? | Saison active seulement ; recalculer les candidates dans la transaction | `purge(db, ids, retention)` recalcule `purgeCandidates(tx, retention)` dans la transaction ; un identifiant absent (introuvable, ou plus au-delà de la durée) : `DataError('NOT_PURGEABLE')`, rien d'effacé ; `ACTIVE_SEASON` gardé si l'active est visée | Revue de code et revue de sécurité : la base peut changer entre la confirmation et la purge | changée après revue |
| `purgeImpact` : lectures cohérentes ? | Lectures séparées ; une transaction | Toutes les lectures dans une seule transaction | Revue : les comptes décrivent le même état de la base | changée après revue |
| Durée de conservation hors de 1 à 3 : quelle erreur ? | `InputError('RETENTION_INVALID')` ; `DataError('RETENTION_INVALID')` | `DataError` | Un code `InputError` exige un libellé dans `src/config/libelles/` (correspondance exhaustive) ; la valeur vient d'un choix fermé (015b), pas d'une saisie : une autre valeur est une erreur du code, sans texte à l'écran | à relire |
| Identifiants de saison invalides (non entiers, ≤ 0) | `NOT_FOUND` ; nouveau code | `DataError('NOT_FOUND')`, rien d'effacé ; doublons retirés | Comme une saison introuvable (`remove`) | à relire |
| Liste de saisons dans une requête | Paramètres `?` générés ; `json_each(?)` | Un seul paramètre JSON lu par `json_each` : SQL entièrement statique | Requête paramétrée sans SQL construit ; JSON intégré à SQLite (node:sqlite et expo-sqlite) | à relire |
| Membre visé par la purge | Inscription ou présence (réponse du porteur) ; y ajouter les statuts de l'appel en cours | Inscription ou présence seulement, comme la réponse du porteur ; un membre de l'appel en cours d'une saison gardée y est inscrit, donc gardé | Lire le brouillon ici aurait élargi la liste EX-14 des fichiers qui le nomment | à relire |
| `eraseAll.ts` nomme les tables du brouillon (contrôle EX-14 de `staticChecks`) | Ajouter le fichier à la liste autorisée ; vider l'appel en cours par la cascade depuis `seasons` | Vidées par la cascade depuis `seasons` (`roll_call_drafts.season_id ON DELETE CASCADE`, tables filles en cascade) ; contrôle EX-14 inchangé ; le test vérifie que chaque table lue dans `sqlite_master` est vide après, les trois du brouillon comprises | Contestée par le contradicteur : élargir la liste d'un contrôle n'était pas nécessaire | changée après contradiction |
| Journal | — | `ERASE_ALL_DONE` ; `PURGE_DONE` avec `seasonCount` et `memberCount` (ABS-04) | Décision prévue par la pré-analyse | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Données : tout effacer (`eraseAll`, 16 tables, une transaction) et purge des anciennes saisons (`purgeCandidates`, `purgeImpact`, `purge`), membres sans saison gardée compris (EX-23, EX-24, SEC-11).
- Pour 015b (en attente du porteur, remarque du contradicteur) : avec « Garder les N dernières saisons », une saison à venir encore vide compte parmi les gardées ; créer la saison suivante en juin fait donc proposer la purge d'une saison un an plus tôt. Options : (1) une saison à venir compte (plan validé, appliqué en attendant) ; (2) ne compter que les saisons commencées ; (3) ne compter qu'une saison à venir qui a une séance. **Réponse du porteur (2026-11-27) : (2)**, à faire dans 015b.
- Architecture : couche données, `src/data/eraseAll.ts` (liste fixe `ERASE_STATEMENTS`, à compléter à chaque nouvelle table : un test la compare au schéma) et `src/data/purge.ts` (saisons au-delà de la durée de conservation, saison active exclue et revérifiée dans la transaction ; cascades de `seasonsRepo.remove`). Codes `DataError` ajoutés : `ACTIVE_SEASON`, `RETENTION_INVALID`, `NOT_PURGEABLE`. `purge(db, ids, retention)` revérifie les candidates dans sa transaction ; l'appel en cours est vidé par la cascade depuis `seasons`.
