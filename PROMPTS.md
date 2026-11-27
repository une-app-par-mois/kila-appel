# Journal des prompts — Ki&La (appel)

Les prompts clés et les décisions, pour que chacun puisse reproduire la démarche. Données fictives uniquement.

## Bilan

- Temps total : [X h] · Sessions Claude Code : [X]
- Part du code générée par l'IA, estimée : [X %]
- Ce que l'IA a raté et que j'ai dû reprendre : [ ]

## Journal

### Mise en route et cadrage — 2026-11-26

**Prompt**

```text
Je veux refaire de zéro mon appli d'appel Ki&La (relevé de présence des séances de sport) avec la méthode de vibe coding : utilise le skill methode-vibe-coding. [...] L'ancienne version [...] sert uniquement de référence fonctionnelle : ne copie pas son code, et ne la modifie pas. [...] Pose-moi en QCM le niveau, puis le nom du dépôt, l'organisation et la visibilité [...]. Remplis docs/CADRAGE.md avec moi par questions courtes [...] sans jamais rien décider à ma place. Pose aussi le mode de CI en QCM. Liste ce que l'ancienne version faisait de bien et ce qu'elle faisait mal [...]. Toutes tes questions doivent être des QCM (2 à 4 options, ta recommandation en premier).
```

**Ce que l'IA a fait** : lecture de l'ancienne version par un sous-agent (documents, code, historique git), bilan de ce qui a marché ou coûté cher, création du dépôt depuis le modèle, cadrage puis PRD rédigés par QCM successifs, règles absolues ABS-01 à ABS-08 dans `CLAUDE.md`.

