# 015f — Tout effacer

Statut : développé, à intégrer (branche `ticket/015f-tout-effacer`) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

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
- Séance de lancement du lot 014f-015f-014g (2026-11-27), réponses du porteur :
  - texte de l'avertissement : celui de la maquette, tel quel ;
  - mot « EFFACER » : majuscules et espaces autour ignorés ; clavier en majuscules, sans correction automatique ;
  - plan validé : verrou `'erase'`, `eraseAll` sur la base ouverte (jamais la suppression du fichier), puis, seulement si l'effacement réussit, vidage des copies sous le même verrou ; première confirmation = le bouton « Tout effacer… » qui ouvre l'écran, seconde = le mot puis le bouton rouge, sans boîte en plus ; boutons désactivés et retour bloqué pendant l'effacement ; échec : « L'effacement n'a pas abouti. Rien n'a été effacé. » ; à noter pour les relances (ADR-007) : Tout effacer devra les annuler.
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
| Place du hook | `useErase.ts` ; fichier à part | `useEraseAll(deps)` dans `src/hooks/useErase.ts` (157 lignes) ; `deps.clearCopies` construit par l'écran | Plan validé ; le fichier reste sous 300 lignes | à relire |
| `ConfirmDialog` pour la première confirmation (report du 014c-014d-015b) | `ConfirmDialog` ; bouton qui ouvre l'écran | Pas de `ConfirmDialog` : la première confirmation est le bouton « Tout effacer… », la seconde le mot puis le bouton rouge ; le blocage du retour reprend `usePreventRemove`, comme l'écran Restauration | Plan validé à la séance du lot 014f-015f-014g (« sans boîte en plus »), plus récent que le report | à relire |
| Clavier en majuscules sans correction | `TextInput` direct dans l'écran ; option de `TextField` | Option `capitals` de `src/ui/TextField.tsx` (fichier hors liste) : `autoCapitalize="characters"`, `autoCorrect={false}`, `spellCheck={false}`, `autoComplete="off"` | Même champ (étiquette, style) que le reste de l'appli ; ajout minimal | à relire |
| Contenu du champ vide | Vide ; « EFFACER » en gris | « EFFACER » en indication grise, en Plex Mono | La maquette montre « EFFACER » en champ vide (`champ mono vide`) | à relire |
| Entrée au clavier | Efface si le mot est bon ; ne fait rien | Ne fait rien (ferme le clavier) | Réponse du porteur : Entrée n'efface rien | à relire |
| Après un échec | Écran fermé ; écran gardé | Message « L'effacement n'a pas abouti. Rien n'a été effacé. » sous les boutons, mot gardé, bouton rouge de nouveau actif pour réessayer | Rien n'a été effacé : rien n'empêche de réessayer | à relire |
| Ligne de Paramètres sous le verrou | Désactivée ; active | Active, sans sous-titre (maquette) : elle ouvre l'écran, dont le bouton rouge est désactivé sous le verrou | Ouvrir l'écran n'efface rien ; « Tout effacer… » de Sauvegarde est désactivé, comme les autres boutons de l'écran | à relire |
| Double appui sur le bouton rouge | — | Un seul effacement par appui, même avant que l'écran ne se redessine (garde dans l'écran, en plus du verrou) | Sans elle, le second appui, refusé par le verrou, afficherait un échec pendant l'effacement | à relire |
| Vidage des copies | — | Les trois dossiers vidés ensemble (`Promise.allSettled`), une erreur immédiate comptée comme un échec ; un seul échec suffit pour `ERASE_COPIES_FAILED`, les autres dossiers sont vidés quand même | Même façon que le nettoyage au démarrage (014c) | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Données : Tout effacer, depuis l'écran Sauvegarde ou Paramètres, après double confirmation (le bouton, puis le mot EFFACER) ; les copies du cache sont vidées juste après, puis Bienvenue recrée la saison comme à une installation neuve (EX-23, SEC-10, SEC-11).
- Architecture : `src/hooks/useErase.ts` reçoit `useEraseAll(deps)` : verrou commun `'erase'`, `eraseAll` sur la base ouverte (jamais `resetDatabase`), puis, seulement si l'effacement réussit, `deps.clearCopies` sous le même verrou ; codes `ERASE_ALL_FAILED` et `ERASE_COPIES_FAILED` ; écran `src/app/tout-effacer.tsx` (route `/tout-effacer`), qui construit `clearCopies` avec `expoStorage('sauvegardes'|'restauration').clear()` et `expoPicker(Platform.OS).clearPicked()` ; option `capitals` de `TextField` ; textes dans `src/config/libelles/effacement.ts` (`eraseAll`).
- SEC-10 et SEC-11 (`docs/SECURITE.md`) : Tout effacer vide aussi les copies du cache (`sauvegardes/`, `restauration/`, `DocumentPicker/`), juste après l'effacement et sous le verrou commun ; vérifié par `src/hooks/useEraseAll.test.tsx` et `src/appTests/eraseAll.test.tsx`.
- Pour `docs/IDEES.md` : Tout effacer devra annuler les relances programmées quand elles existeront (ADR-007).
- Maquette : notes « Réponses du porteur du 2026-11-27 (ticket 015f) » et « Décisions automatiques, à relire (ticket 015f) » ajoutées à l'écran Tout effacer dans `scripts/maquettes.mjs` ; `design/maquettes/index.html` à régénérer à l'intégration.
- Non couvert sur iOS : le dossier `tmp/<identifiant>-Inbox/` est vidé par `expoPicker('ios').clearPicked()` comme au démarrage (014c), non vérifié sur un appareil.
