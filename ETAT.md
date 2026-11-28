# État du projet

Mis à jour à la fin de chaque ticket. **100 lignes au plus** : on remplace, on n'empile pas ; l'historique vit dans les PR et `PROMPTS.md`.

Dernière mise à jour : 2026-11-28

## En cours

**Jalon 3 en cours** (Entrer et sortir les données : F-07 import CSV, F-08 export CSV, F-09 rapport PDF), branche `groupe/jalon-3-entrer-sortir-donnees`, partie de `main` ; 16 tickets (031 à 042, avec 032b et 039b, plus 043 créé au lot J3-2 et 044 créé au lot J3-3), plans validés par le porteur le 2026-11-28 (sauf 043 et 044).

**Lot J3-3 fait** : fusionné dans le groupe le 2026-11-28 : 035 (écrans de l'import, PR #105), 037 (écran et partage de l'export CSV, PR #103) et 039 (HTML du rapport : synthèse et taux, PR #104), ces deux derniers après la relecture du porteur. Intégration : branche `ticket/lot-j3-3-integration` (48 lignes ajoutées à `docs/DECISIONS.md` ; SEC-08, SEC-09, SEC-10, SEC-12 complétés ; maquette complétée ; ticket 044 créé). File du porteur : une question (035, nom lu par le lecteur d'écran sur la bascule, `docs/QUESTIONS.md`).

**Lots J3-1 et J3-2 fusionnés dans le groupe** (031, 032, 033 : PR #93, #94, #95 ; 034, 036, 038 : PR #99, #98, #100).

Jalon 2 fait (PR #88, `main` à `40d70bb`, sans le prétest sur l'A55, décision du porteur du 2026-11-28 : tout défaut trouvé au prétest devient un ticket du jalon 3) ; jalon 1 fait (PR #63) ; jalon 0 fait (PR #7).

## Prochaines étapes

1. **Lots suivants** (séance de lancement : pré-analyse, QCM, plans en zone sensible) :
   - **039b** (grille séance par séance) : CSS dans l'en-tête de confiance (`reportCss`), `SafeHtml`, contrôle statique de `html(` ;
   - **040** (production du PDF) : risque des orientations mélangées à vérifier en premier ; NF-08 mesuré sur l'A55 ; CSP en rendu réel sur iOS ; effacement de `cache/Print/` ;
   - **041** (écran du rapport) : `rapport.ts` dans `libelles/index.ts` ; bouton « Rapport PDF » sur les deux tiers restants de la rangée de Stats ;
   - **032b** (saisie du nom, 100 caractères) ; **042** (Maestro du jalon 3) ;
   - **043** (trace des groupes d'une séance, migration, zone sensible) : inverser aussi le test « RM-03 Q2 » de `reportRepo.test.ts` ;
   - **044** (caractères invisibles dans les noms de groupe, zone sensible) : U+202E renverse le nom dans le PDF.
2. **Prétest des jalons 2 et 3 sur l'A55**, à faire par le porteur (désinstaller Ki&La avant d'installer l'APK de la CI) :
   - jalon 2 : base abîmée et restauration depuis l'écran de récupération (014f) ; bandeau des 30 jours (014d) ; `scripts/e2e.sh --appareil-reel` ; écrans des alertes, de la période, de la conservation, statistiques d'un groupe et d'un membre (tablette, TalkBack) ; relances (permission Android 13+, refus puis réglages, relance sans nom sur l'écran verrouillé, appui appli fermée et ouverte, Tout effacer, Doze, redémarrage) ; NF-08 sur la sauvegarde de volume du 030 ;
   - jalon 3 : import d'un CSV d'Excel (UTF-8, Windows-1252, MacRoman refusé) venu de Drive et de Gmail, aperçu, bascules au lecteur d'écran, retours Android ; export CSV ouvert dans Excel ou LibreOffice (colonnes, accents, dates) ; `text/csv` accepté par Drive et Gmail.
   Déjà validé sur l'A55 le 2026-11-27 (APK `1a23be4`) : Bienvenue, appel, onglet Stats, brouillon, export et restauration par Drive, Tout effacer puis restauration ; audit SEC-02 conforme.
3. **Sauvegarde fictive de 120 000 lignes à préparer pour le porteur** (`volumeSeed`) : mesure de la mémoire et de la durée de l'export CSV sur l'A55 (pic estimé entre 100 et 200 Mo, plafond de 50 000 lignes en place).
4. **Vérifications iPhone avant le jalon 7** : restauration réelle puis `tmp/` vide ; `Caches/expo-sharing-tmp/` ; Inbox vidée ; build iOS avec expo-notifications et expo-print sans habilitation ; UTI `public.comma-separated-values-text` et `com.adobe.pdf`.
5. PR méthode n° 1 sur `une-app-par-mois/methode-vibe-coding` à relire par le porteur, app-template à suivre.

## Points d'attention

- **Prétest sur l'A55 des jalons 2 et 3 à faire** (liste ci-dessus) : le jalon 2 est dans `main` sans lui (décision du porteur du 2026-11-28) ; chaque défaut trouvé devient un ticket du jalon 3, classé selon PLAN §5.
- **Mémoire et durée de l'export CSV à mesurer sur l'A55** (sauvegarde fictive de 120 000 lignes, à préparer) ; `attendanceExportRepo.groups(period)` passe par la requête `OVERVIEW` des statistiques : durée à mesurer aussi.
- **Envoi différé vers Drive** : une appli qui lit le fichier après la fermeture de la feuille de partage pourrait trouver le sous-dossier déjà effacé (037, 040) ; à essayer sur l'A55 avant la clôture du jalon.
- Limite connue (035) : M de « Inscrire M membres à leur groupe » compte aussi un membre déjà inscrit au groupe trouvé (l'aperçu du 034 ne connaît pas les inscriptions) ; le bouton peut être actif sans rien écrire. Correction possible dans le domaine ou le dépôt du 034, sur un ticket.
- Limite connue (Q2 du 036) : une présence d'une séance à deux groupes dont l'un est supprimé passe au groupe restant (statistiques, export, rapport), jusqu'au ticket 043.
- Test NF-08 du rapport (039) : limite de 2 s, marge d'environ 4 fois ; un runner de CI chargé pourrait le rendre instable.
- Outil d'écriture des agents : un U+FEFF littéral a été écrit dans une fiche au lot J3-1 ; à surveiller (écrire `\uFEFF` ou des octets).
- Hook pre-push : il lance `scripts/test.sh` sur la **copie de travail**, pas sur les commits envoyés ; la CI reste la vérification qui fait foi.
- `noFloatingPromises` est une règle expérimentale (nursery) de Biome 2.6.9 : à surveiller à chaque mise à jour de Biome.
- `npm audit` : 0 vulnérabilité depuis le 018 (glob) et le 017 (minimatch), par `overrides` limités à la plage vulnérable ; CI à `--audit-level=high`.
- `@expo/devtools` est dans le bundle de production : client WebSocket d'expo-sqlite, appelé seulement si `__DEV__` ; INTERNET absente du binaire. Pas une violation d'ABS-01.
- **Lancer Claude Code depuis `kila-appel/`** : depuis le dossier parent, les interdictions de `.claude/settings.json` ne s'appliquent pas.
- Calendrier sans marge (publication Android fin janvier 2027) : jalons 4 et 5 premiers candidats au report, décision du porteur à la fin du jalon 3.
- iOS : aucun appareil Apple ni Mac ; publication iOS après un test sur un vrai iPhone (jalon 7).
- DSA : déclarer Jita Vision commerçant avant le 1er février 2027.
- Registre des licences (EX-42, jalon 6) : y faire figurer les polices IBM Plex (OFL 1.1, `assets/fonts/SOURCES.md`).
- `node:sqlite` est expérimental dans Node 22 : avertissement à chaque test de données, sans effet.
- Index des SDK de Play : Firebase Messaging présent dans le binaire (inactif, retiré du manifeste) peut être signalé à la soumission (CONFORMITE §3).
- Questions ouvertes : migration 1 à lancer sur le téléphone (ticket 004, fin d'ADR-008) ; signature iOS sans EAS (jalon 7) ; tranche 16-17 et politique Familles (soumission Play).
- `main` protégée (ruleset vérifié) ; hooks Git activés ; Dependabot ouvre ses PR vers `main` (builds Android et iOS, environ 30 min).
- Branche locale `essai/lot-2-apk` (APK d'essai 014b + 015c), non poussée, gardée (pas de suppression de branche).

## Non vérifié

- **Bases de test à effacer** (Galaxy A55, émulateur) : une base d'un ancien build (migration 1 sans `slots.schedule_from`) fait échouer la création d'un créneau et donne un accueil vide. **Désinstaller Ki&La avant d'installer** un nouvel APK.
- Requêtes métier sur le module natif `expo-sqlite` : vues sur l'émulateur (016) ; requêtes des jalons 2 et 3 (séries d'absences, statistiques, import, export, rapport) vérifiées sur `node:sqlite` seulement.
- **Écrans des jalons 2 et 3 jamais vus sur un téléphone** : statistiques, alertes, relances ; import (035), export CSV (037) testés avec le routeur simulé de Jest seulement (retours Android, lecteur d'écran, tablette).
- **Relances (028a à 029)** : aucune relance programmée ni délivrée sur un appareil ; iOS : build simulateur de la CI seulement. `expoNotifications.ts` et `staticChecksNotifications.test.ts` à 300 lignes.
- **Lot J3-3** : vérifié par Jest et `node:sqlite` ; aucun APK de la CI construit avec ces écrans ; HTML du rapport jamais rendu en PDF (040) ; NF-08 mesuré sur le poste seulement.
- Couleurs nommées (`'red'`) non détectées par le contrôle CONV-16.
- Habilitations iOS contrôlées sur le projet généré, pas sur un binaire signé : à revoir avec la signature (jalon 6). Polices IBM Plex absentes du poste : les maquettes s'affichent dans la police du système.