**Ce que j'ai corrigé ou refusé** : périmètre élargi à tout ce que faisait l'ancienne version (contre la recommandation d'une v1 resserrée), construit par jalons ; import par photo ajouté puis renvoyé en boîte à idées ; tablette ; « tout encadrant » plutôt que « entraîneur » ; préparer/annuler gardés dans leur version complète ; import CSV et exports en zone sensible ; cycle de sauvegarde vérifié sur Android réel seulement.

**Décision** : niveau renforcé, dépôt public `une-app-par-mois/kila-appel`, Expo + React Native + TypeScript, CI par jalon, pas de chiffrement applicatif. Cadrage et PRD validés le 2026-11-26.

### Ticket 001 : socle Expo et test.sh réel — 2026-11-26

**Prompt**

```text
Démarre le ticket 001 (docs/tickets/001-socle-expo.md), le premier du jalon 0, en mode de CI par jalon : plan court validé d'abord, versions de docs/ARCHITECTURE.md §2 revérifiées sur npm avant toute installation, test écrit d'abord et vu en échec ; une fois scripts/test.sh réel et vert, propose comment pousser les commits locaux de ticket/000-mise-en-route et ce qu'on fait de la PR n°1. Toutes tes questions sont des QCM.
```

**Ce que l'IA a fait** : versions revérifiées (aucun écart sur les paquets du §2) ; dépendances obligatoires d'expo-router et de Jest repérées et proposées ; test RM-04 vu en échec (11 échecs sur une coquille vide) puis vert ; `test.sh` réel, avec échec vérifié sur test faux, couverture basse, `.only` et promesse flottante ; `/code-review` (7 remarques mineures, toutes traitées).

**Ce que j'ai corrigé ou décidé** : branche du jalon 0 partie de `ticket/000` (`main` vide), PR n°1 fermée au profit de la PR du jalon ; `react-dom` épinglé en 19.3.0 ; années bornées de 1900 à 2100 ; scheme `kila://` retiré. L'IA avait affirmé à tort que pousser la branche du jalon passerait « vraiment » le hook : corrigé avant le push, limite notée.

### Ticket 002 : couche données et migration 1 — 2026-11-26 (zone sensible)

**Prompt**

```text
démarre le ticket 002
```

**Ce que l'IA a fait** : interface `Db` commune à `expo-sqlite` (appli) et `node:sqlite` (tests, ADR-008) ; migration 1 (16 tables `STRICT`, contraintes, cascades) ; deux `/code-review` et `/security-review`. La première revue a trouvé un défaut grave : `withExclusiveTransactionAsync` ouvre une nouvelle connexion sans clés étrangères, si bien que les cascades ne s'appliquaient pas dans les transactions. L'IA l'a reproduit par une imitation fidèle avant de le corriger (file de transactions sur la connexion principale). La deuxième revue a trouvé un ROLLBACK avalé et une poignée de transaction réutilisable.

**Ce que j'ai corrigé ou décidé** : séances gardées à la suppression d'un créneau ; brouillon d'appel en tables filles plutôt qu'en JSON, rattaché à sa saison ; relecture de la zone sensible avant fusion.

### Ticket 003 : garde-fous, thème et polices — 2026-11-26

**Prompt**

```text
démarre le ticket 003
```

**Ce que l'IA a fait** : thème lu dans `jetons.json` ; journal unique ; contrôles CONV-03, CONV-16, SEC-01 et SEC-03 par l'arbre syntaxique de TypeScript ; polices IBM Plex avec empreintes. La revue a trouvé que 3 polices sur 4 seraient introuvables sur iOS, parce que leur nom PostScript diffère du nom de fichier : confirmé avec `fc-scan`, fichiers renommés, et un test lit maintenant le nom dans chaque police.

**Ce que j'ai corrigé ou décidé** : j'ai lancé moi-même le téléchargement des polices (`!`), car l'IA n'en avait pas la permission ; journal sans erreur levée (`LOG_REFUSED`) et clés en liste blanche ; `expo-font` accepté pour son extension de build seulement, `loadAsync` et `useFonts` interdits.

### Ticket 004 : builds sur la CI et audit des permissions — 2026-11-26 (zone sensible)

**Prompt**

```text
démarre le ticket 004
```

**Ce que l'IA a fait** : APK de version construit en local puis par la CI ; `scripts/audit-apk.js` (permissions égales à une liste figée, sans INTERNET, sans sauvegarde système, sans lien profond) et `audit-ios.js` ; base ouverte au démarrage. Constats : Expo ajoute 4 permissions par défaut malgré `permissions: []`, et un scheme d'URL iOS dans tous les cas. L'audit a échoué quand une permission (`CAMERA`) a été ajoutée exprès, puis est repassé une fois celle-ci retirée. Sur mon Galaxy A55 : `DB_READY { version: 1 }` dans `adb logcat`. La revue a trouvé que la base pouvait être ouverte deux fois en parallèle, d'où une ouverture partagée.

**Ce que j'ai corrigé ou décidé** : binaire de test = APK de version avec la clé de débogage, et non `expo-dev-client` (qui exige INTERNET) ; migration vérifiée par `adb logcat` plutôt qu'à l'écran ; liste de permissions validée ; scheme iOS retiré par un plugin local.

### Fin du jalon 0 — 2026-11-26

**Prompt**

```text
tu peux fusionner la PR #5 (puis : « Vas y » pour la PR du jalon vers main)
```

**Ce que l'IA a fait** : PR du jalon vers `main`, la première exécution de la CI. Semgrep a refusé un gabarit placé en premier argument de `console.log` : faux positif en pratique, mais corrigé dans le code plutôt que masqué. Le build Android (17 min) et le build iOS sur `macos-26` (27 min) ont réussi dès le premier essai ; fusion en `--squash` une fois tout vert. Prétest : APK de la CI téléchargé (empreinte vérifiée), installé et relancé après une fermeture forcée sur l'émulateur Android 16.

**Ce que j'ai corrigé ou décidé** : l'IA a fusionné la PR #8 (correction Semgrep) sans `/code-review` préalable, contrairement à `CLAUDE.md` ; elle l'a signalé d'elle-même et lancé la revue après coup (aucune remarque). Réévaluation : moins de 2 h réelles pour 6 h prévues ; estimation de 1,5 h par ticket gardée, l'avance d'une semaine sert de marge.

### Décisions automatiques — 2026-11-27

**Prompt**

```text
Pour une très importante partie (très majoritaire) quand tu poses des questions, je ne fais que valider ta recommandation. [...] si lorsque je dois choisir par qcm on met en place la validation automatique de ta recommandation, on gagnerait du temps. [...] faire une note dans un document qui mémorise tes choix pour pouvoir à la fin remonter sur une potentielle erreur si nécessaire. On pourrait intégrer ce point au skill de vibe coding, qu'en penses-tu ?
```

**Ce que l'IA a fait** : `CLAUDE.md` (rôles, plan annoncé, « Arrête-toi et demande » resserré, § « Décisions automatiques »), `docs/DECISIONS.md`, section du modèle de PR. Exceptions gardées : sécurité, ABS, données et conformité, dépendance ou dépense, contradiction avec un document validé, zone sensible, action irréversible ou extérieure, choix sans recommandation nette.

**Ce que j'ai corrigé ou refusé** : rien.

**Décision** : « projet puis méthode » : Ki&La d'abord, puis une PR sur `une-app-par-mois/methode-vibe-coding`, relue par le porteur. Bilan au jalon : nombre de décisions annulées.

### Contradicteur — 2026-11-27

**Prompt**

```text
On peut ajouter un sous agent autonome pour être le contradicteur ?
```

**Ce que l'IA a fait** : sous-agent `.claude/agents/contradicteur.md` (lecture seule, sans le raisonnement de l'IA), lancé une fois par ticket avant la PR sur ses décisions automatiques ; suites selon le verdict dans `CLAUDE.md` ; états dans `docs/DECISIONS.md` ; modèle de PR.

