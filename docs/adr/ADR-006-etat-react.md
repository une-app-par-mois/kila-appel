# ADR-006 — État de l'interface avec React seul

Statut : proposé · 2026-11-26

## Contexte

Peu d'état partagé ; le brouillon d'appel doit survivre à une fermeture forcée.

## Décision

État local et hooks ; tout ce qui doit durer est écrit dans SQLite (brouillon à chaque appui).

## Options écartées

Zustand 5.1.0.

## Conséquences

Aucune dépendance. Décision du porteur du 2026-11-26.
