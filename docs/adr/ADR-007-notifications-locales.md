# ADR-007 — Relance par notifications locales, sans jeton push

Statut : accepté le 2026-11-26

## Contexte

La relance (F-06) a besoin d'expo-notifications, dont deux fonctions émettent du réseau.

## Décision

Notifications locales seulement : tout annuler puis reprogrammer 7 jours à chaque écriture. `getExpoPushTokenAsync` et `getDevicePushTokenAsync` ne doivent apparaître nulle part (contrôle automatique à ajouter au ticket F-06). Pas d'habilitation `aps-environment`.

## Options écartées

Service de push (serveur, réseau).

## Conséquences

Relances interrompues si l'appli n'est pas ouverte pendant plus de 7 jours : limite assumée.
