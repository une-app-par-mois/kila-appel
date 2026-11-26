# 008 — Contacts d'urgence et recherche rapide

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Contacts d'urgence d'un membre (EX-05) et recherche depuis l'accueil (EX-06).

## À lire

- `docs/PRD.md` EX-05, EX-06
- Maquettes : Fiche membre, Contact d'urgence, Recherche d'un contact d'urgence

## Ce qui change

- Dépôt `emergency_contacts`
- Formulaire de contact, réordonnancement, recherche

## Critères d'acceptation

- [ ] Zéro, un ou plusieurs contacts, nom et téléphone obligatoires, ordre choisi (EX-05)
- [ ] Un appui sur le numéro ouvre l'appel téléphonique du système
- [ ] Contacts affichés en 2 appuis au plus après la saisie du nom (EX-06)

## Tests attendus

- Tests de données ; test d'écran de la recherche

## Hors périmètre

- Notifications (F-06)
