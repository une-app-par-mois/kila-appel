# Architecture — Ki&La (appel)

Statut : ✅ validé le 2026-11-26

Comment l'appli est faite. S'appuie sur `docs/CADRAGE.md`, `docs/PRD.md` et `design/CHARTE.md` (validés). Chaque décision structurante a son ADR dans `docs/adr/` ; ce document en donne la vue d'ensemble et renvoie vers eux.

## 1. Vue d'ensemble

Une seule application React Native (Expo), Android et iOS, **sans serveur ni réseau** (ABS-01, ABS-02). Toutes les données vivent dans une base SQLite dans l'espace privé de l'appli ; elles n'en sortent que par une sauvegarde, un export CSV ou un PDF que l'encadrant déclenche et destine lui-même.

```
Écrans (src/app/)  →  Hooks (src/hooks/)  →  Domaine (src/domain/)  →  Données (src/data/)
```

Le sens des imports est strict : jamais vers la gauche. Le domaine est pur (ni React, ni stockage, ni horloge implicite).

## 2. Pile technique

Chaque ligne vaut validation de la dépendance (ADR-001). **Une dépendance n'est installée qu'au ticket de la fonctionnalité qui l'utilise** (ABS-07). Versions vérifiées sur npm le 2026-11-26, revérifiées au ticket 001 et fixées en version exacte dans `package.json` (CONV-31).

| Paquet | Version | Licence | Rôle | Installé avec |
| --- | --- | --- | --- | --- |
| expo | 58.0.26 | MIT | SDK | Outillage |
| react-native | 0.88.1 (fixée par le SDK) | MIT | Interface native | Outillage |
| react | 19.3.0 (fixée par le SDK) | MIT | Interface | Outillage |
| typescript | ~6.0.3 (modèle du SDK 58) | Apache-2.0 | Typage strict | Outillage |
| expo-router | ~58.0.32 | MIT | Navigation par fichiers | Outillage |
| expo-font | 58.0.12 | MIT | Polices IBM Plex embarquées au build (extension dans `app.json`) ; `loadAsync` et `useFonts` interdits dans `src/` (ABS-01, décision du 2026-11-26) | Thème et polices (003) |
| expo-sqlite | 58.0.18 (SQLite 3.53.3 embarqué) | MIT | Base locale | Couche données (002) |
| react-native-svg | 15.16.0 (fixée par le SDK) | MIT | Dessin, icônes ; ses chargeurs par adresse sont interdits (ABS-01, décision du 2026-11-26) | Installée au ticket 006b |
| lucide-react-native | 1.81.0 | ISC | Icônes au trait (charte §8), importées une par une ; Jest charge leur version CommonJS | Installée au ticket 006b |
| react-native-gesture-handler | 3.3.0 (fixée par le SDK) | MIT | Glisser-déposer des contacts d'urgence (poignée ≡) ; déjà imposée par expo-router | Explicite au ticket 008b |
| react-native-reanimated | 4.7.1 (fixée par le SDK) | MIT | Animation du déplacement ; déjà imposée par expo-router | Explicite au ticket 008b |
| react-native-worklets | 0.13.0 (fixée par le SDK) | MIT | Exigée par Reanimated 4 et le cœur d'Expo ; son réseau (« Bundle Mode ») interdit, contrôlé par `staticChecks` (ABS-01) | Explicite au ticket 008b |
| expo-file-system | ~58.0.14 | MIT | Fichiers de sauvegarde | F-03 |
| expo-sharing | ~58.0.23 | MIT | Partage d'un fichier exporté | F-03 |
| expo-document-picker | ~58.0.5 | MIT | Choix d'un fichier (restauration, import) | F-03 |
| expo-notifications | ~58.1.9 | MIT | Relance locale (ADR-007) | F-06 |
| expo-print | ~58.0.9 | MIT | Rapport PDF | F-09 |
| jest-expo | ~58.0.15 | MIT | Tests | Outillage |
| @testing-library/react-native | 14.1.0 | MIT | Tests d'écrans | Outillage |
| @biomejs/biome | 2.6.9 | MIT ou Apache-2.0 | Lint et format | Outillage |

Dépendances obligatoires des paquets ci-dessus, acceptées par le porteur le 2026-11-26 (ticket 001) :

