# ADR-004 — Séances calculées à la volée

Statut : proposé · 2026-11-26

## Contexte

Modifier un créneau ne doit jamais altérer l'historique ; pré-générer les séances crée des lignes fantômes.

## Décision

Les occurrences d'un créneau sont calculées par une fonction pure du domaine (créneau + période → dates). Une ligne `session` n'existe qu'une fois l'appel enregistré, préparé, annulé ou marqué non planifié.

## Options écartées

Pré-génération des séances de la saison.

## Conséquences

EX-07, EX-08, EX-17 ; fortement testé dans le domaine.
