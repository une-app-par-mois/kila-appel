# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-28

## En cours

**Jalon 3 en cours** (Entrer et sortir les données : F-07 import CSV, F-08 export CSV, F-09 rapport PDF), branche `groupe/jalon-3-entrer-sortir-donnees`, partie de `main` ; 15 tickets (031 à 042, avec 032b et 039b, plus 043 créé au lot J3-2), plans validés par le porteur le 2026-11-28 (sauf 043).

**Lot J3-2 fait** : fusionné dans le groupe le 2026-11-28 après la relecture du porteur : 034 (enregistrement de l'import, PR #99), 036 (contenu du CSV des présences, PR #98), 038 (expo-print 58.0.9 verrouillé, WebView d'Android sans mesures d'usage, PR #100). Intégration : branche `ticket/lot-j3-2-integration` (47 lignes ajoutées à `docs/DECISIONS.md`, SEC-01, SEC-02, SEC-07, SEC-08, SEC-10, SEC-12 complétés, CONFORMITE §2.2, §3, §8). Réponses du porteur du 2026-11-28 : doublon archivé désarchivé dès que le groupe du fichier est trouvé ; SEC-07 élargie à toute cellule ; Q2 du 036 gardée comme limite connue, ticket 043 (migration). Aucune question en attente dans la file du porteur.

**Lot J3-1 fusionné dans le groupe** (031, 032, 033 : PR #93, #94, #95).

Jalon 2 fait (PR #88, `main` à `40d70bb`, sans le prétest sur l'A55, décision du porteur du 2026-11-28 : tout défaut trouvé au prétest devient un ticket du jalon 3) ; jalon 1 fait (PR #63) ; jalon 0 fait (PR #7).

## Prochaines étapes

1. **Lot suivant : 035, 037, 039** (séance de lancement : pré-analyse, QCM, plans en zone sensible pour 037 et 039).
   - 035 (écrans de l'import) : écart de maquette à poser au porteur (compteurs `duplicatesEnrolled` et `unarchived` du résultat) ; `confirm(aperçuAffiché, kept)`, `owner: true` sur l'écran de choix.
   - 037 (écran de l'export) : mesurer la mémoire sur l'A55 (`volumeSeed`, 120 000 lignes), plafond de lignes si besoin ; durée de `groups()`.
   - 039 (HTML du rapport) : échappement et CSP (SEC-08, « à venir 039 »).
2. **Ensuite** : 039b, 040 (après 038, 039, 039b : CSP, échappement, effacement de `cache/Print/`, simulation par une fabrique, contrôle « exactement »), 041, 032b, 042 (Maestro du jalon 3) et **043** (trace des groupes d'une séance, migration, zone sensible).
3. **Prétest du jalon 2 sur l'A55**, à faire par le porteur (désinstaller Ki&La avant d'installer l'APK de la CI de la PR #88) :
   - base réellement abîmée (APK de debug, `run-as`) et restauration depuis l'écran de récupération (014f) ; durée de `quick_check` avec une grosse base fictive ;
   - bandeau des 30 jours (014d) ; `scripts/e2e.sh --appareil-reel` ;
   - écrans des alertes (022), du choix de période (024), de la conservation (020), statistiques d'un groupe et d'un membre (025 : 35 cases, tablette, TalkBack) ;
   - **relances (028b, 028c, 029)** : activation et dialogue de permission (Android 13+), dialogue fermé sans réponse, refus puis réglages et retour, relance reçue à l'heure sans nom sur l'écran verrouillé, bannière appli ouverte sans pastille, appui appli fermée, en arrière-plan et ouverte, rien après Tout effacer, Doze et redémarrage, mode avion, retour Android bloqué pendant la demande ;
   - **NF-08 sur l'appareil** : sauvegarde de volume du 030 restaurée, accueil et onglet Stats jugés à l'œil.
   Déjà validé sur l'A55 le 2026-11-27 (APK `1a23be4`) : Bienvenue, appel, onglet Stats, brouillon, export et restauration par Drive, Tout effacer puis restauration ; audit SEC-02 conforme.
4. **Vérifications iPhone avant le jalon 7** : restauration réelle puis `tmp/` vide ; `Caches/expo-sharing-tmp/` ; Inbox vidée ; build iOS avec expo-notifications et expo-print sans habilitation (`audit-ios.js` non rejoué au 038, pas de build iOS sur ce poste).
5. PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.

## Points d'attention

- **Prétest sur l'A55 des jalons 2 et 3 à faire** (liste ci-dessus) : le jalon 2 est dans `main` sans lui (décision du porteur du 2026-11-28) ; chaque défaut trouvé devient un ticket du jalon 3, classé selon PLAN §5.
- **Mémoire de l'export CSV à mesurer sur l'A55** (037) : `volumeSeed`, 120 000 lignes, pic estimé entre 100 et 200 Mo ; plafond de lignes si besoin.
- Limite connue (Q2 du 036) : une présence d'une séance à deux groupes dont l'un est supprimé passe au groupe restant (statistiques et export), jusqu'au ticket 043.
- **Vérifications du jalon 3 sur l'A55** (en plus du prétest du jalon 2) : CSV d'Excel (UTF-8, Windows-1252, MacRoman refusé) venus de Drive et de Gmail ; `File.size` d'une copie absente, BOM gardé par `File.write(string)`, `File.create()` puis `write()` dans un sous-dossier neuf ; `text/csv` accepté par Drive et Gmail ; envoi différé vers Drive lu avant l'effacement du sous-dossier (037, 040) ; UTI `public.comma-separated-values-text` et `com.adobe.pdf` sur iPhone (jalon 7).
- Outil d'écriture des agents : un U+FEFF littéral (caractère invisible) a été écrit dans une fiche au lot J3-1 ; à surveiller dans le code et les tests (écrire `\uFEFF` ou des octets).
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
- Questions ouvertes : migration 1 à lancer sur le téléphone (ticket 004, fin d'ADR-008) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- Nom de paquet : `com.jitavision.kila` (Android et iOS), décidé le 2026-11-26.
- `main` protégée (ruleset vérifié) ; hooks Git activés.
- **Dependabot** ouvre ses PR vers `main` : chacune lance aussi les builds Android et iOS (environ 30 min).
- Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).

## Non vérifié

- **Bases de test à effacer** (Galaxy A55, émulateur) : une base d'un ancien build (migration 1 sans `slots.schedule_from`) fait échouer la création d'un créneau et donne aussi un accueil vide (`DRAFT_LOAD_FAILED`, `PROPOSED_SESSION_FAILED`, `MISSING_CALLS_FAILED`, avec `DB_READY` version 1), constaté sur l'émulateur au 016. **Désinstaller Ki&La avant d'installer** un nouvel APK.
- Requêtes métier sur le module natif `expo-sqlite` : vues sur l'émulateur (016) ; sur le Galaxy A55, recette des lots 4 à 6 non faite. Rien encore sur un iPhone réel.
- **Requêtes du lot J2-1 jamais lancées par expo-sqlite sur un appareil** : séries d'absences (CTE, `ROW_NUMBER`, 021) et agrégats des statistiques (`+e.group_id` pour forcer l'index `enrollments_member`, 023) ; vérifiées sur `node:sqlite` seulement. APK de la CI et build iOS simulateur avec expo-notifications : construits par la CI de la PR #88 (APK audité conforme).
- **Écrans des lots J2-2 et J2-3 jamais vus sur un téléphone** : statistiques d'un groupe et d'un membre, phrase de conservation du 020 ; alertes (focus et retour Android de l'écran d'alerte, recherche d'urgence limitée au membre), onglet Stats (`router.dismissTo` de l'écran Période, textes agrandis, tablette) ; testés avec le routeur simulé de Jest, puis sur l'émulateur par la campagne du 030 (retour Android de l'écran d'alerte, `dismissTo` de l'écran Période, statistiques de la saison) ; rien sur un téléphone.
- **Relances (028a, 028b, 028c, 029)** : branchées et dans le bundle ; APK de production reconstruit et audité en local après la fusion (conforme, mêmes trois permissions, INTERNET absente, aucune ligne Firebase sur l'émulateur), mais aucune relance programmée ni délivrée sur un appareil, annulation ciblée et retrait des SharedPreferences non vus ; Hermes non vérifié pour les heures doublées ; iOS : build simulateur de la CI seulement. Contrôle statique SEC-03 : un nom calculé (`obj[a + b]`) n'est pas détecté, `jest.setup.js` n'est pas parcouru. `expoNotifications.ts` et `staticChecksNotifications.test.ts` à 300 lignes (découper au prochain ajout).
- **Lot J3-2** : import, export et expo-print vérifiés sur `node:sqlite` et Jest seulement, sauf le 038 (APK de production local audité conforme, démarrage sur l'émulateur) ; APK de la CI et build iOS avec expo-print non vérifiés ; NF-08 de l'import (2 000 lignes) et de l'export mesurés sur le poste, pas sur l'A55.
- Couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