| Paquet | Version | Licence | Exigée par | Installé avec |
| --- | --- | --- | --- | --- |
| react-native-screens | 4.30.1 | MIT | expo-router | Outillage |
| react-native-safe-area-context | 5.11.1 | MIT | expo-router | Outillage |
| expo-linking | 58.0.17 | MIT | expo-router | Outillage |
| expo-constants | 58.0.16 | MIT | expo-router | Outillage |
| react-dom | 19.3.0 (épinglée sur react) | MIT | expo-router (web) ; épinglée car 19.3.1 exige react 19.3.1 (CONV-31) | Outillage |
| jest | 30.5.2 | MIT | jest-expo | Outillage |
| @react-native/jest-preset | 0.88.1 | MIT | jest-expo | Outillage |
| test-renderer | 1.3.1 | MIT | @testing-library/react-native | Outillage |
| @types/react | 19.3.3 | MIT | typescript | Outillage |
| @types/jest | 30.0.0 | MIT | typescript | Outillage |

Hors npm : **Maestro** (parcours de bout en bout, campagne de fin de jalon). Polices : fichiers `.ttf` d'IBM Plex Sans (400, 600, 700) et Plex Mono (500) dans `assets/fonts/`, avec la licence OFL 1.1 à côté.

Écartés : tout paquet capable d'émettre du réseau (client HTTP, analytics, suivi de crash), ORM, gestionnaire d'état global (ADR-006), MMKV (ADR-002), chiffrement (ADR-005).

## 3. Arborescence

```
src/
  app/            écrans (Expo Router) ; (tabs)/ pour les 5 onglets, le reste empilé
  hooks/          un hook par préoccupation ; seul accès des écrans aux données
  domain/         fonctions pures : taux, séries, occurrences de créneaux, CSV, exports, règles RM-xx
  data/           base, migrations, dépôts (repositories), sauvegarde, notifications
  ui/             composants réutilisables (bouton, carte, pastille…)
  config/         thème dérivé de design/jetons.json, libellés (tous les textes), constantes
  appTests/       tests des écrans (hors de app/ : Expo Router prendrait chaque fichier pour une route)
  __fixtures__/   données de test fictives
assets/fonts/     polices et leur licence
```

Les identifiants suivent le glossaire du cadrage (colonne « Terme du code »).

## 4. Données

### 4.1 Schéma (ADR-003 : complet dès la migration 1)

| Table | Colonnes principales | Remarques |
| --- | --- | --- |
| `seasons` | id, name, start_date, end_date, is_active | Une seule active (index unique partiel) |
| `members` | id, last_name, first_name, birth_date?, archived_at? | Seuls nom et prénom obligatoires (ABS-03) |
| `emergency_contacts` | id, member_id, label, phone, position | `ON DELETE CASCADE` depuis `members` |
| `groups` | id, season_id, name, archived_at? | |
| `enrollments` | id, member_id, group_id, start_date, end_date? | Cascade depuis `members` et `groups` ; inscrit du début (inclus) à la fin (exclue), fin = premier jour sans le membre (décision du porteur du 2026-11-26) |
| `slots` | id, season_id, weekday?, start_time, duration_min, place?, name?, schedule_from | `weekday` nul = créneau ponctuel ; `schedule_from` = date d'effet de l'horaire : fixée à la création, avancée quand le jour ou l'heure changent, jamais reculée (déclencheur) ; aucune séance réclamée avant (EX-07, EX-08) |
| `slot_dates` | slot_id, date | Dates d'un créneau ponctuel (F-10) |
| `slot_groups` | slot_id, group_id | Plusieurs groupes par créneau (F-11) |
| `sessions` | id, season_id, slot_id?, date, start_time, state, comment? | `state` ∈ recorded, prepared, cancelled, unscheduled ; `slot_id` nul = appel sans créneau (EX-39) ; unique (slot_id, date) (RM-05) |
| `session_groups` | session_id, group_id | Groupes figés au jour de la séance |
| `attendances` | session_id, member_id, status | `status` ∈ present, absent, late, excused ; cascade depuis `members` et `sessions` |
| `roll_call_drafts` | id (= 1), season_id, slot_id?, date, comment, updated_at | Un seul brouillon à la fois (EX-14) ; cascade depuis `seasons` et `slots` |
| `roll_call_draft_groups` | draft_id, group_id | Groupes du brouillon ; cascade depuis `groups` |
| `roll_call_draft_statuses` | draft_id, member_id, status | Statuts du brouillon ; cascade depuis `members` (ABS-05) |
| `alert_acks` | member_id, streak_length, acked_at | Alerte traitée à ce niveau de série (EX-26) |
| `settings` | key, value | Réglages (ADR-002) |

