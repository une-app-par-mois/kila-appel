# Conventions et Definition of Done — Ki&La (appel)

Statut : ✅ validé le 2026-11-26

Ce que la machine ne vérifie pas encore, l'IA le respecte ; ce qu'elle peut vérifier, on l'ajoute à `scripts/test.sh`, au lint ou à un hook plutôt qu'ici. Chaque règle a un identifiant `CONV-xx`. La colonne « Vérifié par » dit qui la garantit.

## 1. Langues et nommage

| ID | Règle | Vérifié par |
| --- | --- | --- |
| CONV-01 | Identifiants en anglais, avec le terme du glossaire du cadrage (`Session`, `RollCall`, `Attendance`…) ; aucun synonyme | Revue |
| CONV-02 | Commentaires, textes de l'interface, documents et messages de commit en français | Revue |
| CONV-03 | Tous les textes de l'interface dans `src/config/libelles.ts`, jamais en dur dans un écran | Règle de lint (texte littéral dans le JSX interdit hors de ce fichier) |
| CONV-04 | Fichiers : composants et écrans en `PascalCase.tsx` sauf les routes Expo Router (`index.tsx`, `[id].tsx`) ; le reste en `camelCase.ts` | Revue |
| CONV-05 | Tables SQL au pluriel, colonnes en `snake_case` (`docs/ARCHITECTURE.md` §4) | Tests de données |

## 2. Code

