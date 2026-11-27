# 011 — Brouillon d'appel

Statut : en cours · Jalon : 1 · Zone sensible : oui · Trivial : non

## Contexte

« Pire échec possible » de l'ancienne version : ne jamais perdre un appel commencé (EX-14).

## À lire

- `docs/PRD.md` EX-14
- ADR-006
- Maquettes : Accueil avec un appel interrompu, Abandon d'un brouillon d'appel

## Ce qui change

- Dépôt du brouillon (`roll_call_drafts`, `roll_call_draft_groups`, `roll_call_draft_statuses`)
- Écriture à chaque appui, reprise, abandon

## Décisions du porteur (2026-11-27)

- Découpé : 011 (brouillon) et 011b (messages de suppression d'un groupe et d'un membre qui nomment l'appel en cours)
- Migration 2 : `roll_call_drafts.started_at` (HH:MM, aucune donnée personnelle) pour « commencé à » et l'heure d'un appel sans créneau repris
- Un brouillon d'un autre appel existe : l'écran d'appel bloque et propose « Reprendre l'appel »
- Le brouillon naît au premier changement (statut ou commentaire), pas à l'ouverture
- Accueil : carte « Appel en cours » (Abandonner confirmé, Reprendre l'appel) ; « Nouvel appel » ouvre le brouillon ; ligne « Brouillon enregistré à chaque appui » sur l'appel
- Contrôle automatique : seuls les fichiers autorisés nomment les tables du brouillon

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

## Note de la revue de sécurité du ticket 006d (2026-11-26) — reprise au ticket 011b

- Supprimer un groupe le retire aussi d'un brouillon d'appel en cours (`roll_call_draft_groups` en cascade), sans que la confirmation le dise. Aucune présence perdue (statuts rattachés aux membres). Quand le brouillon existe à l'écran, ajouter « l'appel en cours » au message de suppression d'un groupe.
- Idem pour un membre supprimé (ticket 007, revue de sécurité) : ses statuts du brouillon partent en cascade (`roll_call_draft_statuses`) ; l'ajouter au message de suppression d'un membre quand le brouillon existe à l'écran.
- L'appel ne compte que les inscriptions en cours à la date de la séance : `current()` de `src/data/enrollmentsRepo.ts` (début inclus, fin exclue).
