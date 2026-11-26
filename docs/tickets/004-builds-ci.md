# 004 — Builds sur la CI et audit des permissions

Statut : en cours · Jalon : 0 · Zone sensible : oui · Trivial : non

## Contexte

Lever le risque d'ADR-009 tôt : APK de développement installable, build iOS de test sans Mac, permissions contrôlées sur le binaire.

## À lire

- ADR-009
- `docs/ARCHITECTURE.md` §6, §9
- `docs/SECURITE.md` SEC-02
- `docs/CONFORMITE.md` §4

## Ce qui change

- Configuration Expo : nom de paquet `com.jitavision.kila` (Android et iOS), portrait, `blockedPermissions`, `allowBackup` false, `ITSAppUsesNonExemptEncryption` false
- Workflow : APK de développement (runner Linux) en artefact sur la PR du jalon
- Workflow : build iOS simulateur non signé (runner `macos-26`)
- Script d'audit `aapt2 dump permissions` comparé à `config/permissions-attendues.txt`

## Critères d'acceptation

- [x] L'APK de développement s'installe et s'ouvre sur le téléphone du porteur
- [ ] Le build iOS simulateur réussit sur la CI (vérifié à la PR du jalon 0 vers `main` : les workflows ne tournent que là)
- [x] L'audit échoue si une permission non attendue apparaît (vérifié en en ajoutant une, puis retirée)
- [x] `INTERNET` absente de la liste attendue du build de production
- [x] La migration 1 s'applique sur le téléphone (base ouverte, `user_version` = 1) : fin de la vérification d'ADR-008
- [x] Aucun filtre d’intention de lien profond (`scheme`) dans le manifeste du binaire de production (scheme retiré au ticket 001, ABS-07)

## Tests attendus

- Exécution des workflows sur la PR du jalon 0
- À la main : installation sur le téléphone

## Hors périmètre

- Signature et publication (jalon 6), TestFlight (jalon 7)