- Dates en texte `AAAA-MM-JJ`, heures `HH:MM` (RM-04) ; conversion d'affichage dans `src/domain/formats.ts` seulement.
- **Séances calculées à la volée** (ADR-004) : une ligne `sessions` n'existe qu'une fois l'appel enregistré, préparé, annulé ou marqué non planifié.
- Requêtes toujours paramétrées ; `PRAGMA foreign_keys = ON` à chaque ouverture.
- **Transactions** : une seule connexion, une file d'attente commune aux deux adaptateurs (`src/data/db.ts`). Dans une transaction, n'utiliser que la base de transaction `tx`, jamais la base principale (sinon blocage) ; les dépôts reçoivent la base en paramètre. Vérifié en revue (décision du porteur du 2026-11-26).
- Tables `STRICT` ; `CHECK` sur les dates (format, date réelle, 1900 à 2100), les heures (`00:00` à `23:59`), les états et statuts, nom et prénom non vides. `weekday` : 1 = lundi … 7 = dimanche.
- **Suppressions** (décision du porteur du 2026-11-26, ticket 002) :

| On supprime | Effacé en cascade | Gardé |
| --- | --- | --- |
| Un membre | présences (brouillon compris), contacts, inscriptions, alertes traitées (SEC-11) | séances |
| Une saison | groupes, créneaux (et leurs dates et groupes), séances, présences, inscriptions à ses groupes, brouillon de ses créneaux (EX-01) | membres, autres saisons |
| Un créneau | ses dates, ses groupes, son brouillon | ses séances et leurs présences, `slot_id` vidé (EX-07) ; affichées comme un appel sans créneau |
| Un groupe | inscriptions, liens créneau-groupe et séance-groupe | séances et présences (EX-02) |
| Une séance | présences, groupes figés (EX-18) | — |

### 4.2 Migrations

Numérotées, appliquées dans une transaction, version dans `PRAGMA user_version`, **jamais réécrites une fois publiées**. Avant la publication, la migration 1 reste la seule (ADR-003). Zone sensible. Jamais de `REPLACE INTO` ni d'`INSERT OR REPLACE` : ils suppriment puis recréent la ligne, contournent les déclencheurs (`slots.schedule_from`) et déclenchent les cascades.

### 4.3 Sauvegarde et restauration (zone sensible)

- **Export** : copie cohérente par `VACUUM INTO` vers un fichier `kila-sauvegarde-AAAA-MM-JJ.db`, puis partage par le système. En clair (ADR-005), avec l'avertissement d'EX-19.
- **Restauration** : le fichier est d'abord vérifié sur une copie temporaire (`PRAGMA integrity_check`, tables attendues, `user_version` ≤ version de l'appli, puis migrations si plus ancien). Seulement ensuite, la base courante est fermée, remplacée, rouverte. Un échec laisse la base courante intacte (EX-20).
- **Base illisible au démarrage** : détectée, écran de récupération (EX-22). `android:allowBackup` à `false`.

## 5. Notifications (F-06, ADR-007)

Locales uniquement. À chaque écriture qui touche créneaux, séances ou réglages : tout annuler, puis reprogrammer les relances des 7 jours à venir (plafond iOS de 64 notifications en attente). Texte : le groupe, jamais un membre (ABS-04). La permission n'est demandée qu'à l'activation (EX-29).

## 6. Permissions et confidentialité

- `blockedPermissions` dans `app.json` : INTERNET (ABS-01), et les permissions qu'Expo ajoute par défaut sans que l'appli s'en serve (stockage externe, `SYSTEM_ALERT_WINDOW`, `VIBRATE`) ; `permissions: []`.
- **Audit sur le binaire construit**, pas sur le manifeste : `scripts/audit-apk.js` compare `aapt2 dump permissions` à `config/permissions-attendues.txt` (une seule permission, interne à AndroidX) et vérifie dans le manifeste compilé `allowBackup=false` et l'absence de `android:scheme` sous un `intent-filter`. Le bloc `<queries>` (scheme `https`) ajouté par Expo sert seulement à voir les navigateurs installés : ce n'est pas une entrée. Workflow `builds.yml`, à chaque PR vers `main`.
- Sauvegarde système Android désactivée (`allowBackup: false`) : les données ne quittent pas l'appareil sans l'export explicite.
- iOS : `ITSAppUsesNonExemptEncryption` = `false` ; aucune habilitation ; **aucun scheme d'URL** : Expo ajoute toujours le nom de paquet comme scheme, retiré par `plugins/withoutUrlScheme.js` (décision du porteur du 2026-11-26). `scripts/audit-ios.js` vérifie l'Info.plist **du binaire construit**, mais les habilitations sur le fichier du projet généré : le build simulateur n'est pas signé et n'en embarque pas. À contrôler sur le binaire signé au jalon 6.

