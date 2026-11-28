# 032b — Fiche membre : nom et prénom de 100 caractères au plus

Statut : à faire · Jalon : 3 · Zone sensible : non (formulaire ; la règle est posée et testée dans le domaine au 032) · Trivial : non

Dépend de : 032 (`validateMember`, codes `NAME_TOO_LONG` et `NAME_INVALID_CHAR`, messages dans `commun.ts`) · Fichiers touchés : `src/app/membres/nouveau.tsx`, `src/app/membres/[id].tsx`, `src/appTests/membersNameLength.test.tsx` (nouveau : `members.test.tsx` fait déjà 286 lignes) — 3 fichiers

Découpé le 2026-11-28 (réponses du porteur au découpage du jalon 3).

## Contexte

Décision du porteur du 2026-11-28 (SEC-06) : nom et prénom d'un membre de 100 caractères au plus, sans caractère de contrôle, **à l'import comme à la saisie dans l'appli**. Le 032 pose la règle dans `validateMember` ; ce ticket l'applique aux deux formulaires du membre (création et modification), pour que la saisie dise l'erreur avant l'enregistrement.

## À lire

- Ticket 032 (règle et messages) ; tickets 007, 007b (formulaires du membre)
- `docs/PRD.md` : EX-03, NF-06, NF-07 ; `docs/SECURITE.md` : SEC-06 (complétée à l'intégration du 032)
- `src/app/membres/nouveau.tsx` (fonction locale des erreurs), `src/app/membres/[id].tsx`, `src/ui/TextField.tsx`

## Ce qui change

- Les deux formulaires montrent sous le champ le message de `NAME_TOO_LONG` ou de `NAME_INVALID_CHAR`, comme `NAME_REQUIRED` aujourd'hui ; « Enregistrer » ne part pas tant qu'un champ est en erreur.
- `maxLength={100}` sur les champs Nom et Prénom (le clavier s'arrête à 100) ; le contrôle reste celui du domaine pour un texte collé.
- Un membre au nom plus long ne peut pas venir d'une sauvegarde : la restauration refuse en entier une sauvegarde dont un nom est hors de la règle (décision du porteur du 2026-11-28, ticket 032).

## Critères d'acceptation

- [ ] EX-03, SEC-06 : 101 caractères collés dans Nom → message, rien d'enregistré ; 100 caractères → enregistré (création et modification).
- [ ] SEC-06 : une tabulation collée dans Prénom → message, rien d'enregistré.
- [ ] NF-06 : message annoncé au lecteur d'écran, comme les autres erreurs du formulaire.

## Tests attendus

- `src/appTests/membersNameLength.test.tsx` : les trois cas, en création et en modification.

## Hors périmètre

- Contrainte en base (`CHECK` sur la longueur) : demanderait une migration (zone sensible, décision du porteur), non demandée.
- Noms de saison, de groupe et libellés de contact : inchangés.

## Questions prévues

- Aucune : règle décidée par le porteur le 2026-11-28.
- Décision automatique proposée : `maxLength` sur les champs en plus du contrôle (le clavier s'arrête, le collage est contrôlé).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Membres : nom et prénom limités à 100 caractères, sans caractère invisible, à la saisie comme à l'import (SEC-06).
- Architecture : rien.
