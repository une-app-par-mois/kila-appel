# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-27

## En cours

**Jalon 2 (Suivre l'assiduité), lot J2-3 fusionné** dans `groupe/jalon-2-suivre-assiduite` : 020 accords au singulier (PR #77), 025 statistiques d'un groupe et d'un membre (PR #78), 028a relance, adaptateur et garde-fous (PR #79) ; **1653 tests**. Lots J2-1 (021, 023, 026) et J2-2 (022, 024, 027) fusionnés avant. Le 028 est découpé par le porteur en 028a (fait) et 028b (fiche `docs/tickets/028b-relance-reprogrammation.md`). Intégration documentaire : branche `ticket/lot-j2-3-integration`. Jalon 1 fait (PR #63, `main` à `91ed684`), jalon 0 fait (PR #7).

Décisions du lot : 63 lignes ajoutées à `docs/DECISIONS.md` (la ligne « Tout effacer et relances » du 028, déjà présente, non dupliquée), dont les réponses du porteur au QCM (020, 025, découpage du 028, plan ajusté, 028a gardé à 12 fichiers) et ses trois réponses pour le 028b. Aucune nouvelle question en file ; la question 023 « séance sans statut » sort de `docs/QUESTIONS.md` (répondue au 025).

## Prochaines étapes

1. **Lot J2-4 : 028b et 029** (séance de lancement, pré-analyse, QCM ; plans en zone sensible). 028b : `useReminders` (ouverture, premier plan, chaque écriture), appui sur la notification, `_layout.tsx`, Tout effacer, canal « Relances » en importance haute, `setNotificationHandler`, retrait des relances affichées dont l'appel est fait ; reports B1 à B4, Doze, appui appli fermée, registre des licences. 029 (dépend du 028a seulement) : `requestPermissionsAsync` avec les options iOS, échec de lecture de la permission, état réel après une restauration, ligne Relance, clé `alerts.settingsSection`.
2. Puis 030 (campagne Maestro, NF-08 sur l'appareil, focus de l'écran d'alerte, `dismissTo` de l'écran Période, lecture de « — » par TalkBack).
3. **Recette sur l'A55 du 2026-11-27, faite par le porteur** avec l'APK de production du jalon 2 (`1a23be4`, après les PR #72 à #74). L'audit SEC-02 est conforme. Par le câble : 2 permissions (`POST_NOTIFICATIONS` non accordée, `RECEIVE_BOOT_COMPLETED`), `DB_READY` version 1, aucune ligne Firebase dans le processus de Ki&La (celles du journal venaient de `com.facebook.katana`). Le porteur a validé :
   - Bienvenue, mise en route, appel au doigt (NF-01, dit « ok », durée non relevée), onglet Stats ;
   - brouillon repris après redémarrage de l'appareil ;
   - export vers Drive, modification, puis restauration depuis Drive, retour Android bloqué ;
   - Tout effacer (retour bloqué), retour à Bienvenue, puis restauration de la sauvegarde sur la base recréée.

   **Reste à vérifier sur l'A55**, laissé de côté par le porteur le 2026-11-27 :
   - base réellement abîmée (APK de debug, `run-as`) et restauration depuis l'écran de récupération (014f) ;
   - durée de `quick_check` avec une grosse base fictive ;
   - bandeau des 30 jours (014d) ; `scripts/e2e.sh --appareil-reel` ;
   - écrans des alertes (022) et du choix de période (024) : focus, retour Android, `dismissTo` ;
   - écrans du lot J2-3 : « Garder la [1 ▾] dernière saison » (020), statistiques d'un groupe et d'un membre (025 : 35 cases, tablette, TalkBack) ;
   - **relances réelles** (028b, 029) : notification reçue, sans nom de membre, après un redémarrage ;
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
- **Écrans des lots J2-2 et J2-3 jamais vus sur un appareil** : statistiques d'un groupe et d'un membre, phrase de conservation du 020 ; alertes (focus et retour Android de l'écran d'alerte, recherche d'urgence limitée au membre), onglet Stats (`router.dismissTo` de l'écran Période, textes agrandis, tablette) ; testés avec le routeur simulé de Jest seulement.
- **Adaptateur des relances (028a)** : importé par aucun écran, donc absent du bundle ; APK de production construit et audité en local (conforme, INTERNET absente, aucune ligne Firebase), mais aucune notification programmée sur un appareil ; Hermes non vérifié pour les heures doublées. Contrôle statique SEC-03 : un nom calculé (`obj[a + b]`) n'est pas détecté.
- Couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
