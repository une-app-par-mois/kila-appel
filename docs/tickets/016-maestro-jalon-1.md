# 016 — Campagne Maestro du jalon 1

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Parcours de bout en bout en fin de jalon, sur l'APK de la CI.

## À lire

- `docs/CONVENTIONS.md` §5.2
- `docs/PLAN.md` jalon 1

## Ce qui change

- `.maestro/` : trois parcours ; script `e2e`

## Critères d'acceptation

- [ ] Appel de 20 membres chronométré
- [ ] Brouillon retrouvé après fermeture forcée
- [ ] Sauvegarde jusqu'à la feuille de partage (avertissement « en clair » visible) → tout effacer → restauration d'une sauvegarde fictive générée par le script (déposée dans Téléchargements), données vérifiées à l'écran ; aller-retour réel à faire à la main sur un téléphone

## Tests attendus

- Les trois parcours verts sur l'émulateur local ; passage sur l'A55 « non vérifié » (téléphone indisponible)

## Hors périmètre

- Parcours iOS (jalon 7)

## Questions prévues

- Séance de lancement du lot 018-016 (2026-11-27), réponses du porteur :
  - aller-retour : export jusqu'à la feuille de partage, puis Tout effacer, puis restauration d'une sauvegarde fictive générée par le script (pas de binaire versionné) et déposée par `adb push` dans Téléchargements ; vérification à l'écran ;
  - A55 : émulateur seul ; passage sur l'A55 noté « non vérifié » dans ETAT et la PR ; le script refuse de tourner si un appareil réel est branché, sauf option explicite ;
  - où : émulateur local (Maestro 2.12.0 déjà installé, émulateurs présents) ; mise au point sur un APK de production construit en local ; campagne finale sur l'artefact de la CI de la PR du jalon ; aucun workflow modifié ; statistiques de Maestro désactivées (`MAESTRO_CLI_NO_ANALYTICS=1`).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Comment le générateur Node réutilise `src/data/` (TypeScript, alias `@/`) sans dépendance ? | Node 22 `--experimental-transform-types` et un crochet de résolution `@/` → `src/` (`module.registerHooks`) ; passer par Jest ; compiler avec `tsc` dans un dossier temporaire | Node 22 et crochet (`scripts/e2e/sauvegarde-fictive.mjs`) | Aucune dépendance, le code de `src/data/` tel quel ; `--experimental-transform-types` est nécessaire (propriété de paramètre dans `backupCheck.ts`) ; fonction expérimentale de Node 22. Le test Jest appelle `writeE2eBackup` par Jest seulement, jamais le `.mjs` ni le crochet : le lanceur n'est vérifié que par la campagne elle-même et par des essais à la main (dates 2026-07-15, vide, mal formée). Node 22.15 au moins (`module.registerHooks`), vérifié par `e2e.sh` et par le `.mjs` | à relire |
