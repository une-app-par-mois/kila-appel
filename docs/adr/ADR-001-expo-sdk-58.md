# ADR-001 — Expo SDK 58, development build, dépendances minimales

Statut : proposé · 2026-11-26

## Contexte

Une seule base de code pour Android et iOS, téléphone et tablette ; expérience acquise sur l'ancienne version (SDK 57).

## Décision

Expo SDK 58.0.26, React Native 0.88.1, React 19.3.0, TypeScript ~6.0.3 (versions vérifiées le 2026-11-26). Développement sur *development build*. La pile du §2 d'`ARCHITECTURE.md` vaut liste fermée : toute autre dépendance passe par la validation du porteur. Chaque dépendance n'est installée qu'au ticket qui l'utilise (ABS-07).

## Options écartées

Flutter (rien de l'expérience passée réutilisable) ; natif Kotlin + Swift (deux applis) ; Expo Go (n'applique pas la configuration native).

## Conséquences

Montée de SDK = ticket dédié. Les permissions apportées par chaque dépendance sont auditées sur le binaire.