## 7. Journaux

Liste fermée de ce qu'un journal peut contenir : code d'erreur, nom de l'opération, identifiants internes, version de schéma. **Jamais** un nom, un prénom, un téléphone ou une date de naissance (ABS-04). Aucun service de suivi de crash.

## 8. Tests (détail dans les conventions)

| Niveau | Outil | Ce qui est testé |
| --- | --- | --- |
| Domaine | Jest | Toutes les règles RM-xx, occurrences de créneaux, CSV ; heure injectée |
| Données | Jest + `node:sqlite` (ADR-008) | Migrations, requêtes, cascades, sauvegarde/restauration sur une vraie base SQLite, sans dépendance |
| Écrans | Testing Library | Parcours critiques : appel, brouillon, confirmations de suppression |
| Bout en bout | Maestro, en fin de jalon | Appel de 20 membres, brouillon après fermeture forcée, sauvegarde → effacement → restauration (Android réel) |

## 9. Environnements et builds (ADR-009)

- **Développement** : `npx expo start` pour le JavaScript ; **pas d'`expo-dev-client`** (il exige INTERNET et le serveur Metro). Sur téléphone, on installe l'**APK de version signé avec la clé de débogage publique** d'Expo : JavaScript embarqué, sans INTERNET, le binaire de production lui-même (décision du porteur du 2026-11-26). Il ne se publie pas : signature au jalon 6.
- `expo prebuild` régénère `android/` et `ios/` à chaque build ; ils ne sont pas versionnés.
- **Binaires construits sur GitHub Actions** (`builds.yml`, PR vers `main`) : APK de version et audit sur `ubuntu-24.04`, déposé en artefact (14 jours) ; build simulateur non signé et audit sur `macos-26`. Un build local sert seulement à vérifier avant la PR ; c'est le build de la CI qui fait foi.
- **Publication** (`release.yml`, tag `vX.Y.Z`, jalon 6) : empreintes SHA-256 et attestation de provenance ; clés de signature en secrets GitHub posés par le porteur, jamais dans le dépôt.
- `versionCode` / `buildNumber` dérivés du tag de version dans la CI, pour qu'ils ne divergent jamais des consoles.

## 10. Exigences non fonctionnelles

| NF | Réponse |
| --- | --- |
| NF-01 30 s | Liste pré-remplie, un appui par changement, écriture du brouillon asynchrone ; mesuré par Maestro et sur appareil |
| NF-02 hors ligne | Aucune dépendance réseau ; permission INTERNET absente |
| NF-03 confidentialité | Audit du binaire ; déclarations « aucune donnée collectée » |
| NF-04 fiabilité | Brouillon en base ; restauration vérifiée avant remplacement ; tests de données sur vraie base |
| NF-05 plateformes | Portrait verrouillé ; colonne de 640 pt au plus sur tablette |
| NF-06 accessibilité | Jetons de la charte ; tailles qui suivent le système ; libellé + icône par statut |
| NF-08 volume | Agrégats calculés en SQL, index sur `attendances(member_id)`, `sessions(date)` ; jeu de test de 500 membres et 3 saisons |

## Décisions du porteur

