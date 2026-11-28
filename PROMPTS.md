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

### Lot 4 (014c, 014d, 015b) — 2026-11-27

**Prompt clé** : séance de lancement en 4 séries de QCM (découpages en 014c/014f et 015b/015f, détection d'une base abîmée, « Repartir de zéro », texte chiffré de la purge, plans de zone sensible), puis 3 agents de code en parallèle.

**Ce que l'IA a fait** :
- **Développement** : trois agents dans leurs worktrees, un par ticket.
- **Intégration** : revue de code, contradicteur, revue de sécurité pour 014c et 015b ; corrections renvoyées aux agents ; fusions une par une (PR #49 à #51), la branche du jalon fusionnée dans chaque branche suivante ; 1197 tests.
- **Suites** : nouveau ticket 014g (vidage du dossier d'export sous le verrou), notes reportées dans les fiches 014f et 015f, limite de « Repartir de zéro » dans SEC-11, nettoyage sous verrou dans SEC-10.

**Ce qui a été corrigé par les revues** :
- une base saine pouvait être classée « abîmée » (et proposée à l'effacement) : le porteur a tranché, « abîmée » seulement pour un fichier illisible, sinon « Réessayer » sans effacement ;
- « Garder » restait actif pendant la purge : confirmation figée (`busy`) ;
- au passage de minuit, la relecture faisait disparaître la section et la confirmation de purge ;
- tests manquants sur les gardes des membres de la purge ;
- les notes de la maquette du 015b attribuaient au porteur des décisions automatiques (contradicteur) ;
- blocage possible sur « Appel enregistré » en attendant la lecture des réglages de l'invitation (014d) : le retour n'attend plus la lecture.

**Ce que j'ai corrigé ou refusé** : deux réponses en cours de lot : le classement « abîmée » (ci-dessus) et la confirmation de purge sans le nom du groupe de l'appel en cours (contrôle EX-14 non élargi).

**Leçons** :
- Les intégrations des lots 2 et 3 avaient remplacé les lignes de `docs/DECISIONS.md` au lieu d'ajouter en bas : historique rétabli à ce lot.

### Lot 5 (014g, 017, 015f, 014f) — 2026-11-27

**Prompt clé** : séance de lancement en QCM (plans de zone sensible du 014g, du 015f et du 014f ; texte de Tout effacer ; mot « EFFACER » ; 014f gardé entier ; minimatch par `overrides`), puis agents de code en parallèle.

**Ce que l'IA a fait** :
- **Développement** : un agent par ticket, dans son worktree ; le 014g fusionné en premier, les autres ont récupéré la branche du jalon par une fusion.
- **Intégration** : revue de code, contradicteur, revue de sécurité pour 014g, 015f et 014f ; corrections renvoyées aux agents ; fusions une par une (PR #54 à #57) ; 1284 tests ; 41 décisions ajoutées à `docs/DECISIONS.md`.
- **Suites** : SEC-10 et SEC-11 complétées (vidage de l'export sous verrou, Tout effacer, limites des arrêts brutaux), nouveau ticket 018 (glob), relances à annuler par Tout effacer notées dans `docs/IDEES.md`, maquette régénérée.

**Ce qui a été corrigé par les revues** :
- « Rien n'a été effacé » s'affichait après un effacement réel quand la base neuve ne s'ouvrait pas : état `erased` et message propre (réponse 1 du porteur) ;
- le résultat `'ignored'` (base qui n'est plus abîmée au moment de remplacer) était silencieux : carte « La restauration n'a pas abouti » ;
- le double appui sur le bouton rouge de Tout effacer n'était pas testé : garde dans l'écran et test ;
- la liste des dossiers du cache était écrite deux fois (démarrage et Tout effacer) : `clearCacheCopies()` commun ;
- l'ancien accueil restait visible un instant après Tout effacer : compteur d'effacements lu par `useSetupProgress` ;
- minimatch 11 forcé partout cassait `test-exclude@6` (suite pourtant verte) : override limité à la plage vulnérable.

**Ce que j'ai corrigé ou refusé** : quatre réponses après les revues du 014f (état `erased`, titre et message de `restoreFailed`, effacement en échec pendant une restauration, deux phrases de la carte gardées) ; ticket à part pour glob ; **recette sur l'A55 des lots 4 et 5 non faite, décision du 2026-11-27 : « on poursuit malgré tout »** (liste dans `ETAT.md`).

**Leçons** :
- Une suite verte ne prouve pas qu'une dépendance forcée marche : le 017 l'a vu en chargeant `test-exclude@6` à la main ; critère repris dans le 018.

### Lot 6 (018, 016) — 2026-11-27

**Prompt clé** : séance de lancement du lot 018-016 (aller-retour de la sauvegarde par une sauvegarde fictive générée par le script et déposée dans Téléchargements ; émulateur seul, A55 « non vérifié » ; Maestro 2.12.0 local, statistiques désactivées ; override de glob limité comme au 017), puis deux agents de code en parallèle.

**Ce que l'IA a fait** :
- **Développement** : 018 (glob 14.0.6 par `overrides`, garde-fou `scripts/glob.test.js`, chargement de chaque paquet vérifié hors de la suite, APK audité) ; 016 (`.maestro/`, `scripts/e2e.sh`, générateur de sauvegarde fictive sans dépendance, campagne verte sur l'émulateur API 36).
- **Intégration** : revue de code et contradicteur ; corrections renvoyées aux agents ; fusions une par une (PR #60 et #61) ; 1304 tests ; 14 décisions ajoutées à `docs/DECISIONS.md` ; bilan des décisions du jalon 1 : 0 annulée.

**Ce qui a été corrigé par les revues** :
- le générateur de la sauvegarde fictive plantait en juillet et en août (saison de Bienvenue au 1er septembre suivant, appels dans le futur) : saison qui contient aujourd'hui ;
- garde-fous de versions : comparaison écrite en double (`scripts/lock-versions.js` commun), suffixe `+build` mal lu, entrée du verrou sans version qui faisait planter le fichier ;
- l'override sans borne haute pouvait redescendre en silence une future version de glob ou de minimatch : échec « ajuster l'override » ;
- parcours fragiles : feuille de partage repérée par un identifiant qui n'existe qu'à partir d'Android 14, sélecteur en anglais seulement, émulateur relié en TCP refusé, version de Node trop basse non signalée (22.15 au moins).

**Ce que j'ai corrigé ou refusé** : **NF-01, décision du porteur du 2026-11-27** : le scénario d'appel ordinaire (3 absents, 1 retard), le seuil de 30 s et le départ du chronomètre depuis la liste des groupes sont gardés tels quels (écart au cadrage « de l'ouverture à l'enregistrement » noté ; 24,9 s mesurées) ; recette sur l'A55 des lots 4, 5 et 6 non faite (liste dans `ETAT.md`).

**Leçons** :
- Maestro mesure surtout son propre coût (environ 2,2 s par appui) : sur l'émulateur, NF-01 se lit comme une alerte ; la mesure qui fait foi reste sur un téléphone.
- Une base d'un ancien build laisse l'accueil vide sans message : désinstaller avant chaque installation de test.

### Clôture du jalon 1 — 2026-11-27

**Prompt clé** : PR du jalon 1 vers `main`, correction des alertes de la CI, campagne Maestro sur l'APK de la CI, accord du porteur, fusion, puis séance de clôture (questions de `docs/QUESTIONS.md`, bilan des décisions).

**Ce que l'IA a fait** :
- **CI de la PR #63** : tout vert sauf Semgrep (`detect-non-literal-regexp` dans `purge.test.tsx`, RegExp construite depuis un paramètre de test) et CodeQL (« Incomplete multi-character sanitization » dans `authorOf`, `scripts/licences.js` : avec des chevrons imbriqués, `Alix Exemple <a<b>c>` donnait `Alix Exemplec>`). Ticket 019 : regex écrites en dur ; `authorOf` retire les groupes `<…>` et `(…)` caractère par caractère, imbrications comprises ; aucune règle désactivée.
- **Campagne Maestro** sur l'APK de la CI (`kila-apk-test`) : verte, appel de 20 membres en 23,5 s.
- **Fusion** de la PR #63 en squash après l'accord du porteur (`main` à `91ed684`) ; alertes Dependabot fermées (0 ouverte) ; branche `groupe/jalon-2-suivre-assiduite` créée depuis `main`.
- **Séance de clôture** : les deux questions du 015b posées ; ticket 020 créé ; tickets du jalon 1 passés à « fait ».

**Ce qui a été corrigé par les revues** : la première version du 019 coupait le nom d'auteur au premier « < » ou « ( » ; la revue l'a refusée (un auteur « (c) Acme Corp » ou avec une parenthèse au milieu perdait son nom).

**Ce que j'ai corrigé ou refusé** : réponses de clôture du 2026-11-27, qui annulent les deux décisions du 015b :
- confirmation de purge : avec un compte de 1, le possessif s'accorde (« son groupe », « son créneau ») ; au-delà, « ses 3 groupes » ;
- ligne de conservation : « Garder la dernière saison » pour 1 ; la phrase de la maquette pour 2 et plus.

**Bilan des décisions du jalon 1** : 2 annulées (les deux du 015b, par des accords) ; 9 changées après contradiction ; 27 changées après revue ; 3 décidées par le porteur ; 0 en attente.

**Leçons** :
- Corriger une alerte de sécurité plutôt que la classer : CodeQL avait raison sur un reste de chevron, et classer une alerte est un réglage extérieur réservé au porteur.
- La file du porteur a bien fonctionné : deux questions de texte n'ont rien bloqué, et la correction part sur un ticket.

### Lot J2-1 (021, 026, 023) — 2026-11-27

**Prompt clé** : séance de découpage du jalon 2 (dix tickets, 021 à 030 ; expo-notifications accepté par une décision datée du porteur), puis séance de lancement du lot J2-1 (plans des trois zones sensibles validés, QCM des questions de la pré-analyse), puis trois agents de code en parallèle.

**Ce que l'IA a fait** :
- **Développement** : 021 (séries d'absences en une requête SQL puis RM-02 dans le domaine, traitement des alertes, seuil de 2 à 10) ; 026 (expo-notifications 58.1.10 installé et verrouillé : `plugins/withoutFirebase.js`, `blockedPermissions` étendue, audit de l'APK durci, APK construit et audité en local, démarrage vérifié sur l'émulateur) ; 023 (taux RM-01, arrondi exact, parts de la barre, périodes, agrégats SQL d'une requête par écran, jeu fictif vérifié à la main).
- **Intégration** : revue de code, contradicteur, revue de sécurité (trois zones sensibles) ; corrections renvoyées aux agents ; fusions une par une (PR #68, #69, #70) ; 1449 tests ; 59 décisions ajoutées à `docs/DECISIONS.md`, 3 en attente du porteur mises en file.

**Ce qui a été corrigé par les revues** :
- **masquage des alertes** : un traitement ne couvrait la série que depuis sa première absence ; une correction qui coupait la série traitée, puis de nouvelles absences, la laissaient masquée : comparaison avec la **dernière** absence (scénarios a, b, c) ;
- **restauration vérifiée** : `alert_acks.streak_length` n'était pas contrôlé dans une sauvegarde ; entier ≥ 1, sinon le fichier est refusé ;
- **barre trompeuse** : un statut rare arrondi à 0 disparaissait de la barre ; tout statut non nul garde au moins 1 point (changée après contradiction) ;
- **filtre Saison** : deux saisons qui se chevauchent mélangeaient leurs séances ; « Saison » filtre par `sessions.season_id` en plus des dates ;
- **audit durci** : un `activity-alias`, une référence de ressource ou un composant gms non exporté passaient l'audit ; alias et cible contrôlés, références refusées (échec fermé), liste figée `config/composants-google-attendus.txt` ;
- **découverts en pré-analyse** (avant le code) : 8 bibliothèques natives sous **licence Google** (Android Software Development Kit License), hors de la liste du §7, et **ShortcutBadger** avec 16 permissions de lanceurs, tirés par expo-notifications et expo-application.

**Décisions du porteur** (2026-11-27) :
- expo-notifications accepté selon l'option A (Firebase retiré du manifeste, jamais initialisé), avec `POST_NOTIFICATIONS` et `RECEIVE_BOOT_COMPLETED` seules, sans alarme exacte ; iOS sans pastille ni habilitation ; « aucune donnée collectée » gardé, risque de l'index des SDK de Play noté ;
- licence Google acceptée pour ces 8 bibliothèques seulement ; ShortcutBadger accepté, ses permissions bloquées ;
- 026 fusionné dans le jalon avant le 028 (ABS-07 tenue au niveau du jalon) ;
- 021 : retraiter met à jour la date sur place (`ON CONFLICT … DO UPDATE SET acked_at = MAX(…)`) ; masquage à partir de la dernière absence ; restauration vérifiée ; ticket de 13 fichiers gardé entier ; ligne ABS-08 au journal de CONFORMITE ;
- 023 : membres comptés listés dans leur groupe ; maquette corrigée (« 13 séances », 64 %) ; filtre Saison par `season_id` ; suppression d'un groupe d'une séance commune documentée, à figer au jalon 4 (F-11).

**Leçons** :
- Lire les manifestes et les POM de chaque bibliothèque native avant d'accepter une dépendance : la licence et les permissions ne se voient pas dans `package.json`.
- Un audit par motifs se contourne par un alias ou une référence : l'échec fermé et une liste figée versionnée rendent tout ajout visible au diff.

### Lot J2-2 (022, 024, 027) — 2026-11-27

**Prompt clé** : séance de lancement du lot J2-2 (plan du 027 en zone sensible validé, QCM des questions de la pré-analyse, destination de « Voir ses contacts d'urgence » tranchée par le porteur), puis trois agents de code en parallèle.

**Ce que l'IA a fait** :
- **Développement** : 022 (section des alertes sur l'accueil, écran de l'alerte et « Marquer comme traitée », réglage du seuil, cases `SessionSquares`, recherche d'urgence ouverte par `?membre=<id>`) ; 024 (onglet Stats, écran Période, barre `AttendanceBar`) ; 027 (calcul pur des relances des 7 jours à venir, réglages désactivée par défaut et 30 min, textes de la maquette, test SEC-12 sur un jeu fictif lu par les dépôts).
- **Intégration** : revue de code, contradicteur, revue de sécurité du 027 ; corrections renvoyées aux agents ; fusions une par une (PR #72, #73, #74) ; 1526 tests ; 50 décisions ajoutées à `docs/DECISIONS.md`, 1 en attente du porteur mise en file.

**Ce qui a été corrigé par les revues** :
- **urgence limitée au membre** : la recherche pré-remplie avec le nom montrait aussi les homonymes (ou un « Martinez » pour « Martin ») : risque d'appeler le mauvais parent ; tant que la saisie n'est pas modifiée, seule la carte du membre s'affiche, sans `autoFocus` ;
- **fermeture de l'écran d'urgence par l'alerte** : l'écran d'alerte revenait à l'accueil dès que l'alerte n'était plus montrée, et fermait la recherche d'urgence ouverte par-dessus ; le retour n'a lieu que quand l'écran d'alerte a le focus ;
- **pile de navigation de l'écran Période** : `router.navigate` empilait un second `(tabs)`, un retour rouvrait l'écran Période ; retour par `router.dismissTo` vers `/stats`, testé par deux applications de suite ;
- **fenêtre de 7 jours des relances** : elle s'arrêtait à aujourd'hui + 6, la relance de la semaine suivante manquait dès que celle du jour était passée ; occurrences d'hier à aujourd'hui + 7, bornées par maintenant + 7 jours (ADR-007) ;
- **seuil des alertes** (contradicteur) : un seuil lu à part pouvait échouer sans message ou différer de celui de la liste ; `useAlerts` renvoie le seuil lu avec la liste.

**Incident** : disque plein pendant le lot ; chaque copie de travail des agents pesait de 4 à 12 Go ; 59 Go libérés avant de reprendre.

**Leçons** :
- Un écran qui navigue seul (retour automatique) doit vérifier qu'il a le focus : un écran ouvert par-dessus n'est pas le sien.
- Pré-remplir une recherche dans un écran d'urgence n'est pas neutre : le résultat doit désigner une seule personne.
- Surveiller la place libre avant de lancer trois agents en parallèle.

### Lot J2-3 (020, 025, 028a) — 2026-11-27

**Prompt clé** : séance de lancement du lot J2-3 (pré-analyse, QCM des questions prévisibles, plan du 028 en zone sensible ajusté et validé, découpage du 028 en 028a et 028b), puis trois agents de code en parallèle.

**Réponses du porteur au QCM du lot** :
- 020 : possessif à chaque compte de 1 (« son groupe, son créneau, sa séance et ses 3 présences ») ; « Garder la [1 ▾] dernière saison », le champ reste dans la phrase ;
- 025 : comptes accordés (« 6 présents », « 0 retard ») ; séance sans statut en case vide, libellé « Sans statut » ; « Archivé » ; états vides ; pas de légende des couleurs sur l'écran membre ; période en paramètre `periode=saison` ou `periode=mois` ;
- 028 : découpé en 028a (adaptateur et garde-fous) et 028b (reprogrammation, appui, Tout effacer) ; le 029 dépend seulement du 028a ; plan ajusté (liste fermée, nouveau contrôle statique, canal créé seulement relance activée et permission accordée, aucune demande de permission avant le 029, `reminderSessions`) ; relances affichées : on retire celles qui ne sont plus dues ; 028a gardé entier à 12 fichiers ;
- pour le 028b : `setNotificationHandler` ajouté (bannière et son appli ouverte, sans pastille), canal « Relances » en importance haute, retrait des relances affichées dont l'appel est fait.

**Ce que l'IA a fait** :
- **Développement** : 020 (accords de la confirmation de purge et de la phrase de conservation, 81 combinaisons de comptes testées) ; 025 (écrans des statistiques d'un groupe et d'un membre, case vide de `SessionSquares`, `statsPeriodParams.ts`, appui sur un groupe de l'onglet) ; 028a (adaptateur `expoNotifications.ts` en liste fermée, heures d'été et d'hiver, `reminderSessions`, contrôle `staticChecksNotifications.test.ts`, APK construit et audité en local).
- **Intégration** : revue de code, contradicteur, revue de sécurité du 028a ; corrections renvoyées aux agents ; fusions une par une (PR #77, #78, #79) ; 1653 tests ; 63 décisions ajoutées à `docs/DECISIONS.md` ; fiche 028b créée.

**Ce qui a été corrigé par les revues** :
- **contrôle statique contournable** (revue de sécurité du 028a) : un import par `node_modules/`, `import N = require()`, une clé écrite en chaîne, `jest.requireActual` ou un import relatif hors de `src/` passait le contrôle ; une fonction réseau d'expo-notifications restait donc appelable, avec un appel réseau possible sur iOS ; tous refusés, chacun vu en échec ; limite connue : un nom calculé (`obj[a + b]`) ;
- **tests dépendants du fuseau horaire** : `process.env.TZ` posé dans un fichier de test était sans effet sur les workers de Jest ; 7 tests échouaient en UTC, le fuseau de la CI, qui aurait échoué à la PR du jalon ; fuseau fixé en tête de `jest.config.js`, vérifié avec `TZ=UTC` et `TZ=America/New_York` ;
- **« Archivé » et la couleur Encre** (025, contradicteur) : « Archivé » manquait sur l'écran d'un membre ; les taux étaient en couleur Texte, 16 pt, alors que la charte met les chiffres en Encre (18 dans les listes, 26 pour le chiffre clé) ;
- **lecture en double** (020) : le lecteur d'écran lisait « Garder la » et « dernière saison » en plus du bouton qui lit la phrase entière ; les deux morceaux sont cachés au lecteur d'écran.

**Leçons** :
- Un contrôle statique par motifs se teste en cherchant à le contourner : chaque forme d'import (chemin, `require`, simulation de Jest) est une porte.
- Un test qui dépend de l'heure doit fixer son fuseau là où les workers démarrent, et passer aussi en UTC avant la PR.

### Lot J2-4 (028b, 028c, 029) — 2026-11-27

**Prompt clé** : séance de lancement du lot J2-4 (pré-analyse, QCM des questions prévisibles, plans des trois tickets en zone sensible, découpage du 028b en 028b et 028c), puis trois agents de code en parallèle.

**Réponses du porteur au QCM du lot** :
- 028b découpé en 028b (programmation) et 028c (appui sur la notification, Tout effacer, restauration), en parallèle, seul fichier commun `_layout.tsx` ;
- plans validés : reprogrammations une par une, la dernière demande gagne, reportées pendant un effacement ou une restauration ; canal créé seulement relance activée et permission accordée ; `setNotificationHandler` (bannière, liste, son, sans pastille) ; Tout effacer annule et retire toutes les relances, une restauration retire les affichées avant de reprogrammer ; cible d'un appui lue une fois au démarrage à froid, ignorée pendant le verrou ; permission demandée seulement à l'activation, après l'écran « Autoriser les notifications ? », iOS sans pastille ; APK reconstruit et audité ;
- relances affichées : retirer aussi celles dont tous les groupes sont archivés ou hors de la saison active ;
- 029 gardé entier (environ 12 fichiers) ; refus au dialogue et permission jamais demandée : état effectif avec bandeau (jamais demandée : interrupteur éteint, sans bandeau) ; mention « Le nom du groupe s'affiche sur l'écran verrouillé. » (écart de maquette accepté) ;
- placement pour éviter les conflits entre agents (clés de `relance.ts`, fonctions de l'adaptateur et du faux module, imports alphabétiques).

**Réponses du porteur en revue** : 029 fusionné après relecture ; 028c gardé entier à 12 fichiers ; 028b gardé entier à 13 fichiers ; annulation ciblée (`getAllScheduledNotificationsAsync` et `cancelScheduledNotificationAsync` ajoutées à la liste fermée) ; M1 corrigé dans le 028b (base effacée : tout annuler).

**Ce que l'IA a fait** :
- **Développement** : 029 (écrans `relance.tsx` et `permission-notifications.tsx`, `useReminderSettings`, `reminderPermissionState` et `requestReminderPermission`, ligne Relance de Paramètres) ; 028c (`useReminderTap`, `clearReminders` de Tout effacer, annulation et retrait après une restauration, réponse forgée refusée, imitation globale dans `jest.setup.js`) ; 028b (`useReminders`, `dueSessions`, `showRemindersInForeground`, annulation ciblée, `localDates.ts`, licences, APK reconstruit et audité).
- **Intégration** : revues de code, contradicteur et revues de sécurité des trois tickets ; corrections renvoyées aux agents ; fusions une par une (PR #82, #83, #84) ; 1741 tests ; 41 décisions ajoutées à `docs/DECISIONS.md`, 3 questions en file.

**Ce qui a été corrigé par les revues** :
- **appui perdu au démarrage** (028c) : un appui reçu pendant le nettoyage du démarrage (verrou `cleanup`) était ignoré ; il est mis en attente et ouvert une fois la pile montée ;
- **appui forgé par une autre appli** (revue de sécurité du 028c) : une appli tierce pouvait lancer l'activité avec une fausse notification push et ouvrir un appel ; `targetOfResponse` refuse le type `push` et exige l'identifiant `relance-<slotId>-<date>` ;
- **relances reprogrammées après Tout effacer** (028b, contradicteur) : une passe commencée avant l'effacement pouvait reprogrammer les relances des données effacées ; verrou, compte des effacements et base relus avant chaque écriture native ;
- **relance de la minute annulée** (028b) : tout annuler à chaque passe supprimait une relance due dans la minute, pas encore délivrée ; annulation ciblée des seules relances qui ne sont plus gardées (décision du porteur) ;
- **base effacée** (M1, 028b) : une base effacée qui ne se rouvre pas laissait les relances programmées ; à `erased` ou `restoreFailed`, tout est annulé et retiré (décision du porteur) ;
- **double appui** (029) : deux appuis sur « Continuer » ou deux bascules de l'interrupteur lançaient deux demandes ou empilaient deux écrans ; gardes et retour bloqué pendant la demande ;
- **permission illisible affichée comme activée** (029, contradicteur) : la ligne de Paramètres suivait la préférence alors que le 028b ne programme rien quand la lecture échoue ; elle suit l'interrupteur (« Désactivée »).

**Leçons** :
- Une passe asynchrone qui écrit dans le système doit revérifier ses conditions avant chaque écriture, pas seulement au départ.
- Tout point d'entrée qu'une autre appli peut atteindre (activité, notification) se traite comme une entrée non fiable.

### Ticket 030 et fin du développement du jalon 2 — 2026-11-27

**Prompt clé** : lancement du 030 (campagne Maestro du jalon 2, fiche `docs/tickets/030-maestro-jalon-2.md`) par un agent de code, puis revues, contradicteur, fusion (PR #86) et intégration documentaire.

**Réponses du porteur** : émulateur seul (`emulator-5554`, jamais `--appareil-reel`, A55 « non vérifié ») ; dialogue de permission du système piloté par Maestro (pas maintenant, autoriser, refuser) ; NF-08 relevé sur une sauvegarde de volume, sans seuil, à titre indicatif, jugé à l'œil sur l'A55 au prétest ; ticket gardé entier à 14 fichiers.

**Ce que l'IA a fait** : quatre parcours du jalon 2 (`alerte-traitee`, `statistiques`, `relance-reglage`, `volume-nf08`) après ceux du jalon 1, une sauvegarde fictive par parcours écrite par `e2eBackup.ts`, restauration commune en sous-parcours ; campagne **7/7 verte** sur l'émulateur (Android 16, API 36), appel de 20 membres en 25,4 s ; NF-08 indicatif sur 500 membres et 930 séances : accueil 1,07 s, Stats 2,95 s ; 1752 tests ; 19 décisions ajoutées à `docs/DECISIONS.md`, aucune question en file.

**Ce qui a été corrigé par les revues** :
- **campagne bloquée hors des dates** : un émulateur réglé hors du jeu du 023 (avant le 2026-11-25 ou après le 2027-07-31) faisait refuser toute la campagne ; seule la sauvegarde des statistiques n'est plus écrite et `e2e.sh` saute le parcours `statistiques` avec un avertissement (contradicteur) ;
- **contrôle de l'interrupteur qui ne vérifiait rien** : `checked: false` trouvait le titre, un texte jamais coché, donc toujours vrai ; l'état se lit sur la ligne « Relance » de Paramètres, et le contrôle a été vu en échec en l'inversant ;
- **contrôles des statistiques qui pouvaient attraper une ligne de groupe** : « 87 % » ou « 21 » cherchés par leur seul texte pouvaient tomber sur une ligne de groupe ; ils sont lus par position, sous leur titre et au-dessus de « Par groupe » ;
- **séances futures dans la sauvegarde de volume** : `volumeSeed` contenait 270 séances après le jour de l'appareil, que l'appli n'enregistre jamais ; elles sont retirées et la mesure porte sur 930 séances.

**Leçons** :
- Un contrôle de test se vérifie en le faisant échouer une fois : sinon il peut ne rien vérifier.
- Un jeu de test daté doit dire ce qu'il fait hors de ses dates, sans bloquer le reste.

### Clôture du jalon 2 — 2026-11-28

**Prompt clé** : PR du jalon 2 vers `main`, correction des alertes de la CI, campagne Maestro sur l'APK de la CI, fusion, puis séance de clôture (questions de `docs/QUESTIONS.md`, bilan des décisions).

**Ce que l'IA a fait** :
- **CI de la PR #88** : Semgrep (`detect-non-literal-regexp`) et CodeQL (espace de noms Android lu avec ses points comme jokers) signalaient `scripts/audit-apk.js` et des tests. Correctif par la branche `ticket/j2-correctif-analyse-statique` (PR #89, sans numéro de ticket, fusion validée par le porteur) : plus aucune RegExp construite dans le dépôt, espace de noms comparé tel quel ; aucune règle désactivée. Ensuite, CI toute verte sur le dernier commit (Semgrep, CodeQL, Android APK et audit, iOS simulateur, dépendances, gitleaks, tests).
- **Campagne Maestro** sur l'APK de la CI (run 46110229001) : 7 parcours sur 7 en 15 min 17 s sur l'émulateur.
- **Fusion** de la PR #88 en squash (`main` à `40d70bb`) ; tickets 020 à 030 passés à « fait ».
- **Séance de clôture** : les 6 questions de la file posées ; lignes de confirmation ajoutées en bas de `docs/DECISIONS.md`, sans toucher aux lignes d'origine.

**Ce qui a été corrigé par les revues** : la revue du correctif a trouvé un **défaut ancien** de l'audit SEC-02 : `allowBackup="false"` présent n'importe où dans la sortie de `aapt2` suffisait. L'attribut n'est plus lu que sur l'élément `application`, et doit valoir `false`.

**Ce que j'ai corrigé ou refusé** : rien à corriger. Le porteur confirme les 6 options appliquées (023 : « Ce mois » sans saison active ; 021 : retour à l'accueil pour un membre sans alerte ; 027 : un appel libre ne retire pas la relance ; 028c : relance illisible, appli ouverte, rien ne s'ouvre ; 028b : lecture en échec, rien n'est annulé ; 028b : relance désactivée ou permission retirée, les relances affichées dont l'appel manque restent). Il décide de fusionner **sans le prétest sur l'A55** : le prétest reste à faire, et chaque défaut devient un ticket du jalon 3.

**Bilan des décisions du jalon 2** : 204 décisions automatiques ; 11 changées après contradiction ; 0 contestée maintenue ; 0 annulée (2 depuis le début du projet, celles du 015b) ; 0 en attente.

**Leçons** :
- Durcir un contrôle de sécurité, c'est aussi relire ce qu'il vérifiait déjà : l'alerte sur une regex a fait trouver un contrôle d'`allowBackup` trop lâche, plus ancien que le jalon 2.
- La file du porteur a tenu : 6 questions n'ont bloqué aucune fusion, et aucune réponse n'a demandé de correction.

### Lot J3-1 (031, 032, 033) — 2026-11-28

**Prompt clé** : séance de lancement du premier lot du jalon 3 (pré-analyse, QCM, plans des trois tickets en zone sensible), puis trois agents de code en parallèle, revues et intégration.

**Réponses du porteur au QCM du lot** :
- contrat commun 031 ↔ 032 (`parseCsv` → lignes numérotées comme dans le tableur, liste fermée des refus, `MAX_CSV_BYTES`) ;
- caractères refusés dans nom et prénom élargis (U+0080 à U+009F, U+2028, U+2029, sens d'affichage), à l'import comme à la saisie ; même règle à la restauration (sauvegarde refusée en entier) ;
- 033 : `eraseAll.test.tsx` ajouté ; découpage de `expoFiles.ts` autorisé d'avance (un seul fichier de plus dans la liste fermée).

**Réponses du porteur en revue** : MacRoman repéré et refusé ; caractères invisibles supplémentaires refusés (U+061C, U+200B, U+200E, U+200F, U+FEFF, demi-caractères isolés ; U+200D accepté) ; doublon de l'appli laissé sur « Ignorer » inscrit au groupe du CSV et désarchivé (au 034) ; 032 et 033 gardés entiers à 12 fichiers ; fusion des trois tickets validée.

**Ce que l'IA a fait** :
- **Développement** : 031 (`csvDecode.ts`, `csvParse.ts`, fichiers piégés en octets) ; 032 (`importFields.ts`, `memberImport.ts`, `validateMember` à 100 points de code sans caractère invisible) ; 033 (`expoImportPicker`, `readFileBytes`, `expoExports.ts`, `fileLock.run`, `cache/exports/` vidé au démarrage et après Tout effacer).
- **Intégration** : revues de code, contradicteur et revues de sécurité des trois tickets ; corrections renvoyées aux agents ; fusions une par une (PR #93, #94, #95) ; 50 décisions ajoutées à `docs/DECISIONS.md` ; SEC-01, SEC-06 et SEC-10 complétés ; maquette de l'aperçu et du refus « ancien format Mac » mise à jour ; reports vers 032b, 034, 035, 037 et 040.

**Ce qui a été corrigé par les revues** :
- **numéros de ligne** (031) : un champ sur plusieurs lignes faisait avancer le numéro, et `MALFORMED` donnait la ligne de l'éditeur de texte ; tout est compté en lignes du tableur (« Ligne 17 » de l'aperçu), directive `sep=` non comptée ;
- **doublons quadratiques** (032) : chaque ligne était comparée à chaque membre (2 000 × 10 000 comparaisons figeaient l'aperçu) ; clé de nom rangée dans une `Map`, test de volume sous 2 s ;
- **erreur d'effacement qui pouvait laisser fuir un nom de fichier** (033, revue de sécurité) : l'échec d'effacement de la copie du sélecteur remontait l'erreur native, qui peut citer le chemin ; code seul (`IMPORT_COPY_CLEAR_FAILED`, `RESTORE_COPY_CLEAR_FAILED`), copie reprise au démarrage ; erreurs de lecture, d'écriture et de partage remplacées par des messages sans chemin ;
- **BOM écrits en caractère invisible** : l'outil d'écriture des agents a écrit un U+FEFF littéral (fiche du 031) au lieu de son nom ; retiré à l'intégration, à surveiller dans le code et les tests (préférer `\uFEFF` ou des octets).

**Leçons** :
- Un contrat entre deux tickets parallèles se fixe au lancement, avec un exemple chiffré (« Ligne 17 ») : les deux revues l'ont vérifié sans se parler.
- Une boucle sur des données importées se mesure au volume maximal permis (2 000 lignes, base pleine), pas au fichier d'exemple.

### Lot J3-2 (034, 036, 038) — 2026-11-28

**Prompt clé** : séance de lancement du deuxième lot du jalon 3 (pré-analyse, QCM, plans des trois tickets en zone sensible), trois agents de code en parallèle, revues de code et de sécurité, contradicteur, puis intégration.

**Réponses du porteur au QCM du lot** :
- 034 : doublon archivé désarchivé seulement s'il est inscrit pendant l'import (texte de la maquette précisé) ;
- 036 : présences d'un groupe supprimé en « Sans groupe » dans l'export « Tous les groupes », jamais dans un export filtré ; EX-31 inchangée, l'encadrant filtre l'enfant dans le tableur (CONFORMITE §2.2) ;
- 038 : contrôle statique d'expo-print (noms refusés, argument écrit en entier) ; SEC-08 complétée à l'intégration.

**Réponses du porteur à la relecture** : doublon archivé désarchivé dès que le groupe du fichier est trouvé, inscrit ou non ; SEC-07 élargie à toute cellule (Q1) ; Q2 du 036 (séance à deux groupes dont l'un est supprimé) gardée comme limite connue, ticket 043 avec migration ; fusion des trois tickets validée.

**Ce que l'IA a fait** :
- **Développement** : 034 (`memberImportRepo.ts` : une transaction, aperçu recalculé dans la transaction, `IMPORT_STALE` ; `useMemberImport.ts`, `importSession.ts`) ; 036 (`csvWrite.ts`, `attendanceCsv.ts`, `attendanceExportRepo.ts`, NF-08 sur 120 000 lignes) ; 038 (expo-print 58.0.9, `withoutWebViewMetrics.js`, `auditWebViewMetadata`, `staticChecksPrint.test.ts`, APK local audité).
- **Intégration** : PR #98, #99, #100 fusionnées dans le groupe ; 47 lignes ajoutées à `docs/DECISIONS.md` ; SEC-01, SEC-02, SEC-07, SEC-08, SEC-10, SEC-12 et CONFORMITE complétés ; reports vers 035, 037, 040 ; ticket 043 créé.

**Ce qui a été corrigé par les revues** :
- **contournement du contrôle statique** (038, revue de sécurité) : un nom de module écrit entre parenthèses, `require(('expo-print/build/ExponentPrint')).default.print({ uri })`, échappait au contrôle ; tout nom de module non littéral est maintenant refusé partout, tests compris (« ABS-01 module non littéral »), avec `.print(…)` et un filet texte sur `'expo-print'` ;
- **registre des licences non régénéré** (038, contradicteur) : expo-print était déjà lié comme module natif, et `licences.js --check` aurait échoué à la PR du jalon ; régénéré dans le ticket, comme le demande CONFORMITE §7 ;
- **aperçu gardé après un abandon pendant la lecture** (034, revue de sécurité) : un abandon ou un écran démonté pendant la lecture laissait la session se remplir ensuite ; génération de session changée à chaque `clear`, vérifiée avant de remplir la session ;
- ordre de l'extension dans `app.json` inversé (le premier plugin déclaré a le dernier mot) ; « Sans créneau » suivi de l'heure ; lignes réduites aux colonnes reconnues avant de les garder en mémoire.

**Leçons** :
- Un contrôle statique se teste aussi contre les formes détournées d'un même appel (parenthèses, `as`, gabarit), pas seulement contre l'appel direct.
- Une dépendance native liée dans un ticket entre au registre des licences dans le même ticket, même si le code qui l'appelle vient plus tard.
- Une règle de données qui dépend d'une ligne supprimée en cascade ne se corrige pas dans une requête : il faut une trace dans le schéma (Q2, ticket 043).

### Lot J3-3 (035, 037, 039) — 2026-11-28

**Prompt clé** : séance de lancement du troisième lot du jalon 3 (pré-analyse, QCM, écarts de maquette, plans de 037 et 039 en zone sensible), trois agents de code en parallèle, revues de code et de sécurité, contradicteur, puis intégration.

**Réponses du porteur au QCM du lot** :
- 035 : bouton « Inscrire M membres à leur groupe » quand N = 0 et M > 0 ; phrase du résultat à six compteurs (une partie à 0 disparaît) ; même rangée de deux boutons dans la liste vide ; colonnes reconnues non affichées (idée dans `docs/IDEES.md`) ; textes absents de la maquette validés ;
- 037 : plafond de 50 000 lignes ; textes des états (en cours, échec, groupe archivé, date) ;
- 039 : police du système pour le PDF (exception dans `design/CHARTE.md` §4).

**Réponses du porteur à la relecture** : 039 : légende P/R/E/A sous chaque tableau, « Aucun membre sur la période. », mention « Archivé », « Aucune présence comptée sur la période. » ; fusion de 037 et 039 validée.

**Ce que l'IA a fait** :
- **Développement** : 035 (`src/app/import/` : choix et refus, aperçu, résultat ; `FilterChip` en case à cocher) ; 037 (`useAttendanceExport.ts`, `src/app/stats/export.tsx`, plafond `MAX_EXPORT_ROWS`) ; 039 (`safeHtml.ts`, `reportHtml.ts`, `reportRepo.ts`, `rapport.ts`).
- **Intégration** : PR #103, #104, #105 fusionnées dans le groupe ; 48 lignes ajoutées à `docs/DECISIONS.md` ; SEC-08, SEC-09, SEC-10, SEC-12 complétés ; reports vers 039b, 040, 041, 043 ; ticket 044 créé (caractères invisibles dans les noms de groupe) ; maquette complétée (doublon archivé, nom du fichier CSV, légende du rapport).

**Ce qui a été corrigé par les revues** :
- **aperçu périmé exporté** (037, revues de code et de sécurité) : un appui juste après un changement de groupe ou de date pouvait exporter l'ancienne période ; chaque aperçu retient le choix pour lequel il a été lu, et le bouton reste désactivé tant qu'il ne correspond pas aux champs affichés ; le plafond est revérifié sous le verrou ;
- **repli silencieux sur « Tous les groupes »** (037, contradicteur) : un groupe sans séance sur la nouvelle période était remplacé par « Tous les groupes », ce qui élargissait l'export sans le dire ; le groupe reste choisi et l'état vide s'affiche, le repli ne vaut que pour un groupe supprimé ;
- **CSS échappée** (039, revue) : le gabarit échappait les apostrophes de la CSP et le `>` des sélecteurs ; la CSP et `reportCss` passent dans un en-tête de confiance (texte fixe, couleurs vérifiées, refusée si elle contient « < »), et un contrôle statique refuse l'appel direct `html(` ;
- **retours Android incohérents** (035, revue) : la touche Android menait aux membres depuis « Fichier non reconnu » et à l'écran de choix depuis le résultat, à l'inverse de la maquette ; retours alignés sur la maquette (`usePreventRemove`, `dismissTo` puis `push`).

**Leçons** :
- Un aperçu affiché à côté d'un bouton d'export doit dire pour quel choix il a été calculé ; sinon l'appui exporte ce qui était à l'écran une seconde plus tôt.
- Un repli « par défaut » qui élargit une sortie de données n'est jamais silencieux.
- Un gabarit qui échappe tout ne convient pas au CSS : le texte de confiance se sépare des données, puis un contrôle statique garde la frontière.
- Le retour Android se teste sur chaque écran (bouton, geste, touche), pas seulement le bouton « ‹ ».

### Lot J3-4 (039b, 032b, 044) — 2026-11-28

**Prompt clé** : séance de lancement du quatrième lot du jalon 3 (pré-analyse, QCM, plans de 039b et 044 en zone sensible), trois agents de code en parallèle, revues de code et de sécurité, contradicteur, puis intégration.

**Réponses du porteur** : 039b : teinte claire calculée, lettre foncée ; 044 : sauvegarde hors règle refusée en entier, aucune migration, export bloqué par un groupe ancien accepté (appli non publiée), saison, créneau et contact au 044b ; liste SEC-06 élargie pour tous les noms au 044b (U+200D et U+FE0F acceptés) ; relecture et fusion de 044 et 039b validées.

**Ce que l'IA a fait** :
- **Développement** : 039b (`reportGrid.ts`, `reportGridRepo.ts`, styles dans `reportCss`) ; 032b (`memberNameError`, contrôle champ par champ dans les deux formulaires du membre) ; 044 (`validateGroupName`, dépôt et restauration).
- **Intégration** : PR #108, #109, #110 fusionnées dans le groupe ; 19 lignes ajoutées à `docs/DECISIONS.md` ; SEC-06, SEC-08, SEC-10 complétés ; reports vers 040 et 044b (découpage en 044b et 044c proposé).

**Ce qui a été corrigé par le contradicteur** (4 décisions changées) :
- texte de `NAME_INVALID_CHAR` : « effacez le champ et retapez le nom », l'encadrant ne voit pas le caractère à retirer ;
- `maxLength` retiré (au lancement) : il coupait un texte collé sans rien dire et le message n'apparaissait jamais ;
- colonne « Nom Prénom » unique de 40 mm, comme la maquette (039b) ;
- légende de la grille reprise de la maquette, construite à partir des lettres et des statuts (039b).

**Leçons** :
- Une limite de saisie qui coupe en silence empêche le message d'erreur d'apparaître : le contrôle se fait sur la valeur, pas sur le clavier.
- Un message d'erreur dit quoi faire avec ce que l'utilisateur voit, pas avec ce qu'il ne voit pas.

### [Étape] — [AAAA-MM-JJ]

**Prompt**

```text
[le prompt, tel quel]
```

**Ce que l'IA a fait** : [ ]

**Ce que j'ai corrigé ou refusé** : [ ]

**Décision** : [ ]
