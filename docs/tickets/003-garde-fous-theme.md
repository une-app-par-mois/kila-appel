# 003 — Garde-fous automatiques, thème et polices

Statut : en cours · Jalon : 0 · Zone sensible : non · Trivial : non

## Contexte

Rendre vérifiables par la machine les règles CONV-03, CONV-16, CONV-17, SEC-01, SEC-03, et préparer le thème.

## À lire

- `docs/CONVENTIONS.md` §2
- `docs/SECURITE.md` SEC-01, SEC-03, SEC-12
- `design/CHARTE.md`, `design/jetons.json`

## Ce qui change

- Thème `src/config/theme.ts` dérivé de `design/jetons.json`
- `src/config/libelles.ts` (textes)
- Module de journal unique `src/data/log.ts` (codes et identifiants seulement)
- Polices IBM Plex (.ttf) et licence OFL dans `assets/fonts/`, chargées par expo-font
- Contrôles : `console.*` hors du module de journal, texte littéral dans le JSX hors libellés, couleur littérale hors thème, `fetch`/`XMLHttpRequest`/`WebSocket`, `getExpoPushTokenAsync`/`getDevicePushTokenAsync`

## Critères d'acceptation

- [x] Chaque contrôle fait échouer `scripts/test.sh` sur un fichier d'exemple fautif (vérifié puis retiré)
- [x] Le thème expose exactement les valeurs de `design/jetons.json`
- [x] Le module de journal refuse un objet contenant un champ `first_name`, `last_name`, `phone` ou `birth_date`

## Tests attendus

- Tests des contrôles (fichiers fautifs fictifs en fixtures)
- Test du thème contre `jetons.json`
- Test du module de journal

## Hors périmètre

- Composants d'interface (jalon 1)
