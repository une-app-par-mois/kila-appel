# Conventions et Definition of Done — [nom de l'app]

Ce que la machine ne vérifie pas encore, l'IA le respecte ; ce qu'elle peut vérifier, on l'ajoute à `scripts/test.sh` ou à un hook plutôt qu'ici.

## Code

- [Arborescence : où vont la logique métier, l'interface, les données.]
- La logique métier est pure : ni interface, ni stockage, ni réseau ; l'heure et le hasard sont passés en paramètres pour être testables.
- Données venues de l'extérieur (fichier importé, saisie, stockage) validées à l'entrée, jamais simplement converties.
- Les erreurs attendues sont gérées et affichées clairement ; pas d'exception avalée en silence.
- Textes de l'interface regroupés dans un seul fichier ; couleurs et tailles depuis les jetons de `design/CHARTE.md`.
- Identifiants en anglais, avec le terme du glossaire du cadrage ; commentaires, textes et commits en français.

## Tests

- Chaque fonctionnalité `F-xx` a au moins un test dont le nom cite son identifiant.
- Aucun test n'appelle le réseau ; heure et hasard injectés ; aucune donnée réelle.
- Pas de test désactivé (`.skip`, `.only`, `xfail`) ni supprimé pour faire passer un ticket.

## Definition of Done d'un ticket

Recopiée et cochée dans la PR (le modèle de PR la contient). Une case non cochée sans raison bloque la fusion.

1. Chaque critère d'acceptation du ticket est couvert par un test automatisé, ou listé avec la façon de le vérifier à la main.
2. Le test a été vu en échec avant le code ; un bogue corrigé a son test qui le reproduit.
3. `./scripts/test.sh` passe en local ; tous les travaux de la CI sont verts sur la PR vers `main` (dans un groupe ou un jalon : sur la PR du groupe).
4. `/code-review` lancé, remarques traitées ou expliquées ; `/security-review` en plus en zone sensible.
5. Aucun secret, aucune donnée réelle, aucun appel réseau ajouté ; aucune dépendance sans validation.
6. Interface touchée : comparée à la maquette, écarts listés dans la PR.
7. Document de référence mis à jour si une décision écrite change (cadrage, charte, conventions).
8. `ETAT.md` à jour, avec ce qui n'a **pas** été vérifié.
