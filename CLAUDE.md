# CLAUDE.md — règles du projet

Ce fichier est lu par Claude Code à chaque session. Il fixe le contexte et les règles non négociables. Le compléter avant la première génération de code. Réponds en français.

**Rôles** : l'IA écrit le code, les tests et la documentation, signale ses doutes et ce qu'elle n'a pas vérifié. Le porteur décide du produit, valide les plans, teste l'app et relit les zones sensibles. L'IA ne décide jamais seule d'un choix de produit, d'architecture, de sécurité ou de dépense.

## Contexte

- **Application** : [nom] — [une phrase : ce qu'elle fait, pour qui]
- **Cahier des charges** : `docs/CADRAGE.md` (fait foi sur le périmètre, le vocabulaire et les zones sensibles)
- **Plateforme cible** : [PWA hors ligne | desktop (Tauri/Electron) | Android | CLI | extension navigateur]
- **Stack** : [langage, framework, version] — dépendances minimales, répandues et maintenues
- **Design** : `design/CHARTE.md` et `design/maquettes/` (validés avant le code ; la maquette fait foi, rien d'absent n'est ajouté sans validation)
- **Conventions et Definition of Done** : `docs/CONVENTIONS.md`
- **Glossaire de la méthode** (ADR, DoD, CI, jalon, zone sensible…) : `docs/GLOSSAIRE-METHODE.md` ; le vocabulaire de l'app est dans le cadrage

## Commandes

- Installer : `[commande]`, puis une fois par poste `./scripts/setup-hooks.sh`
- Lancer en développement : `[commande]`
- Tests : `./scripts/test.sh` (doit passer avant toute PR)
- Build : `./scripts/build.sh` (doit produire les fichiers à publier dans `dist/`)

## Avant chaque session

1. Lis `ETAT.md` (ticket en cours, prochaines étapes, points d'attention).
2. Lis le ticket (`docs/tickets/`) et les documents qu'il cite.
3. Propose un plan court (fichiers, approche, tests prévus, risques) et **attends sa validation** avant de coder, sauf ticket marqué « trivial ».

## Règles non négociables

### 100 % local
- Aucun appel réseau nécessaire au fonctionnement : pas d'API distante, pas de CDN, pas de police ou script chargé depuis Internet, pas de télémétrie, pas d'analytics.
- Toutes les ressources (polices, icônes, modèles) sont embarquées dans le dépôt ou le build.
- Un LLM éventuel est un modèle open-weight dont la licence autorise la redistribution ; son empreinte SHA-256 est vérifiée au chargement ; taille et prérequis matériels sont indiqués dans le README.
- Si une fonctionnalité semble exiger un serveur : t'arrêter et me le signaler, ne pas contourner.

### Sécurité
- Aucun secret dans le code ni dans l'historique Git (clé, token, mot de passe). Ne lis jamais `.env`.
- Toute entrée est validée : saisies, fichiers importés, CSV, chemins, URL.
- Pas de `eval`, pas d'exécution de commande construite à partir d'une entrée, pas de `innerHTML` avec des données non échappées.
- Requêtes paramétrées pour toute base locale (SQLite, IndexedDB).
- Données personnelles : collecter le minimum, stocker localement, chiffrer au repos si elles sont sensibles, permettre l'export et la suppression.
- Principe du moindre privilège : permissions système, d'extension ou Android réduites au strict nécessaire, chacune justifiée dans le README.
- Avant d'ajouter une dépendance : me la proposer avec sa raison, sa licence et sa date de dernière mise à jour, après avoir vérifié qu'elle existe sous ce nom exact (une IA peut inventer un nom de paquet).
- **Ne désactive ni n'affaiblis jamais un contrôle** pour faire passer du code : test, lint, typage, hook (`--no-verify` interdit), workflow de sécurité.

### Données
- Uniquement des données fictives dans le code, les tests, les captures et les démos. Jamais de vraies données d'utilisateurs.

## Arrête-toi et demande

- Spécification absente, ambiguë ou contradictoire avec un document.
- Besoin d'une nouvelle dépendance ou d'un nouveau terme (absent du glossaire du cadrage).
- Choix de produit, d'architecture, de sécurité ou de données non tranché dans les documents.
- Modification d'une zone sensible que le ticket ne prévoit pas.
- Test existant qui échoue sans rapport avec le ticket.
- Ticket plus gros que prévu (plus de 10 fichiers, plus d'une session) : on le découpe **avant**.
- Toute action irréversible ou extérieure au dépôt (publication, tag, réglages GitHub).

Pose chaque décision sous forme de choix (options, avec ta recommandation en premier).

## Mode de CI

Mode de ce projet : **par jalon** — [par ticket | par groupe | par jalon], choisi au cadrage. Un changement de mode est une décision datée du porteur, notée ici ; jamais une dérogation.

| Mode | La PR du ticket vise | La CI tourne sur |
| --- | --- | --- |
| Par ticket | `main` | chaque PR de ticket |
| Par groupe | `groupe/<n°>-<n°>-<intitulé>` (2 à 4 tickets liés, décidés au plan) | la PR du groupe vers `main` |
| Par jalon | `groupe/jalon-<n>-<intitulé>` (tous les tickets du jalon) | la PR du jalon vers `main`, une fois le dernier ticket fusionné |

La branche de groupe ou de jalon part de `main`. Les workflows ne tournent que sur les PR vers `main`. En zone sensible, le ticket reste dans son groupe, avec `/security-review` et la relecture du porteur avant sa fusion dans le groupe.

## Cycle d'un ticket

1. **Plan validé** (ci-dessus), puis une branche `ticket/<numéro>-<intitulé-court>`, partie de `main` (mode par ticket) ou de la branche de groupe. Jamais de commit sur `main`.
2. **Test d'abord** : écrire le test, le lancer, le voir échouer, puis coder jusqu'au vert. Un bogue corrigé commence par un test qui le reproduit.
3. **Vérifications** : `./scripts/test.sh` passe ; `/code-review` lancé, et `/security-review` en zone sensible.
4. **PR** avec le modèle : ce qui change, tests, zone sensible oui/non, Definition of Done cochée, **ce qui n'a pas été vérifié**.
5. **Fusion par l'IA** (jamais `--admin`, jamais de suppression de branche ; en zone sensible, seulement après la relecture du porteur) :
   - **vers une branche de groupe** : après `./scripts/test.sh` et `/code-review`, sans CI, en gardant les commits pour que gitleaks les parcoure tous : `gh pr merge <n> --merge --match-head-commit <sha>` ;
   - **vers `main`** (ticket seul ou groupe complet) : seulement quand **tous les travaux de la CI sont verts** sur le dernier commit et que la branche contient le `main` actuel (`git merge-base --is-ancestor origin/main <sha>` ; sinon `main` y est fusionné, jamais de rebase d'une branche poussée) : `gh pr merge <n> --squash --match-head-commit <sha>`. Un échec se corrige sur une branche de ticket ou sur la branche de groupe, puis la CI repart.
6. **Journal** : `ETAT.md` à jour ; entrée dans `PROMPTS.md` si l'étape est importante.

Messages de commit en français, « `Domaine : ce qui change` », 72 caractères au plus en première ligne (vérifié par le hook `commit-msg`).

## Écrire le code

- Un mot par notion : le terme du glossaire du cadrage, le même dans le code (en anglais) et les textes.
- Toute règle tirée d'une exigence cite son identifiant dans le code et dans le nom du test (`F-03`).
- Pas de code mort, pas de `TODO` sans numéro de ticket, fichiers de 300 lignes au plus.
- Écrire un code que je peux comprendre et expliquer.
- Ne pas modifier `.github/workflows/`, `.claude/`, `scripts/hooks/`, `LICENSE`, `SECURITY.md` ni ce fichier sans me le demander.
- Les idées hors périmètre vont dans `docs/IDEES.md`, jamais directement dans le code.

## Journal

- `ETAT.md` : l'état courant, **100 lignes au plus** ; on remplace, on n'empile pas. L'historique vit dans les PR.
- `PROMPTS.md` : après chaque étape importante, le prompt clé, ce qui a été fait, ce que j'ai dû corriger.
