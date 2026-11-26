# ADR-009 — Binaires construits sur GitHub Actions uniquement

Statut : proposé · 2026-11-26

## Contexte

Le modèle prévoit des builds sur la CI avec empreintes SHA-256 et attestation de provenance.

## Décision

`expo prebuild`, puis Gradle (Android, runner Linux) et Xcode (iOS, runner macOS) sur GitHub Actions, déclenchés par un tag `vX.Y.Z`. Clés de signature en secrets GitHub, posées par le porteur.

## Options écartées

EAS Build (service cloud d'Expo, compte et quotas) ; décision reportée.

## Conséquences

Décision du porteur du 2026-11-26.

- **Vérifié le 2026-11-26** : « Use of the standard GitHub-hosted runners is free and unlimited on public repositories » ([choisir le runner](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [facturation](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Runner iOS : étiquette explicite `macos-26` (arm64) plutôt que `macos-latest`. Les *larger runners* sont facturés même en public : interdits.
- Si le dépôt devenait privé, les minutes macOS seraient facturées (0,062 $ la minute, environ 10 fois Linux).
- **Non vérifié** : signature iOS sans EAS (certificats et profils créés par le porteur dans son compte Apple). À vérifier au ticket de build.
