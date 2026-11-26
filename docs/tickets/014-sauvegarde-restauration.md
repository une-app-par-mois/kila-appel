# 014 — Sauvegarde, restauration et base illisible

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

L'unique chemin de récupération des données (EX-19 à EX-22) ; le bogue le plus grave de l'ancienne version était ici.

## À lire

- `docs/PRD.md` EX-19 à EX-22
- `docs/ARCHITECTURE.md` §4.3
- `docs/SECURITE.md` SEC-09, SEC-10
- Maquettes : Sauvegarde et données, Restauration, Invitation à sauvegarder, Base illisible

## Ce qui change

- `src/data/backup.ts` : `VACUUM INTO`, vérification sur copie, remplacement ; la vérification contrôle aussi `slots.schedule_from` (une sauvegarde contourne le déclencheur, ticket 005)
- Écrans ; dépendances expo-file-system, expo-sharing, expo-document-picker (validées)

## Critères d'acceptation

- [ ] Export d'un fichier `.db` avec l'avertissement complet avant (EX-19, SEC-09)
- [ ] Restauration : vérification avant tout remplacement ; fichier invalide = données intactes et message clair (EX-20, SEC-10)
- [ ] Invitation après le premier appel ; bandeau après 30 jours sans sauvegarde (EX-21)
- [ ] Base illisible au démarrage : écran de récupération, jamais de plantage (EX-22)

## Tests attendus

- Tests de données : sauvegarde puis restauration identique ; fichier tronqué, autre base, version future, fichier texte
- À la main : cycle complet sur le téléphone

## Hors périmètre

- Tout effacer et purge (015)

## Notes du ticket 007d (2026-11-26)

- Après une restauration par copie de fichier, lancer un `VACUUM` : le fichier restauré apporte ses propres pages libérées, que `secure_delete` ne nettoie pas.
- L'écran de récupération (EX-22) ne traite pas `SECURE_DELETE_OFF` ni `FOREIGN_KEYS_OFF` comme une base abîmée à remplacer : ce sont des problèmes de configuration, le fichier est sain.