**Ce que j'ai corrigé ou refusé** : rien.

**Décision** : premier usage sur le ticket 012b.

### File du porteur — 2026-11-27

**Prompt**

```text
Pour éviter de me demander trop souvent des décisions, est-ce pertinent d'ajouter un agent de décision ? Et / ou un agent médiateur ?
```

**Ce que l'IA a fait** :
- Elle a déconseillé les deux agents : les questions qui remontent sont celles réservées au porteur, et aucun agent ne peut les trancher.
- Elle a proposé deux règles : écarts mineurs avec la maquette en décision automatique, et file du porteur.
- Le porteur a choisi la file seule. Les choix sans recommandation nette et les ajustements de ses décisions, s'ils sont faciles à défaire, sont appliqués et posés en fin de jalon.

**Ce que j'ai corrigé ou refusé** : les écarts avec la maquette restent posés sur le moment.

### Travail par lot — 2026-11-27

**Prompt**

```text
Avant de passer aux tickets suivants, je veux voir avec toi comment optimiser le skill et le process de vibe coding. L'objectif est de réduire le temps de développement, pouvoir au maximum lancer des agents de code en parallèle pour plusieurs tickets. Avoir les questions par séance de questions, c'est-à-dire garder les questions en mémoire pour avoir des questions posées à un moment donné et pas sans arrêt.
```

**Ce que l'IA a fait** :
- Elle a mis en place le travail par lot : séance de lancement avec pré-analyse, au plus 3 agents de code en parallèle dans des worktrees, intégration par l'IA principale, séance de clôture.
- Elle a ajouté la file `docs/QUESTIONS.md`, un modèle de ticket avec les dépendances, les fichiers touchés et les sections tenues par l'agent, et les agents `pre-analyse` et `codeur`.

**Ce que j'ai corrigé ou refusé** : rien. Choix du porteur : dès maintenant ; cas réservés repoussés à la séance suivante, avec le ticket mis de côté ; 3 agents au plus.

### Premier lot en parallèle (013, 014, 015) — 2026-11-27

**Prompt** : « Vas-y » (après la mise en place du travail par lot).

**Ce que l'IA a fait** :
- **Séance de lancement** : trois pré-analyses, puis 11 questions posées en une fois. Résultat : découpage de 014 et 015, restauration par recopie, expo-file-system accepté, purge des membres.
- **Développement** : trois agents de code dans des worktrees.
- **Intégration** :
  - revue de code, contradicteur, et revue de sécurité pour 014 et 015 ;
  - corrections renvoyées aux agents (5 décisions changées) ;
  - fusions une par une, avec la branche du jalon fusionnée dans chaque branche suivante.
- **Séance de clôture** : 6 questions (barre d'onglets à 5 places, « dont N retards », mode de journal, saisons commencées, écarts du 014).

**Ce que j'ai corrigé ou refusé** : rien. Les questions venaient des contradicteurs et des revues, pas d'erreurs de l'IA.

**Leçons** :
- Les pré-analyses trouvent la plupart des questions avant le code.
- Deux agents ont créé le même code d'erreur sous deux types : conflit résolu à l'intégration.
- Un agent a élargi un contrôle « si besoin » : le contradicteur l'a fait remonter au porteur.

### [Étape] — [AAAA-MM-JJ]

**Prompt**

```text
[le prompt, tel quel]
```

**Ce que l'IA a fait** : [ ]

**Ce que j'ai corrigé ou refusé** : [ ]

**Décision** : [ ]
