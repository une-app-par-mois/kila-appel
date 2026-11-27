# 010c — Appel sans créneau et ajout d'un membre pendant l'appel

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 010.

## À lire

- `docs/PRD.md` EX-12, EX-39
- Maquettes : Appel sans créneau, Ajout d'un membre pendant l'appel

## Ce qui change

- « Nouvel appel » hors de tout créneau proche : choix du groupe et de la date ; la séance n'a pas de créneau et prend l'heure du début de l'appel (décision du porteur du 2026-11-27)
- « + Ajouter un membre » pendant l'appel : l'écran Nouveau membre, avec le texte de la maquette (« Il sera inscrit à … », « Ajouter et revenir à l'appel »), puis retour à l'appel où il apparaît à Présent

- Plan validé le 2026-11-27 (décisions du porteur) :
  - groupes listés par leur nom, sans le nombre de membres de la maquette ;
  - « Nouvel appel » ouvre l'appel sans créneau quand aucune séance n'est à faire (aucune proposée, ou la proposée déjà enregistrée) ;
  - date d'un appel sans créneau jamais future (`DATE_IN_FUTURE`), dans la saison active ;
  - membre ajouté pendant l'appel inscrit à la date de la séance (« à partir d'aujourd'hui » ou « à partir du JJ/MM/AAAA »)
- Revue (décision du porteur du 2026-11-27) : un appel du groupe déjà enregistré ce jour-là → confirmation « En faire un autre ? », sans refus

## Critères d'acceptation

- [x] Appel sans créneau (EX-39)
- [x] Ajout d'un membre sans quitter l'appel (EX-12)

## Tests attendus

- Tests d'écran
