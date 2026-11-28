# 038 — Rapport PDF : expo-print et garde-fous du binaire

Statut : en cours (dépendance accordée par le porteur le 2026-11-28, version exacte 58.0.9) · Jalon : 3 · Zone sensible : **oui** (dépendance et rendu par WebView : règle « aucun réseau », `docs/CADRAGE.md` « Zones sensibles ») · Trivial : non

Dépend de : aucun · Fichiers touchés : `package.json`, `package-lock.json`, `app.json`, `plugins/withoutWebViewMetrics.js` et son test (nouveaux), `scripts/audit-apk.js`, `scripts/audit-apk-webview.test.js` (nouveau : `audit-apk.test.js` fait 302 lignes), `src/staticChecksPrint.test.ts` (nouveau) — 8 fichiers, ou 9 si `scripts/audit-apk.test.js` doit être retouché (séance de lancement du lot J3-2 ; `docs/SECURITE.md` et `docs/CONFORMITE.md` : à l'intégration du lot, voir « À reporter »)

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

F-09 (EX-32) demande un PDF A4. expo-print est inscrit dans `docs/ARCHITECTURE.md` §2 (`~58.0.9`, « F-09 »), mais `CLAUDE.md` exige de proposer toute dépendance au porteur (précédent : expo-notifications, ticket 026). Ce ticket installe la dépendance et verrouille ce qu'elle permet ; l'adaptateur qui l'appelle vient au 040, le HTML au 039.

Relevé du 2026-11-28 (lecture seule : `npm view`, paquet décompressé hors du dépôt, rien installé) :

- `expo-print` **58.0.9** (dernière stable, `latest` ; plage `~58.0.9` attendue par `expo` 58.0.26 dans `bundledNativeModules.json`), licence **MIT**, publiée le **2026-11-11** (dernière modification du paquet : 2026-11-27, versions canary 59). **Aucune dépendance npm** ; pairs : `expo`, `react-native`.
- Android : manifeste du module **vide** (aucune permission, aucun composant) ; dépendances Maven : `kotlin-stdlib-jdk7`, `annotations`, `io.github.expo.pika:pika-api` 1.1.0 (déjà tirée par d'autres modules Expo du projet).
- Rendu Android : `android.webkit.WebView` créée à la volée, `loadDataWithBaseURL(null, html, …)`, JavaScript laissé à sa valeur par défaut (désactivé), aucun filtrage des requêtes ; PDF écrit dans `cache/Print/<uuid>.pdf`. Sans INTERNET (ABS-01), une ressource distante ne peut pas se charger dans le processus de l'appli.
- Rendu iOS : `WKWebView` (`loadHTMLString`, base = ressources de l'appli), JavaScript actif par défaut, **aucune permission réseau à retirer sur iOS** : seule la page elle-même peut interdire le réseau (CSP).
- Code capable de réseau : `printAsync({ uri })` lit une adresse `http(s)` (`URL(uri).openStream()` sur Android, `URLSession` sur iOS) ; `selectPrinterAsync` (iOS, AirPrint : recherche d'imprimantes sur le réseau local). `printToFileAsync({ html })` n'en a pas besoin.
- WebView d'Android : le paquet WebView du système peut envoyer ses propres mesures d'usage (hors du processus de l'appli, donc malgré l'absence d'INTERNET) sauf si l'appli s'y oppose par la méta-donnée documentée `android.webkit.WebView.MetricsOptOut` ; Safe Browsing se coupe par `android.webkit.WebView.EnableSafeBrowsing`.

## À lire

- `CLAUDE.md` : ABS-01, ABS-04, ABS-07, ABS-08 ; « Avant d'ajouter une dépendance »
- Ticket 026 (modèle : relevé, verrouillage, audit) ; `docs/ARCHITECTURE.md` §2, §6 ; `docs/SECURITE.md` SEC-01, SEC-02, SEC-08 ; `docs/CONFORMITE.md` §3, §7, §8
- `app.json`, `plugins/withoutFirebase.js` et son test, `scripts/audit-apk.js`, `src/staticChecks.test.ts`, `src/staticChecksNotifications.test.ts` (modèle de liste fermée)

## Ce qui change (plan à valider, option recommandée)

- `npx expo install expo-print`, puis version exacte 58.0.9 (CONV-31) ; on vérifie que l'installation n'ajoute aucune dépendance npm ; aucune autre dépendance directe.
- `plugins/withoutWebViewMetrics.js` : ajoute sous `<application>` `<meta-data android:name="android.webkit.WebView.MetricsOptOut" android:value="true"/>` et `…EnableSafeBrowsing` à `false`, avec `tools:replace="android:value"` ; idempotente (appliquée deux fois, même manifeste) ; placée en dernier dans `app.json`.
- `scripts/audit-apk.js` : contrôle inconditionnel ; une seule `meta-data` de chaque nom, enfant direct d'`application`, valeur booléenne littérale (`true` pour MetricsOptOut, `false` pour EnableSafeBrowsing) ; refus d'une chaîne, d'une référence, d'un doublon et d'une valeur placée sous une activité ; listes de permissions et de composants inchangées (toujours **exactement** `config/permissions-attendues.txt`) : toute différence vue sur l'APK arrête le ticket et devient une question.
- `src/staticChecksPrint.test.ts` (reprend les outils de `src/__fixtures__/expoAccess.ts`, chaque refus vu en échec) :
  - importeurs d'expo-print ⊆ [`src/data/expoPrint.ts`] (créé au 040, aucun aujourd'hui ; le 040 durcira en « exactement ») ; tout sous-chemin du paquet refusé ;
  - seul `printToFileAsync` peut être importé d'`expo-print` ;
  - `printAsync`, `selectPrinterAsync` et `ExpoPrint` refusés comme noms dans tout `src/`, même écrits en chaîne ;
  - argument de `printToFileAsync` : objet écrit en entier, sans `...` ni variable, avec les seules clés `html`, `width`, `height` et `margins` ; toute autre clé refusée, `uri`, `base64` et `useMarkupFormatter` compris ;
  - `Orientation` et `base64` ne sont pas interdits comme noms ailleurs.
- `docs/SECURITE.md` et `docs/CONFORMITE.md` : complétés à l'intégration du lot par l'IA principale (voir « À reporter »).
- Registre des licences (`src/config/licences.json`, EX-42) : régénéré au 040, quand le paquet entre dans le bundle.

## Critères d'acceptation

- [ ] Réponse datée du porteur (2026-11-28) notée dans `docs/ARCHITECTURE.md` (décisions du porteur, à l'intégration) ; version installée exactement 58.0.9 — version faite (`package.json` et `package-lock.json` : `58.0.9`) ; ARCHITECTURE à l'intégration.
- [x] APK : permissions **exactement** celles de `config/permissions-attendues.txt` (SEC-02) ; INTERNET absente (ABS-01, NF-03) ; méta-données WebView présentes — APK de production local, audit conforme (voir « À reporter ») ; APK de la CI non vérifié.
- [ ] Build iOS : `scripts/audit-ios.js` inchangé et vert (aucune habilitation, aucun scheme) — non vérifié : pas de build iOS sur ce poste ; `audit-ios.js` inchangé ; expo-print n'a pas d'extension de configuration (`app.plugin.js` absent).
- [x] `npm audit` sans vulnérabilité haute ; version exacte ; licence MIT dans la liste acceptée.
- [x] Contrôle statique : un import fictif de `printAsync` ou un appel avec `uri` dans un fichier de test fait échouer le contrôle.
- [x] L'appli démarre et fonctionne comme avant sur l'émulateur — démarrage seul (écran Bienvenue, `DB_READY`) ; parcours complet non rejoué.

## Tests attendus

- `plugins/withoutWebViewMetrics.test.js` (dont l'idempotence), `scripts/audit-apk-webview.test.js` (manifeste fictif sans les méta-données, avec une chaîne, une référence, un doublon ou une valeur sous une activité → échec), `src/staticChecksPrint.test.ts`.
- À la main : `aapt2 dump permissions` et `aapt2 dump xmltree` avant et après, sur un APK de production local ; le diff va dans la PR ; démarrage sur l'émulateur.

## Hors périmètre

- HTML du rapport (039) ; adaptateur, fichier et partage (040) ; écran (041) ; politique de confidentialité (jalon 6).

## Questions prévues

Toutes réservées au porteur (nouvelle dépendance, ABS-01, ABS-07, SEC-08, zone sensible) : voir les questions du découpage (dépendance et solution de rechange, méta-données WebView, SEC-08, conformité).

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Dépendance : **expo-print 58.0.9 accordée, installée verrouillée** (option A, en entier : seul `src/data/expoPrint.ts` l'importe, `printToFileAsync` avec du HTML seulement ; `printAsync`, `selectPrinterAsync`, `uri` et `base64` refusés par le contrôle statique ; CSP ; `cache/Print/` vidé), décision du porteur du 2026-11-28.
- WebView d'Android : **mesures d'usage et Safe Browsing coupées, et audités** (`plugins/withoutWebViewMetrics.js`, contrôle dans `scripts/audit-apk.js`), décision du porteur du 2026-11-28. Le changement de l'audit est validé dans son principe ; sa fusion reste soumise à la relecture du porteur (contrôle de sécurité).
- SEC-08 : **complétée** (option A), modification de `docs/SECURITE.md` à l'intégration du lot du 038.
- Conformité (ABS-08) : **déclarations des stores inchangées**, note à `docs/CONFORMITE.md` §3 (la politique du jalon 6 décrira l'import CSV, l'export CSV et le rapport PDF), à l'intégration.
- Plan validé par le porteur le 2026-11-28 ; relecture du porteur avant la fusion dans le groupe (zone sensible).

Séance de lancement du lot J3-2 (2026-11-28), réponses du porteur :

- **Contrôle statique** : `printAsync`, `selectPrinterAsync` et `ExpoPrint` refusés comme noms dans tout `src/`, même écrits en chaîne ; seul `printToFileAsync` peut être importé d'`expo-print` ; son argument est un objet écrit en entier, sans `...` ni variable, avec les seules clés `html`, `width`, `height` et `margins` (toute autre clé refusée, `uri`, `base64` et `useMarkupFormatter` compris) ; `Orientation` et `base64` ne sont pas interdits comme noms ailleurs.
- **SECURITE**, complété à l'intégration du 038 (« À reporter ») : SEC-08 reçoit le texte décidé, avec « à venir, 039 » pour la CSP et « à venir, 040 » pour le vidage de `cache/Print/` dans la colonne Vérification ; une ligne à SEC-02 (méta-données de la WebView vérifiées par `audit-apk.js`) ; une ligne à SEC-01 (`src/staticChecksPrint.test.ts`) ; limite écrite : `MetricsOptOut` ne couvre que les mesures d'usage.

Décisions automatiques de la pré-analyse (état « à relire », `docs/DECISIONS.md`) :

- Installation : `npx expo install expo-print`, puis version exacte `58.0.9` ; vérifier que l'installation n'ajoute aucune dépendance npm.
- Contrôle statique : importeurs ⊆ [`src/data/expoPrint.ts`], aucun aujourd'hui, durci en « exactement » au 040 ; outils de `src/__fixtures__/expoAccess.ts` ; chaque refus vu en échec.
- Extension `withoutWebViewMetrics` : deux `meta-data` sous `<application>` avec `tools:replace="android:value"` ; idempotente ; en dernier dans `app.json`.
- Audit : une seule `meta-data` de chaque nom, enfant direct d'`application`, valeur booléenne littérale (`true` pour MetricsOptOut, `false` pour EnableSafeBrowsing) ; refus d'une chaîne, d'une référence, d'un doublon, d'une valeur sous une activité ; contrôle inconditionnel ; tests dans `scripts/audit-apk-webview.test.js` (`audit-apk.test.js` fait 302 lignes).
- Listes : permissions et composants inchangés ; toute différence vue sur l'APK arrête le ticket et devient une question.
- Vérification à la main : `aapt2 dump permissions` et `aapt2 dump xmltree` avant et après, sur un APK de production local ; diff dans la PR ; démarrage sur l'émulateur.
- Ordre de fusion : le 038 avant le 040 ; ABS-07 se juge au niveau du jalon.
- Licences : `licences.json` régénéré au 040.
- Fichiers : 8, ou 9.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Où placer le contrôle des méta-données dans `audit-apk.js` | dans `auditManifest` ; fonction à part appelée par `main` | fonction `auditWebViewMetadata` à part, appelée sans condition par `main` sur le même `xmltree` ; `auditManifest` et `scripts/audit-apk.test.js` inchangés (9ᵉ fichier évité) | les tests existants appellent `auditManifest` sur des manifestes sans méta-données ; les refus existants ne bougent pas | à relire |
| Distinguer le booléen `true` de la chaîne `"true"` | réécrire `attribute` ; petite fonction qui s'appuie sur elle | `typedValue` réutilise `attribute` et garde les guillemets d'une chaîne ; format lu sur l'APK local : booléen `=true`, chaîne `="…" (Raw: "…")`, référence `=@0x7f…` | `attribute` (contrôle existant) n'est pas modifiée | à relire |
| `meta-data` nommée par référence de ressource | ignorer ; refuser | refusée (échec fermé), quel que soit son nom | une référence peut cacher l'un des deux noms ; même règle que les composants (ticket 026) ; aucune dans l'APK actuel | à relire |
| Références à `printToFileAsync` autres qu'un appel | permises ; refusées partout ; refusées hors des tests | appel contrôlé partout, tests compris ; autre référence (variable, réexport local, `{ printToFileAsync }`, `.call`, déstructuration) refusée hors des tests ; dans un test, clé d'une simulation et `expect(printToFileAsync)` permises | sinon `const f = printToFileAsync; f({ uri })` contourne le contrôle de l'argument ; le 040 doit pouvoir simuler le module | à relire |
| Formes d'import permises dans l'adaptateur | — | `import { printToFileAsync } from 'expo-print'` seul : alias (`as`), `import type`, défaut, effet de bord, `require`, `import()`, réexport refusés | « seul `printToFileAsync` peut être importé » ; un alias échappe au contrôle des appels | à relire |
| « Même écrits en chaîne » | chaîne égale au nom ; chaîne qui le contient | chaîne entière égale au nom (`'printAsync'`, `requireNativeModule('ExpoPrint')`, `m['selectPrinterAsync']`) | une sous-chaîne refuserait des textes sans rapport ; limite : nom calculé (`print${'Async'}`) non vu, écrite en tête du test | à relire |
| Méta-donnée déjà déclarée par une bibliothèque | garder les deux ; remplacer | l'extension retire toute déclaration de ces deux noms sous `<application>` et ajoute la sienne | idempotence, aucun doublon ; `tools:replace` règle la fusion avec les bibliothèques | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Rapport PDF : bibliothèque d'impression d'Expo, sans permission ni réseau ; mesures d'usage de la WebView d'Android refusées (F-09, ABS-01, ABS-07).
- Architecture : §2 expo-print installé (version exacte) ; §6 extension `plugins/withoutWebViewMetrics.js`, audit des méta-données WebView.
- SECURITE (à l'intégration du 038, décisions du porteur du 2026-11-28) : SEC-08 complétée : expo-print importé par `src/data/expoPrint.ts` seul, `printToFileAsync` seul, argument écrit en entier avec les clés `html`, `width`, `height`, `margins` seulement (`printAsync`, `selectPrinterAsync`, `ExpoPrint`, `uri`, `base64`, `useMarkupFormatter` refusés) ; CSP `default-src 'none'; style-src 'unsafe-inline'; img-src data:` en tête du HTML (Vérification : « à venir, 039 ») ; `cache/Print/` vidé après chaque rapport, au démarrage et après Tout effacer (Vérification : « à venir, 040 ») ; méta-données `MetricsOptOut` et `EnableSafeBrowsing` vérifiées sur l'APK. SEC-02 : ligne « méta-données de la WebView vérifiées par `audit-apk.js` ». SEC-01 : ligne `src/staticChecksPrint.test.ts`. Limite : `MetricsOptOut` ne couvre que les mesures d'usage.
- CONFORMITE (à l'intégration) : §3, rapport et export partagés par l'encadrant, même interprétation que la sauvegarde, à décrire dans la politique au jalon 6 (ABS-08), déclarations inchangées ; §8, module natif expo-print (MIT), aucune bibliothèque tierce nouvelle.
- Relevé du 2026-11-28, APK de production construit en local avant et après l'installation (`expo prebuild --clean`, `gradlew assembleRelease`), `aapt2` 37.0.0 :
  - Installation : `npx expo install expo-print` a écrit `~58.0.9`, ramené à `58.0.9` ; une seule entrée ajoutée au verrou (`node_modules/expo-print`, MIT, aucune dépendance npm) ; `npm audit` : 0 vulnérabilité. Manifeste de l'AAR `expo.modules.print-58.0.9` : aucune permission, aucun composant ; dépendances Maven `kotlin-stdlib-jdk7` 2.2.10, `annotations` 23.0.0, `pika-api` 1.1.0.
  - `aapt2 dump permissions` : **identique** avant et après (`RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `com.jitavision.kila.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` déclarée et utilisée). INTERNET absente.
  - `aapt2 dump xmltree --file AndroidManifest.xml`, diff sans les numéros de ligne (`(line=…)`) : seules les deux méta-données sont ajoutées sous `<application>` ; 8 composants avant, 8 après, identiques.
    ```
    63a64,69
    >             A: http://schemas.android.com/apk/res/android:name(0x01010003)="android.webkit.WebView.EnableSafeBrowsing" (Raw: "android.webkit.WebView.EnableSafeBrowsing")
    >             A: http://schemas.android.com/apk/res/android:value(0x01010024)=false
    >           E: meta-data
    >             A: http://schemas.android.com/apk/res/android:name(0x01010003)="android.webkit.WebView.MetricsOptOut" (Raw: "android.webkit.WebView.MetricsOptOut")
    >             A: http://schemas.android.com/apk/res/android:value(0x01010024)=true
    >           E: meta-data
    ```
  - `node scripts/audit-apk.js` : APK d'avant, 2 écarts (« Méta-donnée WebView absente » pour chacune) ; APK d'après, « Audit du binaire : conforme (SEC-02) ».
  - Émulateur `emulator-5554` : APK d'après installé, `pm clear`, lancé : `DB_READY` (version 1), écran **Bienvenue**, aucun plantage.
  - Contrôle statique vu en échec : chacune des 10 règles de `src/staticChecksPrint.test.ts` neutralisée tour à tour fait échouer au moins un test ; un fichier fictif `src/fictif038.test.ts` (import de `printAsync`, appel avec `uri`) fait échouer le balayage du dépôt (« nom refusé », « clé refusée »), puis retiré.
