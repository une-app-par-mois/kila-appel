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

### [Étape] — [AAAA-MM-JJ]

**Prompt**

```text
[le prompt, tel quel]
```

**Ce que l'IA a fait** : [ ]

**Ce que j'ai corrigé ou refusé** : [ ]

**Décision** : [ ]
