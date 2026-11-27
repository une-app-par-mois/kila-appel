# 008 — Contacts d'urgence : données

Statut : fait (PR #63 vers `main`) · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-26 (décision du porteur) : les écrans sont au ticket 008b.

## Contexte

Contacts d'urgence d'un membre (EX-05) et recherche rapide (EX-06) : la couche de données.

## À lire

- `docs/PRD.md` EX-05, EX-06 ; `docs/CADRAGE.md` (tableau des données) ; ABS-04

## Décisions du porteur (2026-11-26)

- Téléphone français seulement : 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres ; enregistré sur 10 chiffres, affiché « 06 00 00 00 01 ».
- « Qui est-ce ? » (le nom du contact) obligatoire.

## Ce qui change

- Dépôt `contactsRepo` : liste d'un membre dans l'ordre, créer (en dernier), modifier, supprimer, réordonner d'un bloc
- Recherche par nom ou prénom du membre (sans accents ni casse) : membres courants, leurs groupes de la saison active et leurs contacts
- Validation du contact ; format d'affichage du téléphone

## Critères d'acceptation

- [x] Zéro, un ou plusieurs contacts, nom et téléphone obligatoires, ordre choisi (EX-05)
- [x] Téléphone refusé hors format français, sans jamais l'écrire dans un journal ni un message (ABS-04)
- [x] Recherche : un membre et ses contacts en une requête (EX-06)

## Tests attendus

- Tests de données sur `node:sqlite` ; tests du domaine (validation, format)

## Hors périmètre

- Écrans (008b) ; notifications (F-06)
