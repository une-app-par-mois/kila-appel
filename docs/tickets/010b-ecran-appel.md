# 010b — Écran d'appel

Statut : fusionné dans le groupe · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 010.

## À lire

- `docs/PRD.md` EX-09 à EX-13, EX-15 ; `design/CHARTE.md` §7 (pastille, compteur)
- Maquette : Appel

## Ce qui change

- Écran d'appel : en-tête (groupe, date, heure, lieu), compteur, pastilles Présent → Absent → Retard → Excusé (libellé et icône toujours visibles), recherche au-delà de 20 membres, commentaire de séance, « Enregistrer l'appel »
- Après l'enregistrement : « Appel enregistré », puis retour à l'accueil provisoire (décision du porteur du 2026-11-27 ; l'Historique arrive au 013)
- Séance déjà enregistrée : « L'appel de cette séance est déjà enregistré. », pas d'enregistrement (décision du porteur du 2026-11-27 ; correction au 013)
- Entrée « Nouvel appel » en haut de l'accueil provisoire, vers la séance proposée (EX-09)

- Plan validé le 2026-11-27 : sans chronomètre (démo de la maquette) ; la ligne « Brouillon enregistré à chaque appui » arrive au 011 ; quitter sans enregistrer perd l'appel jusqu'au 011 ; sans séance proposée, « Nouvel appel » est grisé avec la raison

- Décision du porteur du 2026-11-27 : la séance proposée n'est jamais d'un jour à venir (EX-09)
- Revue (décisions du porteur du 2026-11-27) : séance proposée déjà enregistrée → « … · appel enregistré », sans action ; sans séance : « Aucune séance à proposer. »

## Critères d'acceptation

- [x] Liste des membres inscrits à la date, triés, tous à Présent (EX-09, EX-10)
- [x] Cycle Présent → Absent → Retard → Excusé ; libellé et icône toujours visibles (EX-10)
- [x] Recherche au-delà de 20 membres (EX-11) ; commentaire de séance (EX-13) ; enregistrement et confirmation (EX-15)

## Tests attendus

- Tests d'écran : cycle, compteur, recherche, enregistrement
- À la main : chronométrage de 20 membres sur le téléphone (NF-01)
