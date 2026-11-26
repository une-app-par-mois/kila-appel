# 004 — Builds sur la CI et audit des permissions

Statut : à faire · Jalon : 0 · Zone sensible : oui · Trivial : non

## Contexte

Lever le risque d'ADR-009 tôt : APK de développement installable, build iOS de test sans Mac, permissions contrôlées sur le binaire.

## À lire

- ADR-009
- `docs/ARCHITECTURE.md` §6, §9
- `docs/SECURITE.md` SEC-02
- `docs/CONFORMITE.md` §4

## Ce qui change

- Configuration Expo : nom de paquet choisi par le porteur, portrait, `blockedPermissions`, `allowBackup` false, `ITSAppUsesNonExemptEncryption` false
- Workflow : APK de développement (runner Linux) en artefact sur la PR du jalon
- Workflow : build iOS simulateur non signé (runner `macos-26`)
- Script d'audit `aapt2 dump permissions` comparé à `config/permissions-attendues.txt`

## Critères d'acceptation

- [ ] L'APK de développement s'installe et s'ouvre sur le téléphone du porteur
- [ ] Le build iOS simulateur réussit sur la CI
- [ ] L'audit échoue si une permission non attendue apparaît (vérifié en en ajoutant une, puis retirée)
- [ ] `INTERNET` absente de la liste attendue du build de production

## Tests attendus

- Exécution des workflows sur la PR du jalon 0
- À la main : installation sur le téléphone

## Hors périmètre

- Signature et publication (jalon 6), TestFlight (jalon 7)
