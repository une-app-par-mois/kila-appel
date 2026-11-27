# 014d — Invitation et bandeau de sauvegarde

Statut : à faire · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : 014, 014b, 013 · Fichiers touchés : `src/app/invitation-sauvegarde.tsx` (nouveau), `src/hooks/useBackupReminder.ts` (nouveau), `src/hooks/useSavedReturn.ts`, `src/app/(tabs)/index.tsx`, `src/data/sessionsRepo.ts` (`firstRecordedDate`), `src/config/libelles/accueil.ts`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014.

## Contexte

Inviter à sauvegarder après le premier appel, et rappeler après 30 jours sans sauvegarde (EX-21).

## À lire

- Maquettes : Invitation à sauvegarder, Accueil

## Ce qui change

- Invitation unique après le premier appel enregistré ; bandeau sur l'accueil

## Critères d'acceptation

- [ ] Invitation après le premier appel, une seule fois, s'il n'y a aucune sauvegarde (EX-21)
- [ ] Bandeau après 30 jours sans sauvegarde, jamais pendant Bienvenue (EX-21)

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Rien de plus que les critères

## Questions prévues

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur : sans aucune sauvegarde, les 30 jours du bandeau comptent depuis la plus ancienne séance enregistrée (nouvelle requête `firstRecordedDate`) ; texte de la maquette (« Pas de sauvegarde depuis N jours ») ; aucun réglage nouveau.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