| ID | Règle | Vérifié par |
| --- | --- | --- |
| CONV-10 | Arborescence et sens des imports de `docs/ARCHITECTURE.md` §1 et §3 : `app` → `hooks` → `domain` → `data`, jamais l'inverse ; `domain` n'importe ni React ni `data` | Règle d'import (Biome ou test qui lit les imports) |
| CONV-11 | Domaine pur : l'heure (`now`) et tout hasard sont passés en paramètres | Revue ; tests |
| CONV-12 | TypeScript strict, zéro erreur ; pas de `any`, pas de `@ts-ignore` | `tsc --noEmit` dans `scripts/test.sh` ; lint |
| CONV-13 | Toute promesse est attendue ou explicitement gérée (bogue de restauration de l'ancienne version) | Lint `noFloatingPromises` en erreur |
| CONV-14 | Données venues de l'extérieur (fichier importé, sauvegarde, saisie) validées à l'entrée, jamais simplement converties | Tests (SEC-06, SEC-10) |
| CONV-15 | Erreurs attendues gérées et affichées clairement, sans terme technique ; aucune exception avalée en silence | Revue ; tests d'écrans |
| CONV-16 | Couleurs, tailles, rayons, espacements tirés du thème dérivé de `design/jetons.json` ; aucune valeur en dur dans un écran | Lint (couleur littérale interdite hors du thème) |
| CONV-17 | Journaux uniquement par le module de journal (SEC-12) | Lint `console.*` interdit ailleurs |
| CONV-18 | SQL uniquement dans `src/data/`, toujours paramétré (SEC-05) | Revue ; Semgrep |
| CONV-19 | Un commentaire qui justifie une règle cite son identifiant (`// EX-14 : brouillon écrit à chaque appui`) | Revue |
| CONV-20 | Lint et format par Biome : indentation 2 espaces, guillemets simples, virgules finales, 100 colonnes, imports triés | `biome check` dans `scripts/test.sh` |

## 3. Dépendances et versions

| ID | Règle | Vérifié par |
| --- | --- | --- |
| CONV-30 | Seules les dépendances de `docs/ARCHITECTURE.md` §2 ; toute autre est proposée au porteur (raison, licence, date de mise à jour, existence vérifiée) | Revue ; workflow « Sécurité » |
| CONV-31 | Versions exactes, `package-lock.json` commité, installation par `npx expo install` pour les modules Expo ; en cas de conflit, épingler le paquet fautif, jamais `--legacy-peer-deps` | Revue |
| CONV-32 | Version de l'appli en SemVer (`MAJEUR.MINEUR.CORRECTIF`), portée par le tag `vX.Y.Z` ; `versionCode` et `buildNumber` calculés par la CI depuis le tag | `release.yml` |
| CONV-33 | Schéma de base versionné par `PRAGMA user_version` ; migrations jamais réécrites après publication (ADR-003) | Tests de migration |
| CONV-34 | Format de sauvegarde = schéma de la base : une sauvegarde d'une version antérieure se restaure (migrations), une d'une version future est refusée (SEC-10) | Tests de données |

## 4. Git et journal

| ID | Règle | Vérifié par |
| --- | --- | --- |
| CONV-40 | Une branche `ticket/NNN-intitule` par ticket ; jamais de commit sur `main` | Hook pre-commit |
| CONV-41 | Message « Domaine : ce qui change », 72 caractères au plus pour la première ligne, en français | Hook commit-msg |
| CONV-42 | `CHANGELOG.md` (format Keep a Changelog, en français, du point de vue de l'utilisateur) mis à jour pour tout changement visible, de données, de permission ou de dépendance | Revue ; DoD |

## 5. Stratégie de tests

### 5.1 Principes

- Aucun test n'appelle le réseau ; heure et hasard injectés ; données toujours fictives (`src/__fixtures__/`).
- Un test qui échoue n'est jamais désactivé ni supprimé pour faire passer un ticket (`.skip`, `.only` interdits par le lint).
- Le test est écrit et vu en échec avant le code ; un bogue corrigé commence par un test qui le reproduit.
- Chaque fonctionnalité `F-xx` a au moins un test dont le nom cite son identifiant ; chaque exigence `EX-xx`, `RM-xx`, `SEC-xx` est citée par au moins un test ou une vérification manuelle décrite.

### 5.2 Niveaux et cas obligatoires

| Partie | Niveau | Cas obligatoires |
| --- | --- | --- |
| Domaine (`src/domain/`) | Unitaire | RM-01 à RM-06 avec bornes (zéro séance, que des excusés, série interrompue) ; occurrences de créneaux (récurrent, ponctuel, changement d'heure, créneau créé en cours de saison) ; CSV (SEC-06, SEC-07) ; échappement du PDF (SEC-08) |
| Données (`src/data/`) | Sur vraie base `node:sqlite` (ADR-008) | Migration 1 sur base vide ; cascades de suppression (SEC-11) ; requêtes avec apostrophes et points-virgules (SEC-05) ; sauvegarde puis restauration identique ; fichiers de restauration invalides (SEC-10) ; brouillon (EX-14) |
| Écrans | Testing Library | Appel : cycle des statuts, compteur, brouillon ; confirmations de suppression ; avertissement d'export présent (SEC-09) |
| Contrôles statiques | Tests de recherche dans le code | SEC-01 (aucun appel réseau), SEC-03 (pas de jeton push) |
| Bout en bout | Maestro, campagne de fin de jalon | Appel de 20 membres chronométré (NF-01) ; brouillon après fermeture forcée ; sauvegarde → effacement → restauration sur Android réel |

### 5.3 Couverture

Seuils sur `src/domain/` et `src/data/` : **90 % des lignes, 85 % des branches**. Ils ne baissent jamais ; `scripts/test.sh` échoue en dessous.

### 5.4 Ce que lance `scripts/test.sh`

`biome check`, `tsc --noEmit`, `node scripts/contrastes.mjs`, les tests Jest avec couverture. Il échoue au premier problème.

## 6. Definition of Done d'un ticket

Recopiée et cochée dans la PR (le modèle de PR la contient). Une case non cochée sans raison bloque la fusion.

1. Chaque critère d'acceptation du ticket est couvert par un test automatisé, ou listé avec la façon de le vérifier à la main.
2. Le test a été vu en échec avant le code ; un bogue corrigé a son test qui le reproduit.
3. `./scripts/test.sh` passe en local ; tous les travaux de la CI sont verts sur la PR du jalon vers `main`.
4. `/code-review` lancé, remarques traitées ou expliquées ; `/security-review` en plus en zone sensible, et relecture du porteur avant la fusion dans le jalon.
5. Aucun secret, aucune donnée réelle, aucun appel réseau ajouté ; aucune dépendance sans validation.
6. Interface touchée : comparée à la maquette, écarts listés dans la PR.
7. Documents de référence et `CHANGELOG.md` à jour si une décision écrite ou un comportement visible change.
8. `ETAT.md` à jour, avec ce qui n'a **pas** été vérifié.

## Décisions du porteur

- 2026-11-26 : seuils de couverture 90 % des lignes et 85 % des branches sur domaine et données ; contrôle automatique des textes et couleurs en dur (lint, ou test si Biome ne le permet pas, vérifié au ticket d'outillage) ; `CHANGELOG.md` au format Keep a Changelog. La DoD reprend la relecture du porteur en zone sensible avant la fusion dans le jalon.
