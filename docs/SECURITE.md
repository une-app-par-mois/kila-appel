# Sécurité — Ki&La (appel)

Statut : ✅ validé le 2026-11-26

Ce qu'on protège, contre quoi, et comment chaque exigence est vérifiée. S'appuie sur le cadrage, le PRD, l'architecture et les règles ABS-01 à ABS-08 de `CLAUDE.md`. Les exigences `SEC-xx` sont citées dans le code, les tests et les tickets.

## 1. Ce qu'on protège

| Bien | Pourquoi |
| --- | --- |
| Noms, dates de naissance des membres (souvent mineurs) | Données personnelles de tiers |
| Contacts d'urgence (téléphones de parents) | Données de tiers, utiles à un démarchage ou un harcèlement |
| Historique des présences | Révèle des habitudes et des lieux de mineurs (créneau + lieu) |
| Intégrité des données | Tout est local : une donnée perdue l'est pour toujours |
| La promesse « aucune donnée collectée » | Argument du produit et fondement des déclarations stores |

## 2. Modèle de menaces par zone

| Zone | Menace | Parade (exigence) |
| --- | --- | --- |
| Dépendances et build | Une dépendance émet du réseau, ajoute une permission, ou est compromise | SEC-01, SEC-02, SEC-03, SEC-04 |
| Base locale | Requête construite à partir d'une saisie (injection SQL) ; base corrompue | SEC-05, SEC-10 |
| Import CSV | Fichier piégé : taille énorme, encodage, formules de tableur, champs hors schéma | SEC-06, SEC-07 |
| Exports (CSV, PDF, sauvegarde) | Fuite d'un fichier en clair ; injection de formules à l'ouverture du CSV dans un tableur ; HTML injecté dans le PDF | SEC-07, SEC-08, SEC-09 |
| Restauration | Fichier qui n'est pas une sauvegarde, ou version future, qui écrase les données | SEC-10 |
| Effacement | Suppression incomplète (données qui restent) ou trop large | SEC-11 |
| Notifications, journaux | Nom d'un mineur sur l'écran verrouillé ou dans un journal système | SEC-12 |
| Appareil | Téléphone perdu sans code de verrouillage, appareil rooté | Risque accepté (§5) |
| Dépôt public | Secret ou donnée réelle publiés | SEC-13 |

## 3. Exigences

