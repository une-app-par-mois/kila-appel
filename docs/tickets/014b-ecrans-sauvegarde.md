# 014b — Écrans Sauvegarde et Restauration

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014, 013 ·  · Fichiers touchés : `src/app/donnees.tsx`, restauration, `(tabs)/parametres.tsx`, libellés, `package.json`, `src/staticChecks.test.ts`

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Les écrans de la sauvegarde et de la restauration (EX-19, EX-20), sur le code de données du 014.

## À lire

- Maquettes : Sauvegarde et données, Restauration
- `docs/SECURITE.md` SEC-09, SEC-10

## Ce qui change

- Dépendances expo-file-system, expo-sharing, expo-document-picker (installées par ce ticket)
- Écran « Sauvegarde et données » (sauvegarde, restaurer) ; restauration avec résumé et confirmation ; ligne de Paramètres

## Critères d'acceptation

- [ ] Export d'un fichier `.db` avec l'avertissement complet avant (EX-19, SEC-09)
- [ ] Restauration : fichier choisi vérifié, résumé, confirmation ; fichier invalide = message clair, données intactes (EX-20)
- [ ] Copies temporaires supprimées même en cas d'échec
- [ ] Fonctions réseau d'expo-file-system refusées par le contrôle statique ; APK sans INTERNET

## Tests attendus

- Tests d'écrans (avertissement complet, fichier invalide, résumé) ; audit de l'APK ; à la main : cycle complet sur le téléphone

## Hors périmètre

- Base illisible (014c), rappels (014d), Conservation et Tout effacer (015b)

## Questions prévues

Séance du 2026-11-27 : expo-file-system accepté, avec ses fonctions réseau verrouillées (ABS-01, contrôle statique et audit de l'APK) ; un seul bouton d'export, par le partage du système, la date comptée quand le partage se termine sans erreur.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
