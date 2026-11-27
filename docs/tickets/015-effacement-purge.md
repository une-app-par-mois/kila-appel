# 015 — Tout effacer et purge : données

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/data/eraseAll.ts`, `src/data/purge.ts` et leurs tests

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

- [ ] Tout effacer vide la base et les réglages (EX-23, SEC-11)
- [ ] Purge des saisons au-delà de la durée, jamais la saison active, et des membres qui ne figurent plus dans aucune saison gardée (EX-24)
- [ ] Ce que la purge effacera est compté avant (pour la confirmation de 015b)

## Tests attendus

- Tests de données : comptes de lignes avant et après, dans chaque table ; liste de `eraseAll` comparée aux tables de la migration ; nom fictif absent des octets du fichier ; saison active jamais purgée, même la plus ancienne ; membre jamais inscrit gardé, membre inscrit dans une saison gardée gardé

## Hors périmètre

- Écrans, réglage de conservation, double confirmation (015b)

## Questions prévues

Séance de lancement du 2026-11-27 (réponses du porteur) : découpage en 015 données et 015b écrans ; plan validé ; purge des membres sans saison gardée (maquette ; SEC-11, ARCHITECTURE et CONFORMITE mis à jour à la séance) ; conservation de 1 à 3 saisons (015b).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
