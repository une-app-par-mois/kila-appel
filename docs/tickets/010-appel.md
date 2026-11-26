# 010 — Écran d'appel et enregistrement

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

## Contexte

Le cœur de l'appli : faire l'appel en moins de 30 s (NF-01).

## À lire

- `docs/PRD.md` EX-09 à EX-13, EX-15, EX-39
- Maquettes : Appel, Appel sans créneau, Ajout d'un membre pendant l'appel
- `design/CHARTE.md` §7 (pastille, compteur)

## Ce qui change

- Écran d'appel, pastille de statut, compteur
- Dépôts `sessions`, `session_groups`, `attendances`
- Appel sans créneau

## Critères d'acceptation

- [ ] Liste des membres inscrits à la date, triés, tous à Présent (EX-09, EX-10)
- [ ] Cycle Présent → Absent → Retard → Excusé ; libellé et icône toujours visibles (EX-10)
- [ ] Recherche au-delà de 20 membres (EX-11) ; ajout d'un membre sans quitter l'appel (EX-12)
- [ ] Commentaire de séance (EX-13) ; enregistrement et confirmation (EX-15)
- [ ] Appel sans créneau (EX-39)

## Tests attendus

- Tests d'écran : cycle, compteur, recherche
- Tests de données : séance et présences enregistrées
- À la main : chronométrage de 20 membres sur le téléphone

## Hors périmètre

- Brouillon (011)