| Où vit la sauvegarde fictive ? | `src/__fixtures__/e2eBackup.ts` (déjà hors du typage de l'appli, à côté de `seed.ts`) ; `scripts/e2e/*.ts` (à exclure de `tsconfig.json`) | `src/__fixtures__/e2eBackup.ts`, testé par `scripts/e2e/sauvegarde-fictive.test.ts` | Aucun réglage de `tsconfig` à changer ; passe par les dépôts de l'appli (saison, groupes, membres, appels sans créneau) puis par `exportBackup` : une vraie sauvegarde de l'appli | à relire |
| Contenu de la sauvegarde fictive | Petit jeu fixe ; jeu plus gros | 2 groupes (« Poussins mercredi », « Benjamins samedi »), 5 membres fictifs, 3 appels sans créneau à J-7, J-10, J-14 (ramenés au début de saison si besoin) | Tous dans les 30 derniers jours : l'Historique les montre sans changer de filtre ; des taux de présence différents (3/3, 1/2, 1/3) distinguent les trois lignes | à relire |
| Sélecteurs ambigus | `testID` dans `src/app/` ; `index` ou `childOf` dans le parcours | `index: 1` pour le bouton « Créer un groupe » de Bienvenue (le titre de l'étape porte le même texte), `childOf` le tiroir du sélecteur pour « Downloads » ; `testID` existant `history-row` pour compter les appels | Aucun changement dans `src/app/` | à relire |
| Choix de l'appareil par le script | Un seul appareil adb, sinon `ANDROID_SERIAL` ; émulateur reconnu par son numéro `emulator-*` **et** `ro.kernel.qemu`/`ro.boot.qemu` à 1 | Les deux conditions ; sinon refus, sauf `--appareil-reel` | Un téléphone n'est jamais pris pour un émulateur par son seul nom | à relire |
| Jour des données fictives | Jour de la machine ; jour de l'appareil | Jour de l'appareil (`adb shell date +%F`), passé au générateur | Les séances fictives tombent dans les 30 derniers jours de l'appareil, même si son horloge diffère | à relire |
| Mesure de NF-01 sur l'émulateur | Seuil de 30 s tel quel ; seuil relevé pour Maestro | 30 s tel quel, de l'appui sur le groupe jusqu'à « Appel enregistré » | Demande du ticket ; un dépassement se lit comme une alerte, la mesure qui fait foi reste sur le téléphone | à relire |
| Appuis de l'appel chronométré : Maestro coûte environ 2,2 s par appui (même par point, ou avec `retryTapIfNoChange: false` et `waitToSettleTimeoutMs`) et jusqu'à 5 s par défilement sur l'émulateur local ; un premier scénario à 8 changements de statut (3 absents, 1 retard, 1 excusé à 3 appuis) a mesuré 30,6 s et 30,9 s | Garder ce scénario et échouer ; relever le seuil ; un appel ordinaire plus court | Appel ordinaire : 3 absents et 1 retard (5 appuis sur les membres), seuil de 30 s inchangé | Le seuil n'est pas affaibli ; la durée mesure surtout l'outil, pas l'appli (chaque appui est rendu aussitôt) ; un excusé à 3 appuis n'est pas un cas ordinaire. Le porteur garde tel quel ce scénario, le seuil de 30 s et le départ du chronomètre | décidée par le porteur le 2026-11-27 |
| Départ du chronomètre : CADRAGE l.113 et NF-01 disent « de l'ouverture à l'enregistrement » ; le parcours part de l'appui sur le groupe dans la liste des groupes (Nouvel appel), donc l'ouverture de l'appel est comprise | Partir de l'écran d'appel affiché ; partir de la liste des groupes | Partir de la liste des groupes, tel quel | Écart au cadrage noté. Marge mince : 25,4 s avec 3 absents et 1 retard, contre 30,6 s et 30,9 s avec 8 changements de statut | décidée par le porteur le 2026-11-27 |
| Saison de la sauvegarde fictive en juillet et en août (revue) | Saison de Bienvenue (`firstSeason`, qui commence le 1er septembre suivant) ; saison qui contient aujourd'hui | Saison qui contient aujourd'hui (`seasonContaining`) | Sinon les appels fictifs tombent avant le début de la saison ou dans le futur (`DATE_IN_FUTURE`) ; tests au 2026-07-15 et au 2026-08-31 | à relire |
| Robustesse des écrans du système (revue) | Identifiants propres à une version ; texte | Feuille de partage repérée par le nom du fichier seul ; sélecteur : « Show roots » ou « Afficher les répertoires racines », « Downloads » ou « Téléchargements », DocumentsUI de Google ou d'AOSP | `com.android.intentresolver` n'existe qu'à partir d'Android 14 ; émulateur en anglais ou en français | à relire |
| Reconnaître un émulateur (revue) | Numéro `emulator-*` et qemu ; qemu seul | `ro.kernel.qemu` (ou `ro.boot.qemu`) à 1, quel que soit le numéro | Un émulateur relié en TCP est accepté ; tout appareil réel reste refusé sans `--appareil-reel` | à relire |

## Questions pour le porteur

Aucune question en attente : le scénario de l'appel chronométré a été décidé par le porteur le 2026-11-27.

## À reporter

- CHANGELOG : « Tests : campagne Maestro du jalon 1 (`scripts/e2e.sh`, `.maestro/`) : appel de 20 membres chronométré, brouillon après fermeture forcée, sauvegarde puis tout effacer puis restauration d'une sauvegarde fictive générée à chaque lancement (ticket 016). »
- Architecture : §2, ligne « Hors npm » : « **Maestro 2.12.0** (licence Apache-2.0 ; parcours de bout en bout, campagne de fin de jalon ; statistiques désactivées par `MAESTRO_CLI_NO_ANALYTICS=1`) ». §8, ligne « Bout en bout » : lancés par `scripts/e2e.sh` sur un émulateur Android ; la restauration lit une sauvegarde fictive produite par `src/__fixtures__/e2eBackup.ts` (jamais versionnée).
- Résultats (2026-11-27, émulateur local `Medium_Phone_API_36.1`, Android 16 / API 36, écran 320 × 640, APK de version construit en local depuis ce ticket) : campagne complète `./scripts/e2e.sh` verte, `exit 0`.
  - `appel-20-membres` : vert ; **25,4 s** de l'appui sur le groupe à « Appel enregistré » (3 absents, 1 retard). Temps surtout pris par Maestro (environ 2,2 s par appui, jusqu'à 5 s par défilement) ; un scénario plus chargé (8 changements) a mesuré 30,6 s et 30,9 s, scénario gardé par le porteur le 2026-11-27.
  - `brouillon-fermeture-forcee` : vert ; statuts retrouvés après `stopApp` juste après le dernier appui (Absent, Retard, Excusé, compteur, « 1 absent noté » à l'accueil).
  - `sauvegarde-restauration` : vert ; feuille de partage atteinte (nom `kila-sauvegarde-AAAA-MM-JJ.db`), avertissement « en clair » vérifié au mot près, Tout effacer puis Bienvenue, sélecteur DocumentsUI → Downloads → fichier fictif, résumé « 5 membres · 2 groupes · 3 séances », puis Historique (3 appels exactement), Groupes et Membres vérifiés.
  - Après les corrections de revue et la fusion du jalon (APK de version reconstruit) : campagne complète de nouveau verte, `exit 0` ; appel de 20 membres en **24,9 s**. Sélecteur vérifié aussi avec DocumentsUI en français (`cmd locale set-app-locales … fr-FR`), état retenu puis remis à zéro : « Afficher les répertoires racines », « Téléchargements ». Sauvegarde fictive écrite à la main par le `.mjs` au 2026-07-15 ; date vide et date mal formée refusées.
  - Mise au point : un premier passage échouait dans le sélecteur (« Downloads » touché ailleurs que dans le tiroir) : sélecteur précisé par `childOf` le tiroir, vérifié 3 fois de suite, dont une après remise à zéro de DocumentsUI. L'émulateur (GPU de l'hôte) s'est arrêté une fois pendant la mise au point ; relancé avec `-gpu swiftshader_indirect`, sans autre incident.
  - Constat sans rapport avec le ticket : un premier lancement **par-dessus une installation plus ancienne** déjà présente sur l'émulateur est resté sur l'accueil vide (`DRAFT_LOAD_FAILED`, `PROPOSED_SESSION_FAILED`, `MISSING_CALLS_FAILED`, `DB_READY` version 1). Après désinstallation, tout fonctionne. Probablement une base d'un ancien build de développement dont le schéma « version 1 » a changé depuis (migration 1 modifiée avant publication) ; non creusé.
- Non vérifié :
  - passage sur l'A55 (téléphone indisponible, décision du porteur) ; campagne finale sur l'artefact APK de la CI de la PR du jalon (à lancer par l'IA principale : `./scripts/e2e.sh <apk de la CI>`) ;
  - aller-retour réel (export partagé vers Drive ou Gmail, puis restauration de ce fichier-là) : seulement jusqu'à la feuille de partage, puis une sauvegarde fictive ;
  - brouillon après **redémarrage de l'appareil** ou mort du processus par le système (seulement `stopApp`) ;
  - `--appareil-reel` jamais essayé (aucun téléphone branché, consigne) ;
  - durée de NF-01 sur un vrai doigt.
- Recette non faite d'ETAT (lots 4 et 5) couverte ici, **sur émulateur seulement** : Tout effacer (Bienvenue, saison recréée) ; restauration depuis Téléchargements sur une base recréée par Tout effacer (expo-sqlite natif) ; invitation après le premier appel (« Premier appel enregistré »). Restent non couverts : base réellement abîmée, restauration depuis Drive, bandeau des 30 jours, durée de `quick_check`, blocage du retour Android pendant l'effacement et la recopie.
