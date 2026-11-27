# CLAUDE.md — règles du projet

Ce fichier est lu par Claude Code à chaque session. Il fixe le contexte et les règles non négociables. Le compléter avant la première génération de code. Réponds en français.

**Rôles** : l'IA écrit le code, les tests et la documentation, signale ses doutes et ce qu'elle n'a pas vérifié. Le porteur décide du produit, teste l'app, relit les zones sensibles et les décisions automatiques. Depuis le 2026-11-27 (décision du porteur), l'IA applique sa recommandation sans attendre quand elle est nette, et la note dans `docs/DECISIONS.md` (voir « Décisions automatiques ») ; elle ne décide jamais seule de sécurité, de dépense, ni de ce que la liste « Arrête-toi et demande » réserve au porteur.

## Contexte

- **Application** : Ki&La (appel) — relevé de présence en moins de 30 secondes, pour tout encadrant d'un groupe (club de sport d'abord), 100 % hors ligne
- **Cahier des charges** : `docs/CADRAGE.md` (fait foi sur le périmètre, le vocabulaire et les zones sensibles)
- **Architecture** : `docs/ARCHITECTURE.md` et `docs/adr/` (pile technique fermée, couches, schéma)
- **Sécurité** : `docs/SECURITE.md` (exigences `SEC-xx` et leur vérification)
- **Conformité** : `docs/CONFORMITE.md` (RGPD, stores, DSA, licences, actions avant lancement)
- **Plan** : `docs/PLAN.md` (jalons, calendrier, piste du porteur) et `docs/tickets/`
- **Exigences** : `docs/PRD.md` (exigences `EX-xx`, règles métier `RM-xx`, non fonctionnelles `NF-xx`)
- **Plateforme cible** : Android et iOS, téléphone et tablette, publiée sur Google Play et l'App Store
- **Stack** : Expo + React Native + TypeScript, SQLite local (versions vérifiées au premier ticket) — dépendances minimales, répandues et maintenues
- **Design** : `design/CHARTE.md` et `design/maquettes/` (validés avant le code ; la maquette fait foi, rien d'absent n'est ajouté sans validation)
- **Conventions et Definition of Done** : `docs/CONVENTIONS.md`
- **Glossaire de la méthode** (ADR, DoD, CI, jalon, zone sensible…) : `docs/GLOSSAIRE-METHODE.md` ; le vocabulaire de l'app est dans le cadrage

## Commandes

- Installer : `npm ci` (Node 22), puis une fois par poste `./scripts/setup-hooks.sh`
- Lancer en développement : `npx expo start`
- Tests : `./scripts/test.sh` (doit passer avant toute PR)
- Build : `./scripts/build.sh` (doit produire les fichiers à publier dans `dist/`)

## Avant chaque session

