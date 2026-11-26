# 006e — Licences embarquées

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

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

## Hors périmètre

- Pages Confidentialité et Conditions d'utilisation
