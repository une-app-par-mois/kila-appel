# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-27

## En cours

**Jalon 2 (Suivre l'assiduité), lot J2-2 fusionné** dans `groupe/jalon-2-suivre-assiduite` : 022 alertes, écrans (PR #72), 024 onglet Stats et période (PR #73), 027 relance, calcul et réglages (PR #74) ; **1526 tests**. Lot J2-1 fusionné avant (021, 023, 026 : PR #68, #69, #70). Intégration documentaire : branche `ticket/lot-j2-2-integration`. Jalon 1 fait (PR #63, `main` à `91ed684`), jalon 0 fait (PR #7).

Décisions du lot : 50 lignes ajoutées à `docs/DECISIONS.md` (5 du 027 déjà présentes depuis le découpage, non dupliquées) ; 1 en attente du porteur, dans `docs/QUESTIONS.md` (027 : un appel sans créneau du même jour ne retire pas la relance). ABS-08 du 027 et public cible 16 ans et plus (§8, décision du porteur) au journal de `docs/CONFORMITE.md`.

## Prochaines étapes

1. **Lot J2-3 : 020, 025, 028** (séance de lancement, pré-analyse, QCM ; plan du 028 en zone sensible). Reports déjà écrits dans les fiches : appui sur un groupe de l'onglet Stats et case vide de `SessionSquares` (025) ; requête des séances avec `state` dans `sessionsRepo.ts`, heure d'été et d'hiver, déclencheur passé, erreur de `plannedReminders` attrapée (028).
2. Lots suivants : 029 (état réel après une restauration, ligne Relance, clé `alerts.settingsSection`), puis 030 (campagne Maestro, NF-08 sur l'appareil, focus de l'écran d'alerte et `dismissTo` de l'écran Période).
3. **Recette sur l'A55 en cours le 2026-11-27** (lots 4, 5, 6 du jalon 1 et lot J2-1 ; décision du porteur du 2026-11-27 ; liste mise à jour par le porteur après la recette). À vérifier à la main dès que le téléphone est disponible :
   - aller-retour réel : export vers Drive ou Gmail, puis restauration de ce fichier ; restauration depuis Drive ;
   - base réellement abîmée (APK de debug, `run-as`) : écran « abîmée », confirmation, Bienvenue ; restauration depuis l'écran de récupération (014f) ;
   - brouillon après redémarrage de l'appareil ;
   - durée de `quick_check` avec une grosse base fictive ;
   - blocage du retour Android pendant l'effacement et la recopie (014f) et pendant Tout effacer (015f) ;
   - Tout effacer, restauration sur une base recréée et invitation après le premier appel : vus **sur l'émulateur seulement** (016) ;
   - bandeau des 30 jours (014d) ; NF-01 au vrai doigt ; `scripts/e2e.sh --appareil-reel` ;
   - **APK avec expo-notifications** (026) : installation, démarrage, aucune ligne Firebase dans `adb logcat`, permissions affichées par le système ;
   - **relances réelles** (028, 029) : notification reçue, sans nom de membre, après un redémarrage ;
   - **durées NF-08 sur l'appareil** (alertes et statistiques, jeux de volume, 030).
4. **Vérifications iPhone avant le jalon 7** (toute publication iOS) : restauration réelle puis `tmp/` vide ; aucun lien dans `Caches/expo-sharing-tmp/` ; préfixe du cache identique entre expo-file-system et expo-modules-core ; Inbox `tmp/<identifiant>-Inbox/` vidée par Tout effacer et par le démarrage ; restauration depuis l'écran de récupération ; build iOS avec expo-notifications sans habilitation.
5. PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.

## Points d'attention

- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 0 vulnérabilité (revu le 2026-11-27 après le 026) depuis le 018 (glob) et le 017 (minimatch), par `overrides` limités à la plage vulnérable ; CI à `--audit-level=high`.
- `@expo/devtools` est dans le bundle de production : client WebSocket d'expo-sqlite, appelé seulement si `__DEV__` ; INTERNET absente du binaire. Pas une violation d'ABS-01.
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Registre des licences (EX-42, jalon 6) : y faire figurer les polices IBM Plex (OFL 1.1, `assets/fonts/SOURCES.md`).
- `node:sqlite` est expérimental dans Node 22 : avertissement à chaque test de données, sans effet.
- Index des SDK de Play : Firebase Messaging présent dans le binaire (inactif, retiré du manifeste) peut être signalé à la soumission (CONFORMITE §3).
- Questions ouvertes : contenu du rapport PDF (ticket F-09) ; migration 1 à lancer sur le téléphone (ticket 004, fin d'ADR-008) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.
- **Dependabot** ouvre ses PR vers `main` : chacune lance aussi les builds Android et iOS (environ 30 min).
- Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).

## Non vérifié

- **Bases de test à effacer** (Galaxy A55, émulateur) : une base d'un ancien build (migration 1 sans `slots.schedule_from`) fait échouer la création d'un créneau et donne aussi un accueil vide (`DRAFT_LOAD_FAILED`, `PROPOSED_SESSION_FAILED`, `MISSING_CALLS_FAILED`, avec `DB_READY` version 1), constaté sur l'émulateur au 016. **Désinstaller Ki&La avant d'installer** un nouvel APK.
- Requêtes métier sur le module natif `expo-sqlite` : vues sur l'émulateur (016) ; sur le Galaxy A55, recette des lots 4 à 6 non faite. Rien encore sur un iPhone réel.
- **Requêtes du lot J2-1 jamais lancées par expo-sqlite sur un appareil** : séries d'absences (CTE, `ROW_NUMBER`, 021) et agrégats des statistiques (`+e.group_id` pour forcer l'index `enrollments_member`, 023) ; vérifiées sur `node:sqlite` seulement. APK de la CI et build iOS avec expo-notifications : à la PR du jalon vers `main`.
- **Écrans du lot J2-2 jamais vus sur un appareil** : alertes (focus et retour Android de l'écran d'alerte, recherche d'urgence limitée au membre), onglet Stats (`router.dismissTo` de l'écran Période, textes agrandis, tablette) ; testés avec le routeur simulé de Jest seulement.
- Couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
