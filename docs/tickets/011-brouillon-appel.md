# 011 — Brouillon d'appel

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

« Pire échec possible » de l'ancienne version : ne jamais perdre un appel commencé (EX-14).

## À lire

- `docs/PRD.md` EX-14
- ADR-006
- Maquettes : Accueil avec un appel interrompu, Abandon d'un brouillon d'appel

## Ce qui change

- Dépôt du brouillon (`roll_call_drafts`, `roll_call_draft_groups`, `roll_call_draft_statuses`)
- Écriture à chaque appui, reprise, abandon

## Critères d'acceptation

- [ ] Chaque changement est écrit aussitôt dans le brouillon (`roll_call_draft_statuses`)
- [ ] Après fermeture forcée, l'appel est retrouvé tel quel (accueil « Appel en cours »)
- [ ] Le brouillon disparaît à l'enregistrement ou à l'abandon confirmé
- [ ] Aucune requête de statistiques ou d'historique ne lit le brouillon

## Tests attendus

- Tests de données ; test d'écran de la reprise
- À la main : fermeture forcée en plein appel sur le téléphone

## Hors périmètre

- Rien de plus que les critères ci-dessus.

## Note de la revue de sécurité du ticket 006d (2026-11-26)

- Supprimer un groupe le retire aussi d'un brouillon d'appel en cours (`roll_call_draft_groups` en cascade), sans que la confirmation le dise. Aucune présence perdue (statuts rattachés aux membres). Quand le brouillon existe à l'écran, ajouter « l'appel en cours » au message de suppression d'un groupe.
