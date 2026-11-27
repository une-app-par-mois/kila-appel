# 009b — Créneaux récurrents : écrans

Statut : fait (PR #63 vers `main`) · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 009.

## À lire

- Ticket 009 (dépôt et hooks)
- Maquettes : Créneaux, Créneau récurrent, Modification d'un créneau, États vides

## Ce qui change

- Liste « Créneaux » : « Mercredi 14:00 – 15:30 », puis groupe · lieu ; un seul bouton « Nouveau créneau » au lot 1 (décision du porteur du 2026-11-27)
- Formulaire : jour (7 boutons L M Me J V S D), début HH:MM, durée saisie « 1 h 30 », « 1h30 » ou « 90 » (minutes) et affichée « 1 h 30 », groupe (un seul, groupes non archivés de la saison active), lieu et nom facultatifs ; sans saison active, pas de création, avec un message
- Modification : mêmes champs, **lieu et nom compris** (décision du porteur du 2026-11-27, maquette mise à jour)
- « Supprimer le créneau » : confirmation courte « Les séances déjà enregistrées sont conservées. » (décision du porteur du 2026-11-27, maquette mise à jour)
- Ligne « Créneaux · N créneaux » dans Paramètres
- La confirmation de suppression dit aussi « L'appel interrompu sur ce créneau sera effacé. » quand il y en a un (décision du porteur du 2026-11-27)

## Critères d'acceptation

- [x] Créer, modifier, supprimer un créneau depuis les écrans ; erreurs sous les champs
- [x] Les séances enregistrées restent dans l'historique après suppression du créneau

## Tests attendus

- Tests d'écran sur une vraie base `node:sqlite`
