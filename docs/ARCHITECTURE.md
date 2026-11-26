# Architecture — Ki&La (appel)

Statut : 🟡 brouillon complet, en attente de relecture · Dernière mise à jour : 2026-11-26

Comment l'appli est faite. S'appuie sur `docs/CADRAGE.md`, `docs/PRD.md` et `design/CHARTE.md` (validés). Chaque décision structurante a son ADR dans `docs/adr/` ; ce document en donne la vue d'ensemble et renvoie vers eux.

## 1. Vue d'ensemble

Une seule application React Native (Expo), Android et iOS, **sans serveur ni réseau** (ABS-01, ABS-02). Toutes les données vivent dans une base SQLite dans l'espace privé de l'appli ; elles n'en sortent que par une sauvegarde, un export CSV ou un PDF que l'encadrant déclenche et destine lui-même.

```
Écrans (src/app/)  →  Hooks (src/hooks/)  →  Domaine (src/domain/)  →  Données (src/data/)
```

Le sens des imports est strict : jamais vers la gauche. Le domaine est pur (ni React, ni stockage, ni horloge implicite).

## 2. Pile technique

Chaque ligne vaut validation de la dépendance (ADR-001). **Une dépendance n'est installée qu'au ticket de la fonctionnalité qui l'utilise** (ABS-07). Versions vérifiées sur npm le 2026-11-26 ; elles sont revérifiées au premier ticket et fixées par `npx expo install`.

| Paquet | Version | Licence | Rôle | Installé avec |
| --- | --- | --- | --- | --- |
| expo | 58.0.26 | MIT | SDK | Outillage |
| react-native | 0.88.1 (fixée par le SDK) | MIT | Interface native | Outillage |
| react | 19.3.0 (fixée par le SDK) | MIT | Interface | Outillage |
| typescript | ~6.0.3 (modèle du SDK 58) | Apache-2.0 | Typage strict | Outillage |
| expo-router | ~58.0.32 | MIT | Navigation par fichiers | Outillage |
| expo-font | ~58.0.12 | MIT | Polices IBM Plex embarquées | Outillage |
| expo-sqlite | ~58.0.18 | MIT | Base locale | F-01 |
| react-native-svg | 15.16.0 (fixée par le SDK) | MIT | Dessin, icônes | Premier écran |
| lucide-react-native | 1.81.0 | ISC | Icônes au trait (charte §8) | Premier écran |
| expo-file-system | ~58.0.14 | MIT | Fichiers de sauvegarde | F-03 |
| expo-sharing | ~58.0.23 | MIT | Partage d'un fichier exporté | F-03 |
| expo-document-picker | ~58.0.5 | MIT | Choix d'un fichier (restauration, import) | F-03 |
| expo-notifications | ~58.1.9 | MIT | Relance locale (ADR-007) | F-06 |
| expo-print | ~58.0.9 | MIT | Rapport PDF | F-09 |
| jest-expo | ~58.0.15 | MIT | Tests | Outillage |
| @testing-library/react-native | 14.1.0 | MIT | Tests d'écrans | Outillage |
| @biomejs/biome | 2.6.9 | MIT ou Apache-2.0 | Lint et format | Outillage |

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
  __fixtures__/   données de test fictives
