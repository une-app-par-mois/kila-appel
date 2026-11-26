# 006e — Licences embarquées

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

Ajouté le 2026-11-26 (décision du porteur) : EX-42 n'était prévu par aucun ticket.

## À lire

- `docs/PRD.md` EX-42 ; `docs/CONFORMITE.md` §7 ; maquette Paramètres (À propos)

## Ce qui change

- Script qui génère au build la liste des licences des dépendances réellement embarquées (et des polices)
- Écran Licences, ligne « À propos › Licences » dans Paramètres

## Critères d'acceptation

- [ ] Liste générée depuis les dépendances de production, jamais écrite à la main
- [ ] Une licence refusée (CONFORMITE §7) fait échouer le script
- [ ] Écran Licences lisible hors ligne

## Tests attendus

- Test du script (licence refusée, dépendance ajoutée) ; test d'écran

## Décisions du porteur (2026-11-26)

- « Réellement embarquées » = paquets présents dans le bundle JavaScript exporté (carte des sources), plus les polices.
- Licences permissives acceptées en plus de CONFORMITE §7 : 0BSD, BlueOak-1.0.0, CC0-1.0, Unlicense ; une double licence (« A OR B ») est acceptée si l'une l'est.
- Bibliothèques natives (Gradle, CocoaPods) : inventaire à part, action de CONFORMITE §8 avant le lancement.
- `builds.yml` vérifie que `src/config/licences.json` est à jour (modification autorisée par le porteur).

## Hors périmètre

- Pages Confidentialité et Conditions d'utilisation
