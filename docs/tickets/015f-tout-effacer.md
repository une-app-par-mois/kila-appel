# 015f — Tout effacer

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 015, 015b, 014c · Fichiers touchés : `src/app/tout-effacer.tsx` (nouveau), `src/hooks/useErase.ts`, `src/app/donnees.tsx`, `src/app/(tabs)/parametres.tsx`, libellés, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 015b.

## Contexte

Tout effacer après double confirmation, puis Bienvenue (EX-23, SEC-11).

## Ce qui change

- Écran « Tout effacer » (maquette) : le mot « EFFACER » à taper ; `eraseAll` sous le verrou commun ; puis vidage des copies du cache (`expoStorage('sauvegardes'|'restauration').clear()`, `expoPicker(Platform.OS).clearPicked()`) ; puis Bienvenue
- Lignes Tout effacer de Paramètres et de l'écran Sauvegarde

## Critères d'acceptation

- [ ] Tout effacer après double confirmation (bouton, puis mot), puis Bienvenue (EX-23)
- [ ] Copies du cache vidées juste après ; un échec du vidage est journalisé sans empêcher le retour à Bienvenue
- [ ] Bienvenue recrée la saison comme à une installation neuve ; conservation revenue à 3

## Questions prévues

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur :
  - copies du cache vidées juste après l'effacement ;
  - Bienvenue recrée la saison automatiquement, comme une installation neuve.
- Plan de zone sensible : à valider à la séance de lancement de son lot.
- Report de l'intégration du lot 014c-014d-015b (2026-11-27) :
  - `src/hooks/useErase.ts` existe (conservation et purge, ticket 015b) : Tout effacer s'y ajoute, sous la tâche `'erase'` de `fileLock` (déjà prise par la purge ; tâches : `'export'`, `'restore'`, `'cleanup'`, `'erase'`) ; boutons désactivés pendant un export, une restauration ou une purge, comme ceux du 015b ;
  - `ConfirmDialog` accepte un message en `ReactNode` et un état `busy` (015b) : à reprendre pour la première confirmation, retour bloqué pendant l'effacement ;
  - l'écran Sauvegarde (`src/app/donnees.tsx`) a maintenant la section Conservation et purge, et Paramètres la ligne Conservation : la ligne Tout effacer se place selon la maquette, après elles ;
  - le vidage des copies juste après l'effacement reprend les fonctions du nettoyage au démarrage du 014c (`expoStorage(…).clear()`, `expoPicker(Platform.OS).clearPicked()`, code `STARTUP_CLEANUP_FAILED` pour le démarrage seulement : un code propre au 015f) ;
  - après l'effacement, le retour à Bienvenue doit passer par la base déjà ouverte (pas par `resetDatabase()`, réservée à une base abîmée) ; l'invitation à sauvegarder (014d) repart de zéro, car `backup_invite_seen` et `last_backup_at` sont effacés avec les réglages.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
