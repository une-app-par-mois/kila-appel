# 014f — Restaurer depuis l'écran de récupération

Statut : à faire · Jalon : 1 · Zone sensible : oui · Trivial : non

Dépend de : 014c, 014e · Fichiers touchés : `src/hooks/restoreFlow.ts` (nouveau), `src/hooks/useRestore.ts`, `src/hooks/useRecovery.ts` (nouveau), `src/ui/Recovery.tsx`, résumé partagé avec `src/app/restauration.tsx`, libellés, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 014c.

## Contexte

Depuis l'écran « Base illisible », restaurer une sauvegarde alors que la base de l'appareil ne s'ouvre pas (EX-22, EX-20).

## Ce qui change

- Le cycle de `useRestore` (choix, vérification, confirmation) est partagé ; `useRestore` garde `draftGroupName` (seul importateur, contrôle EX-14)
- Variante abîmée : bouton « Restaurer une sauvegarde » ; choix et vérification sur une copie (le fichier abîmé n'est pas touché) ; confirmation « Les données abîmées seront effacées définitivement. », sans ligne d'appel en cours ; puis suppression du fichier abîmé, base neuve, `restoreBackup` en une transaction, sous le verrou commun

## Critères d'acceptation

- [ ] Refus ou Annuler : le fichier abîmé est intact
- [ ] Réussite : données identiques à la sauvegarde, puis accueil
- [ ] Échec de la recopie après la suppression : base neuve vide ouverte, message « La restauration n'a pas abouti », « Choisir un fichier… » et moyen de continuer avec une base vide ; dit dans la PR et dans SEC-11

## Questions prévues

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur : restauration « vérifier d'abord, puis remplacer » (option recommandée) ; reprend les états de l'écran Restauration (maquette annotée par 014c).
- Plan de zone sensible : à valider à la séance de lancement de son lot.
- Report de l'intégration du lot 014c-014d-015b (2026-11-27), depuis le 014c :
  - la variante abîmée de `src/ui/Recovery.tsx` a maintenant « Réessayer » (bouton principal) au-dessus de « Repartir de zéro » (secondaire) ; « Restaurer une sauvegarde » s'ajoute au-dessus de « Repartir de zéro » et devient le bouton principal (maquette), « Réessayer » passe alors en secondaire ;
  - le texte « Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro. » est gardé tel quel jusqu'au 014f (réponse 3 du porteur) : le 014f le rend vrai sur l'écran même ;
  - la base abîmée n'est pas ouverte (`useDatabase` en état `failed`, cause `damaged`) : la restauration doit d'abord supprimer le fichier (`resetDatabase()` / `deleteAppDatabase()`) et ouvrir une base neuve, puis `restoreBackup` ;
  - le vidage des dossiers de `useRestore` se fait déjà sous le verrou `'restore'`, au début de chaque restauration ; le nettoyage au démarrage prend `'cleanup'` : la pile n'est montée qu'après sa fin, l'écran de récupération aussi doit l'attendre avant d'ouvrir le sélecteur ;
  - `resetDatabase()` est sans effet hors d'une base abîmée (garde du 014c) : à garder pour le chemin de restauration.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG :
- Architecture :
