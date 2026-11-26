# 001 — Socle Expo SDK 58 et scripts de test

Statut : en cours · Jalon : 0 · Zone sensible : non · Trivial : non

## Contexte

Installer la pile validée (ADR-001) et rendre `scripts/test.sh` réel, pour que la CI et le push fonctionnent.

## À lire

- `docs/ARCHITECTURE.md` §2 et §3
- `docs/CONVENTIONS.md` §2, §5.4
- ADR-001

## Ce qui change

- Projet Expo SDK 58 TypeScript (versions revérifiées), Expo Router, `tsconfig` strict, alias `@/`
- Biome 2.6.x configuré (CONV-20, `noFloatingPromises` en erreur, `.only`/`.skip` interdits)
- Jest (jest-expo) avec seuils de couverture (CONV §5.3)
- `scripts/test.sh` : biome, tsc, contrastes, jest
- `ci.yml` : mise en place de Node 22 ; `dependabot.yml` : bloc npm
- Premier module du domaine : `src/domain/formats.ts` (RM-04)

## Critères d'acceptation

- [ ] `./scripts/test.sh` passe en local et échoue si un test échoue ou si la couverture baisse
- [ ] Le hook pre-push laisse passer un push de la branche
- [ ] `formats.ts` convertit `AAAA-MM-JJ` ↔ `JJ/MM/AAAA` et refuse une date invalide (RM-04)
- [ ] Aucune dépendance hors de `docs/ARCHITECTURE.md` §2

## Tests attendus

- Tests unitaires de `formats.ts` (dates valides, 29 février, saisies invalides)
- À la main : `npx expo start` affiche un écran vide sur le téléphone (development build au ticket 004)

## Hors périmètre

- Base de données (002), thème (003), builds (004)
