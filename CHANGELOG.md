# Changelog

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouté

- Séances calculées à la volée : dates d'un créneau, séance proposée, appels manquants ; date de création des créneaux — ticket 005.
- Builds sur la CI (APK Android de test, build iOS simulateur) et audit du binaire : une seule permission interne, sans INTERNET, sans sauvegarde système, sans lien entrant ; base ouverte et migrée au démarrage — ticket 004.
- Thème tiré de la charte, polices IBM Plex embarquées (OFL 1.1), module de journal sans donnée personnelle, contrôles automatiques (textes, couleurs, réseau, jetons de notification) — ticket 003.
- Base locale : schéma complet de la v1 (migration 1, 16 tables), suppressions en cascade (SEC-11) — ticket 002.
- Dates : années acceptées de 1900 à 2100 (RM-04).
- Socle Expo SDK 58 (React Native 0.88.1, Expo Router) et outillage de test : Biome 2.6.9, TypeScript 6.0.3, Jest (jest-expo) — ticket 001.
- Dépendances : liste et versions exactes dans `docs/ARCHITECTURE.md` §2.

## [0.1.0] — [AAAA-MM-JJ]

- Première version publiée.