1. Lis `ETAT.md` (ticket en cours, prochaines étapes, points d'attention).
2. Lis le ticket (`docs/tickets/`) et les documents qu'il cite.
3. Annonce un plan court (fichiers, approche, tests prévus, risques), puis commence. Le plan **attend la validation** du porteur seulement pour une zone sensible ou un cas de « Arrête-toi et demande ».

## Règles non négociables

### Règles absolues du projet (niveau renforcé)

Chacune a un identifiant, cité dans le code, les tests et les tickets. Le motif est dans `docs/CADRAGE.md`.

- **ABS-01 Aucun réseau.** L'appli n'émet aucune requête réseau, jamais : pas d'API, d'analytics, de télémétrie, de suivi de crash, de publicité, de notification push, de police ou de ressource chargée à l'exécution. Toutes les ressources sont embarquées. Une dépendance capable d'émettre du réseau est refusée, sauf décision datée du porteur. La permission INTERNET est absente du binaire Android de production.
- **ABS-02 Aucun serveur, aucun compte, aucune synchronisation.** Si une fonctionnalité semble l'exiger : t'arrêter et me le signaler, ne pas contourner.
- **ABS-03 Minimisation.** Seuls les champs de la table « Données manipulées » du cadrage existent. N'ajoute aucun champ personnel. Aucune donnée de santé, aucun commentaire libre au niveau d'un membre (seulement au niveau d'une séance).
- **ABS-04 Aucun nom hors de l'écran.** Jamais de nom, prénom, téléphone ou date de naissance dans un journal (`console.*`), un message d'erreur ou une notification : des identifiants seulement.
- **ABS-05 Suppression réelle.** Supprimer efface vraiment (présences comprises) ; archiver et supprimer sont deux opérations distinctes et les deux existent.
- **ABS-06 Pas de chiffrement dans l'appli.** Aucun chiffrement applicatif sans décision datée du porteur (déclaration ANSSI, export Apple). La sauvegarde est en clair, et l'écran d'export le dit sans détour : cet avertissement n'est jamais réduit.
- **ABS-07 Permissions minimales.** Aucune dépendance installée avant la fonctionnalité qui l'utilise. Les permissions sont auditées sur le binaire construit, pas sur le manifeste.
- **ABS-08 Une évolution qui touche aux données** met à jour, dans le même lot, la politique de confidentialité et les déclarations des stores (« aucune donnée collectée »).

### Sécurité
- Aucun secret dans le code ni dans l'historique Git (clé, token, mot de passe). Ne lis jamais `.env`.
- Toute entrée est validée : saisies, fichiers importés, CSV, chemins, URL.
- Pas de `eval`, pas d'exécution de commande construite à partir d'une entrée, pas de `innerHTML` avec des données non échappées.
- Requêtes paramétrées pour toute base locale (SQLite, IndexedDB).
- Données personnelles : collecter le minimum, stocker localement, permettre l'export et la suppression (pas de chiffrement applicatif : ABS-06 ; aucune donnée sensible : ABS-03).
- Principe du moindre privilège : permissions système, d'extension ou Android réduites au strict nécessaire, chacune justifiée dans le README.
- Avant d'ajouter une dépendance : me la proposer avec sa raison, sa licence et sa date de dernière mise à jour, après avoir vérifié qu'elle existe sous ce nom exact (une IA peut inventer un nom de paquet).
- **Ne désactive ni n'affaiblis jamais un contrôle** pour faire passer du code : test, lint, typage, hook (`--no-verify` interdit), workflow de sécurité.

### Données
- Uniquement des données fictives dans le code, les tests, les captures et les démos. Jamais de vraies données d'utilisateurs.

## Arrête-toi et demande

Ces cas attendent toujours la réponse du porteur, même avec une recommandation nette :

- Contradiction avec un document validé (cadrage, PRD, architecture, ADR, sécurité, conformité, charte, maquette).
- Besoin d'une nouvelle dépendance ou d'une dépense.
- Ce qui touche aux règles absolues ABS-xx, à la sécurité (SEC-xx), aux données personnelles ou à la conformité (stores, RGPD, licences).
- Modification d'une zone sensible que le ticket ne prévoit pas ; plan d'un ticket en zone sensible.
- Choix sans recommandation nette (options équivalentes, ou information qui manque).
- Test existant qui échoue sans rapport avec le ticket.
- Ticket plus gros que prévu (plus de 10 fichiers, plus d'une session) : on le découpe **avant** ; le découpage suit la recommandation et se note dans `docs/DECISIONS.md`, sauf en zone sensible.
- Toute action irréversible ou extérieure au dépôt (publication, tag, réglages GitHub).

Pose chaque décision sous forme de choix (options, avec ta recommandation en premier).

## Décisions automatiques

Décision du porteur du 2026-11-27 (« projet puis méthode ») : hors des cas ci-dessus, une question qui a une recommandation nette (spécification absente ou ambiguë, texte, affichage, découpage d'un ticket, cas limite, choix d'architecture interne) n'est pas posée. L'IA applique sa recommandation, continue, et ajoute une ligne à `docs/DECISIONS.md` : date, ticket, question, options, choix, raison. Chaque PR liste ses décisions automatiques dans « Décisions automatiques à relire ». Le porteur en annule une quand il veut : la correction se fait sur un ticket, et la ligne est marquée « annulée ». À chaque fin de jalon, l'IA compte les décisions annulées et le dit au porteur.

**Contradicteur** (décision du porteur du 2026-11-27) : avant la PR d'un ticket qui a des décisions automatiques, l'IA lance le sous-agent `contradicteur` (`.claude/agents/contradicteur.md`) avec le numéro du ticket, ses lignes de `docs/DECISIONS.md` et la branche, sans son propre raisonnement. Pour chaque décision contestée :

- contradiction avec un document validé ou décision qui aurait dû être réservée : la question est posée au porteur ;
- argument qui convainc : l'IA change et note « changée après contradiction » ;
- sinon : l'IA garde et note « contestée, maintenue : <raison> ».

La PR liste les décisions contestées en premier.

## Mode de CI

Mode de ce projet : **par jalon**, choisi au cadrage par le porteur le 2026-11-26. Un changement de mode est une décision datée du porteur, notée ici ; jamais une dérogation.

| Mode | La PR du ticket vise | La CI tourne sur |
| --- | --- | --- |
| Par ticket | `main` | chaque PR de ticket |
| Par groupe | `groupe/<n°>-<n°>-<intitulé>` (2 à 4 tickets liés, décidés au plan) | la PR du groupe vers `main` |
| Par jalon | `groupe/jalon-<n>-<intitulé>` (tous les tickets du jalon) | la PR du jalon vers `main`, une fois le dernier ticket fusionné |

La branche de groupe ou de jalon part de `main`. Seule exception, décidée par le porteur le 2026-11-26 : `groupe/jalon-0-outillage` part de `ticket/000-mise-en-route`, car `main` ne contenait alors que le commit initial ; la PR du jalon 0 vers `main` remplace la PR n°1. Les workflows ne tournent que sur les PR vers `main`. En zone sensible, le ticket reste dans son groupe, avec `/security-review` et la relecture du porteur avant sa fusion dans le groupe.

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