assets/fonts/     polices et leur licence
```

Les identifiants suivent le glossaire du cadrage (colonne « Terme du code »).

## 4. Données

### 4.1 Schéma (ADR-003 : complet dès la migration 1)

| Table | Colonnes principales | Remarques |
| --- | --- | --- |
| `season` | id, name, start_date, end_date, is_active | Une seule active (index unique partiel) |
| `member` | id, last_name, first_name, birth_date?, archived_at? | Seuls nom et prénom obligatoires (ABS-03) |
| `emergency_contact` | id, member_id, label, phone, position | `ON DELETE CASCADE` depuis `member` |
| `group` | id, season_id, name, archived_at? | |
| `enrollment` | id, member_id, group_id, start_date, end_date? | Cascade depuis `member` et `group` |
| `slot` | id, season_id, weekday?, start_time, duration_min, place?, name? | `weekday` nul = créneau ponctuel |
| `slot_date` | slot_id, date | Dates d'un créneau ponctuel (F-10) |
| `slot_group` | slot_id, group_id | Plusieurs groupes par créneau (F-11) |
| `session` | id, season_id, slot_id?, date, start_time, state, comment? | `state` ∈ recorded, prepared, cancelled, unscheduled ; `slot_id` nul = appel sans créneau (EX-39) ; unique (slot_id, date) (RM-05) |
| `session_group` | session_id, group_id | Groupes figés au jour de la séance |
| `attendance` | session_id, member_id, status | `status` ∈ present, absent, late, excused ; cascade depuis `member` et `session` |
| `roll_call_draft` | slot_id?, date, group_ids, statuses, comment, updated_at | Un seul brouillon à la fois (EX-14) |
| `alert_ack` | member_id, streak_length, acked_at | Alerte traitée à ce niveau de série (EX-26) |
| `setting` | key, value | Réglages (ADR-002) |

- Dates en texte `AAAA-MM-JJ`, heures `HH:MM` (RM-04) ; conversion d'affichage dans `src/domain/formats.ts` seulement.
- **Séances calculées à la volée** (ADR-004) : une ligne `session` n'existe qu'une fois l'appel enregistré, préparé, annulé ou marqué non planifié.
- Requêtes toujours paramétrées ; `PRAGMA foreign_keys = ON` à chaque ouverture.

### 4.2 Migrations

Numérotées, appliquées dans une transaction, version dans `PRAGMA user_version`, **jamais réécrites une fois publiées**. Avant la publication, la migration 1 reste la seule (ADR-003). Zone sensible.

### 4.3 Sauvegarde et restauration (zone sensible)

- **Export** : copie cohérente par `VACUUM INTO` vers un fichier `kila-sauvegarde-AAAA-MM-JJ.db`, puis partage par le système. En clair (ADR-005), avec l'avertissement d'EX-19.
- **Restauration** : le fichier est d'abord vérifié sur une copie temporaire (`PRAGMA integrity_check`, tables attendues, `user_version` ≤ version de l'appli, puis migrations si plus ancien). Seulement ensuite, la base courante est fermée, remplacée, rouverte. Un échec laisse la base courante intacte (EX-20).
- **Base illisible au démarrage** : détectée, écran de récupération (EX-22). `android:allowBackup` à `false`.

## 5. Notifications (F-06, ADR-007)

Locales uniquement. À chaque écriture qui touche créneaux, séances ou réglages : tout annuler, puis reprogrammer les relances des 7 jours à venir (plafond iOS de 64 notifications en attente). Texte : le groupe, jamais un membre (ABS-04). La permission n'est demandée qu'à l'activation (EX-29).

## 6. Permissions et confidentialité

- `blockedPermissions` dans la configuration Expo pour tout ce que l'appli n'utilise pas ; `INTERNET` retirée du binaire de production (ABS-01).
- **Audit sur le binaire construit** (`aapt2 dump permissions`), pas sur le manifeste : à la CI de fin de jalon et à chaque version.
- iOS : `ITSAppUsesNonExemptEncryption` = `false` ; aucune habilitation `aps-environment`.

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

- **Développement** : *development build* (`expo-dev-client`), pas Expo Go, pour éprouver notifications et configuration native.
- **Binaires publiés : construits sur GitHub Actions uniquement** (décision du 2026-11-26) : `expo prebuild`, puis Gradle (Android, runner Linux) et Xcode (iOS, runner macOS) ; empreintes SHA-256 et attestation de provenance dans `release.yml`. Les clés de signature sont des secrets GitHub posés par le porteur, jamais dans le dépôt.
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
| NF-08 volume | Agrégats calculés en SQL, index sur `attendance(member_id)`, `session(date)` ; jeu de test de 500 membres et 3 saisons |

## Points à vérifier en relisant

1. **ADR-008** : tests de la couche données avec le module `node:sqlite` intégré à Node 22 (aucune dépendance), à confirmer au ticket d'outillage : il faut que les mêmes requêtes tournent sur `node:sqlite` et `expo-sqlite`.
2. **`roll_call_draft`** : le brouillon dans une table à part plutôt que comme une séance à l'état « brouillon », pour qu'aucune requête de statistiques ne puisse le compter.
3. **ADR-009** : la gratuité des runners macOS standard pour un dépôt public est vérifiée (sources dans l'ADR) ; reste à vérifier la signature iOS sans EAS (certificats et profils à créer par le porteur dans son compte Apple), au ticket de build.
4. Noms de tables et colonnes en anglais, d'après le glossaire ; `group` est un mot réservé SQL et devra être entre guillemets (ou renommé `class_group`, à trancher).
5. Format du fichier de sauvegarde : la base SQLite brute (`.db`), lisible par tout outil SQLite.
