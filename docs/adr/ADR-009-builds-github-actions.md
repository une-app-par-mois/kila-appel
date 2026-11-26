# ADR-009 — Binaires construits sur GitHub Actions uniquement

Statut : proposé · 2026-11-26

## Contexte

Le modèle prévoit des builds sur la CI avec empreintes SHA-256 et attestation de provenance.

## Décision

`expo prebuild`, puis Gradle (Android, runner Linux) et Xcode (iOS, runner macOS) sur GitHub Actions, déclenchés par un tag `vX.Y.Z`. Clés de signature en secrets GitHub, posées par le porteur.

## Options écartées

EAS Build (service cloud d'Expo, compte et quotas) ; décision reportée.

## Conséquences

Décision du porteur du 2026-11-26. **Non vérifié** : coût des runners macOS pour un dépôt public, signature iOS sans EAS. À vérifier avant le ticket de build.