- 2026-11-26 : réglages dans SQLite, état React seul, icônes lucide-react-native, polices en fichiers `.ttf`, schéma complet dès la migration 1, builds sur GitHub Actions seul ; brouillon dans une table à part (`roll_call_drafts`) ; **noms de tables au pluriel** (évite le mot réservé `group`) ; tests de données avec `node:sqlite`, à confirmer au ticket d'outillage ; sauvegarde au format base SQLite brute (`.db`).
- 2026-11-26 (ticket 001) : dépendances obligatoires d'expo-router et de Jest acceptées ; `react-dom` épinglée en 19.3.0 ; `expo-font` installée au ticket 003 (ABS-07).
- 2026-11-27 (ticket 010c) : écran `/appel-libre` (groupe, date) et `/appel?groupe=&date=` ; `useRollCallTarget` décide quel appel ouvre l'écran et refuse dès l'ouverture ce qui ne s'enregistrerait pas ; `sessionsRepo.record` refuse un appel sans créneau futur ; « Ajouter un membre » ouvre Nouveau membre en version « appel » (`appel=1`), inscrit à la date de la séance.
- 2026-11-27 (ticket 010b) : écran `/appel?creneau=&date=` ; composants `StatusPill` et `AttendanceCounter` (`src/ui/Attendance.tsx`), icônes de statut prises dans Lucide déjà installé ; domaine `attendance.ts` (cycle, compteur, recherche) et `foldText` partagé ; `proposedSession` ne propose jamais une date future (décision du porteur) ; « Nouvel appel » en tête de l'accueil provisoire, avec le groupe actif du créneau, l'heure relue chaque minute, et « appel enregistré » sans action quand la séance l'est déjà ; l'écran refuse dès l'ouverture une date qui n'est pas un jour du créneau (`isSlotDate`).
- 2026-11-27 (ticket 010) : `sessionsRepo.record` enregistre l'appel d'un bloc (séance `recorded`, groupe figé, présences) après contrôle du groupe de la saison active, de la date, du créneau lié au groupe, de RM-05 (`ALREADY_RECORDED`) et de RM-03 (`NOT_ENROLLED`, une requête, `current()` partagé) ; une séance de créneau est une vraie séance, pas future (`NOT_A_SLOT_SESSION`, `slotDates`) ; changer le groupe d'un créneau avance sa date d'effet comme le jour ou l'heure ; un créneau sans groupe actif n'est pas proposé ; commentaire de séance de 500 caractères au plus (décision du porteur) ; hooks `useRoster`, `useProposedSession`, `useRollCall`.
- 2026-11-27 (ticket 009b) : libellés en dossier `src/config/libelles/` (un fichier par domaine, 300 lignes au plus, `index.ts` rassemble `labels`), CONV-03 et `staticChecks` adaptés ; écrans des créneaux : un seul « Nouveau créneau » au lot 1, lieu et nom modifiables, confirmation de suppression qui nomme l'appel interrompu s'il existe (maquette mise à jour).
- 2026-11-27 (ticket 009) : ticket découpé en 009 (données) et 009b (écrans) ; `slotsRepo` : un groupe par créneau au lot 1, de la saison du créneau, non archivé quand il est choisi (un groupe archivé depuis reste modifiable sans en changer) ; `schedule_from` avancé au jour même quand le jour ou l'heure changent, jamais reculé ; un appel interrompu sur ce créneau est alors gardé tel quel (décision du porteur du 2026-11-27) ; supprimer un créneau vide `sessions.slot_id` et efface son appel interrompu (cascade du ticket 002).
- 2026-11-26 (ticket 006f) : modifier les dates d'une saison est refusé (`ENROLLMENTS_OUTSIDE_SEASON`) si une inscription à l'un de ses groupes commence hors des nouvelles dates ; membres et groupes archivés compris, période vide (fin = début) exclue, toute saison active ou non.
- 2026-11-26 (ticket 007e) : date de début d'inscription refusée hors des dates de la saison active (dernier jour compris), contrôlée dans `expectEnrollable` pour les trois chemins (ajout au groupe, nouveau membre, « + Ajouter à un groupe ») ; date proposée = aujourd'hui ramené dans la saison (`startInSeason`).
- 2026-11-26 (ticket 008b) : glisser-déposer des contacts avec react-native-gesture-handler, react-native-reanimated et react-native-worklets, déjà présents par expo-router et le cœur d'Expo, rendus explicites aux versions du SDK. **react-native-worklets accepté malgré son module réseau** (`fetch`, `XMLHttpRequest` sur ses fils, actif seulement en « Bundle Mode ») : aucune configuration Babel ou Metro du dépôt ne demande ce mode, vérifié par `src/staticChecks.test.ts` ; INTERNET reste absente du binaire Android. Dans Jest, le détecteur de geste rend ses enfants (`jest.setup.js`) : l'ordre est testé par les actions d'accessibilité, le glisser sur appareil.
- 2026-11-26 (ticket 006d) : notification commune des hooks de données (`src/hooks/dataChanged.ts`) : toute modification recharge chaque écran ouvert ; `useGroup` pour la fiche et la modification ; `toIsoDate` (date locale, l'écran passe `new Date()`, CONV-11) ; messages d'erreur à code dans `src/ui/errorMessage.ts`.
- 2026-11-26 (ticket 006c) : écrans redécoupés en 006c (saisons), 006d (groupes), 006e (licences, EX-42) ; Paramètres ne montre que les lignes qui mènent à un écran existant ; une saison créée sans saison active devient active ; composants `Screen` (carreaux et marge dessinés en SVG, sans grain : absent des maquettes) et `TextField` ; `ConfirmDialog` et `ListRow` alignés sur les maquettes ; tests d'écrans dans `src/appTests/`.
- 2026-11-26 (ticket 006b) : `react-native-svg` accepté malgré ses chargeurs par adresse, interdits par `staticChecks` (ABS-01) ; composants de base dans `src/ui/` ; la confirmation est un écran entier sur Papier, comme la maquette.
- 2026-11-26 (ticket 006) : ticket découpé en 006 (données), 006b (composants), 006c (écrans) ; Paramètres sert d'écran d'accueil provisoire jusqu'au ticket 012 ; suppression d'un groupe confirmée telle que le §4.1 la décrit (séances et présences gardées), texte de la maquette à corriger ; « Désarchiver » un groupe ajouté ; dates d'une saison refusées si des séances tomberaient en dehors ; erreurs des dépôts à code (`src/data/errors.ts`).
- 2026-11-26 (ticket 005) : `slots.schedule_from` (date d'effet de l'horaire) ajouté **dans la migration 1** (ADR-003 : corrigeable avant la publication), obligatoire, avancé à chaque changement de jour ou d'heure, jamais reculé : le passé n'est pas recalculé avec le nouvel horaire, les appels manquants de l'ancien horaire sont abandonnés ; une séance « du jour » commence ou finit aujourd'hui ; séance proposée = en cours, sinon la plus proche dans le temps, celles du jour d'abord (EX-09) ; appel manquant dès la fin de la séance (EX-17) ; occurrences calculées sur des dates de calendrier locales, `now` = date et heure locales passées par l'appelant.
- 2026-11-26 (ticket 004) : binaire de test = APK de version avec la clé de débogage (pas d'`expo-dev-client`) ; migration vérifiée sur le téléphone par `adb logcat` (`[kila] DB_READY`) ; liste des permissions figée et validée ; scheme d'URL iOS retiré par un plugin local ; `actions/setup-java` v6.3.0 et `actions/upload-artifact` v7.0.2 épinglés par empreinte.
- 2026-11-26 (ticket 003) : **expo-font accepté malgré sa capacité réseau** (`loadAsync` avec une URL) : seule son extension de build est utilisée, `loadAsync` et `useFonts` sont refusés par le contrôle SEC-01 ; polices téléchargées depuis github.com/IBM/plex, renommées d'après leur nom PostScript (même nom sur Android et iOS), empreintes dans `assets/fonts/SOURCES.md` ; journal : code et nombres ou booléens, clés en liste blanche (`…Id`, `…Count`, `version`, `changes`, `durationMs`, `ok`), donnée refusée remplacée par `LOG_REFUSED` sans erreur ; contrôles CONV-03, CONV-16, SEC-01 et SEC-03 par un test qui lit l'arbre syntaxique (`src/staticChecks.test.ts`), CONV-17 par Biome ; types Node des tests déclarés dans `src/node.d.ts`, invisibles pour l'appli (`tsconfig.json` sans les tests, `tsconfig.test.json` avec).
- 2026-11-26 (ticket 002) : règles de suppression du §4.1 ; groupes et statuts du brouillon en tables filles en cascade (16 tables), brouillon rattaché à sa saison ; règle « dans une transaction, seulement `tx` » ; transactions sur la connexion principale par une file commune aux deux adaptateurs (`withExclusiveTransactionAsync` ouvre une connexion sans clés étrangères) ; séance d'un créneau supprimé sans colonne d'origine ; types de `node:sqlite` déclarés localement (pas de `@types/node`) ; vérification d'ADR-008 complétée sur téléphone au ticket 004.

## Questions ouvertes

- Signature iOS sans EAS (ADR-009) : au ticket de build.
- Compatibilité des requêtes entre `node:sqlite` et `expo-sqlite` (ADR-008) : même interface et mêmes requêtes vérifiées au ticket 002 (SQLite 3.51.3 en test, 3.53.3 dans l'appli) ; exécution réelle sur le téléphone au ticket 004.
