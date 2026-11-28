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

- Les deux formulaires montrent sous le champ le message de `NAME_TOO_LONG` ou de `NAME_INVALID_CHAR`, comme `NAME_REQUIRED` aujourd'hui ; « Enregistrer » reste actif mais n'enregistre pas tant qu'un champ est en erreur.
- Pas de `maxLength` sur Nom et Prénom (décision changée après contradiction, 2026-11-28) : `validateMemberName` contrôle chaque champ avant l'enregistrement.
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
- Décision automatique proposée : `maxLength` sur les champs en plus du contrôle (le clavier s'arrête, le collage est contrôlé). Changée après contradiction à la séance de lancement du lot J3-4 : pas de `maxLength` (voir « Décisions »).

Reporté du lot J3-1 (2026-11-28) :

- La limite du domaine compte en points de code (après `trim()`), alors que `maxLength={100}` de React Native compte en unités UTF-16 : un nom avec des émojis ou des caractères hors du plan de base est coupé par le clavier avant 100 points de code. Sans gravité (plus strict que le domaine, jamais plus permissif) ; sans objet depuis l'abandon de `maxLength` (lot J3-4), le test des 100 caractères reste en caractères du plan de base.
- Message de `NAME_INVALID_CHAR` : la liste des caractères refusés a été élargie à la relecture du 032 (U+061C, U+200B, U+200E, U+200F, U+FEFF, demi-caractères isolés ; U+200D accepté).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Limite dans les formulaires | `maxLength={100}` et contrôle ; contrôle seul | Contrôle seul, pas de `maxLength` (décision précédente « changée après contradiction ») | `maxLength` coupe un texte collé sans rien dire, le message n'apparaîtrait jamais, et il compte en unités UTF-16 | à relire |
| Moment du contrôle | À l'enregistrement par le dépôt ; avant, champ par champ | `validateMemberName` champ par champ avant l'enregistrement, message sous le champ | Message au bon endroit, rien d'écrit | à relire |
| Bouton « Enregistrer » | Désactivé ; actif | Actif ; l'appui montre l'erreur | Un bouton grisé n'explique rien | à relire |
| Fiche `[id].tsx`, enregistrement en quittant (`updateOnLeave`) | Enregistrer ; écarter | Un nom invalide est écarté aussi | Jamais d'écriture hors règle | à relire |
| Texte de `NAME_INVALID_CHAR` | Inchangé (« Retirez le caractère invisible… ») ; « Le nom contient un caractère invisible : effacez le champ et retapez le nom. » | Nouveau texte, dans `commun.ts` (changée après contradiction, 2026-11-28) | L'import a son propre libellé (`import.ts`) ; l'encadrant ne voit pas le caractère et ne peut pas le « retirer ». Texte repris par les groupes (044) | à relire |
| Fiche, champ quitté sans changement | Contrôler le nom quand même ; ne rien dire | Ne rien dire : `same` avant `memberNameError` | Un nom ancien de plus de 100 caractères ne doit pas afficher d'erreur tant qu'on ne le change pas | à relire |
| Fiche, date de naissance future non quittée, puis sortie de l'écran | Tout échoue (`DATE_IN_FUTURE`) ; écarter la date | Écarter la date, comme un nom invalide ; les autres champs valides sont enregistrés | Bogue déjà présent : le prénom valide était perdu | à relire |
| Tests des 100 caractères | — | 100 caractères du plan de base, puis 100 entourés d'espaces (`trim()`) ; `accessibilityRole="alert"` vérifié ; nouveau fichier de test ; 3 fichiers | Limite comptée après `trim()`, en points de code | à relire |
| Où placer le contrôle partagé par les deux formulaires | Fonction locale dans chaque écran ; export depuis un fichier de route ; `memberNameError` dans `src/ui/errorMessage.ts` | `memberNameError` dans `src/ui/errorMessage.ts` (4e fichier, 5 au plus) | Une seule règle (`validateMemberName`, inchangée) et un seul message ; expo-router lit les exports d'une route, on n'y exporte rien d'autre | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Membres : nom et prénom limités à 100 caractères, sans caractère invisible, à la saisie comme à l'import (SEC-06).
- Architecture : rien.