| ID | Exigence | Vérification |
| --- | --- | --- |
| SEC-01 | Aucun appel réseau : aucun client HTTP, `fetch`, `XMLHttpRequest`, WebSocket dans `src/` | Test `src/staticChecks.test.ts` : `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `loadAsync`, `useFonts` (aussi par `obj['…']`), `uri` en `http(s)`/`ws(s)`, chargeurs de `react-native-svg` (`SvgUri`, `SvgCssUri`, `SvgFromUri`, `LocalSvg`, `WithLocalSvg`, `fetchText`, aussi par `obj['…']`, décision du porteur du 2026-11-26), « Bundle Mode » de `react-native-worklets` (son réseau) demandé par aucune configuration Babel ou Metro (décision du porteur du 2026-11-26, ticket 008b), attributs JSX `href`, `xlinkHref`, `uri` distants et SVG en texte (`xml`) contenant une adresse ; revue des dépendances ; permission INTERNET absente du binaire (ticket 004) ; test `src/staticChecksFiles.test.ts` (tickets 014b, 014e) : expo-file-system, expo-sharing et expo-document-picker importés par `src/data/expoFiles.ts` seul ; table des modules natifs `expo.modules` refusée partout ; lecture de `globalThis.expo` ou `global.expo` et noms `ExpoDocumentPicker`, `FileSystem`, `ExpoSharing` refusés hors de l'adaptateur ; tout sous-chemin de ces modules (`legacy`, `next`, `build/…`), `requireNativeModule`, `requireOptionalNativeModule`, `downloadFileAsync`, `downloadAsync`, `uploadAsync`, `upload`, `createDownloadResumable`, `createUploadTask`, `createDownloadTask`, `DownloadResumable`, `UploadTask`, `DownloadTask`, `getResolvedSharedPayloadsAsync` refusés ; fichiers `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` de `src/` parcourus. Limites connues : un nom calculé (`obj[a + b]`, `obj[nom]`) n'est pas vu, `node_modules` n'est pas lu ; la revue de code et l'audit de l'APK complètent |
| SEC-02 | Permission `INTERNET` absente du binaire Android de production ; liste des permissions égale à la liste attendue | `scripts/audit-apk.js` (`aapt2 dump permissions`) sur l'APK, workflow `builds.yml` à chaque PR vers `main`, comparé à `config/permissions-attendues.txt` ; testé par `scripts/audit-apk.test.js` et par une permission ajoutée puis retirée (ticket 004) |
| SEC-03 | `getExpoPushTokenAsync` et `getDevicePushTokenAsync` n'apparaissent nulle part | Test qui cherche ces noms dans `src/` (ADR-007) |
| SEC-04 | Dépendances : versions exactes, lockfile commité, `npm audit` sans vulnérabilité haute, actions de CI épinglées par empreinte | Workflow « Sécurité » (déjà en place) ; Dependabot |
| SEC-05 | Toutes les requêtes SQL sont paramétrées ; aucune concaténation de valeur dans une requête | Semgrep + revue ; tests de données avec des noms contenant `'`, `"`, `;` |
| SEC-06 | L'import CSV refuse un fichier de plus de 1 Mo ou de plus de 2 000 lignes, lit l'UTF-8 (et le Windows-1252 courant d'Excel), ne garde que les colonnes connues, valide chaque champ (longueurs, date, téléphone) avant toute écriture | Tests du domaine avec des fichiers piégés fictifs |
| SEC-07 | Un champ texte commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot est neutralisé à l'export CSV (préfixe `'`) | Test du domaine |
| SEC-08 | Le PDF est produit à partir d'un HTML où chaque valeur est échappée ; aucun script, aucune ressource externe | Test du générateur de HTML |
| SEC-09 | Avant toute sortie de données (sauvegarde, CSV, PDF), l'écran dit ce que contient le fichier et qu'il est en clair | Test d'écran ; maquettes validées |
| SEC-10 | Restauration : le fichier est vérifié sur une copie (intégrité, tables, version de schéma ≤ appli) avant de remplacer la base ; échec = base intacte ; la copie du sélecteur et la copie vérifiée sont effacées dans tous les cas (ticket 014e) ; la restauration vide ses dossiers sous le verrou commun (`'restore'`), au début de chaque restauration, jamais au montage de l'écran ; les copies laissées par un arrêt brutal (`cache/sauvegardes/`, `cache/restauration/`, `cache/DocumentPicker/`, et sur iOS `tmp/com.jitavision.kila-Inbox/`) sont effacées au démarrage suivant, sous le verrou commun (`'cleanup'`), jamais pendant une opération en cours (ticket 014c) | Tests de données : fichier tronqué, autre base SQLite, version future, fichier texte ; tests `src/hooks/useRestore.test.tsx`, `useRestoreGuards.test.tsx` (refus, Annuler, retour, fermeture, échec, réussite) ; recette sur l'A55 du 2026-11-27 (NF-04) ; `src/hooks/useStartupCleanup.test.tsx` (trois dossiers tentés, nettoyage sauté si le verrou est pris), `src/hooks/useRestore.test.tsx` (vidage sous le verrou) |
| SEC-11 | Supprimer un membre efface ses présences, contacts, inscriptions et alertes traitées ; « tout effacer » vide la base et les réglages ; une purge n'efface que les saisons visées et les membres qui ne figurent plus dans aucune saison gardée (décision du porteur du 2026-11-27) ; les valeurs supprimées ne restent pas dans le fichier de base (`PRAGMA secure_delete`, décision du porteur du 2026-11-26 ; limites : journal de transaction temporaire, voir ticket 007d) ; le mode de journal est fixé à `delete` et vérifié à chaque ouverture, sinon la base n'est pas ouverte (`JOURNAL_MODE_OFF` ; `memory` accepté seulement pour une base sans fichier, décision du porteur du 2026-11-27, ticket 015c) ; limite : « Repartir de zéro » (EX-22, ticket 014c) supprime le fichier de la base et ses fichiers `-journal`, `-wal`, `-shm` par expo-sqlite, sans écraser les octets : ils restent dans le stockage privé de l'appli, chiffré par le système, jusqu'à ce que le système réutilise la place (décision du porteur du 2026-11-27) | Tests de données qui comptent les lignes avant et après ; test qui cherche un nom fictif supprimé dans les octets du fichier ; tests du mode de journal (`src/data/open.test.ts` : `delete` relu, base en WAL ramenée à `delete`, refus si le mode n'est pas fixé) ; `src/hooks/useDatabase.test.tsx` (suppression seulement pour une base abîmée, avant la nouvelle ouverture), `src/appTests/recovery.test.tsx` (fichier effacé après confirmation seulement) |
| SEC-12 | Aucun nom, prénom, téléphone ou date de naissance dans une notification, un `console.*`, un message d'erreur | Règle de lint interdisant `console.*` hors d'un module de journal unique, qui n'accepte que des identifiants ; test du texte des notifications |
| SEC-13 | Aucun secret ni donnée réelle dans le dépôt ; données de test fictives dans `src/__fixtures__/` | gitleaks (hook et CI) ; `.gitignore` des `.db`, `.csv` hors fixtures |

## 4. Tests de sécurité

Écrits avec le code, dans le ticket de la fonctionnalité concernée ; ils échouent si un contrôle disparaît. Les fichiers piégés de test sont fictifs et vivent dans `src/__fixtures__/`.

## 5. Risques acceptés

| Risque | Pourquoi on l'accepte |
| --- | --- |
| Sauvegarde, CSV et PDF en clair hors de l'appli | Pas de chiffrement applicatif (ADR-005) ; avertissement non réductible (SEC-09) |
| Pas de verrouillage de l'appli | Décision du cadrage : ne pas ralentir l'appel ; on s'en remet au verrouillage de l'appareil |
| Appareil rooté ou débridé, ou sans code | Hors de portée d'une appli sans chiffrement ; dit dans la politique de confidentialité |
| Relances perdues après 7 jours sans ouverture | Limite des notifications locales (ADR-007) |

## 6. Procédure d'incident

1. Signalement privé par l'onglet Security du dépôt (`SECURITY.md`), accusé de réception sous 7 jours.
2. Le porteur qualifie la gravité ; l'IA reproduit par un test, dans un ticket en zone sensible.
3. Correctif, nouvelle version, mention dans `AUDIT.md` et les notes de version.
4. Hypothèse à vérifier au document de conformité (RGPD, art. 33 et 34) : aucune donnée n'étant collectée, l'éditeur n'aurait rien à notifier à la CNIL au titre d'une fuite chez lui ; si le défaut a pu exposer des données sur les appareils, les notes de version disent quoi faire (par exemple supprimer d'anciennes sauvegardes).

## Décisions du porteur

- 2026-11-26 : SEC-06 (1 Mo, 2 000 lignes, UTF-8 et Windows-1252), SEC-07 (neutralisation des formules) et SEC-12 (module de journal unique, `console.*` interdit ailleurs) validés tels que proposés ; l'hypothèse CNIL du §6 est renvoyée au document de conformité.
