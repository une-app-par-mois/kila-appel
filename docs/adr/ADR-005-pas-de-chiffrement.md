# ADR-005 — Pas de chiffrement applicatif

Statut : proposé · 2026-11-26

## Contexte

Un moyen de cryptologie assurant la confidentialité impose une déclaration à l'ANSSI et une déclaration d'export côté Apple ; l'ancienne version a fait l'aller-retour en 3 jours.

## Décision

Aucun chiffrement dans l'appli (ABS-06). Protection par le système (iOS Data Protection, Android File-Based Encryption). Sauvegarde en clair, avertissement non réductible à l'export. `ITSAppUsesNonExemptEncryption` = false.

## Options écartées

SQLCipher ; sauvegarde chiffrée par phrase secrète.

## Conséquences

Décision du cadrage reconduite le 2026-11-26.
