# ADR-002 — SQLite pour les données et les réglages, sans ORM

Statut : proposé · 2026-11-26

## Contexte

Il faut une base locale fiable ; les réglages doivent suivre la sauvegarde.

## Décision

expo-sqlite pour tout, réglages compris (table `settings`). Requêtes SQL écrites à la main, paramétrées, dans les dépôts de `src/data/`.

## Options écartées

react-native-mmkv pour les réglages (dépendance native de plus, réglages hors sauvegarde) ; ORM (couche de plus, migrations moins lisibles).

## Conséquences

Une seule source de vérité, sauvegardée d'un bloc. Décision du porteur du 2026-11-26.
