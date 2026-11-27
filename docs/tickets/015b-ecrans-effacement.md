# 015b — Conservation et purge des anciennes saisons

Statut : relecture du porteur (code poussé sur `ticket/015b-conservation-purge`) · Jalon : 1 · Zone sensible : oui (plan validé par le porteur le 2026-11-27) · Trivial : non

Dépend de : 015, 014, 014b, 014e · Fichiers touchés : `src/data/purge.ts` et son test, `src/hooks/useErase.ts` (conservation et purge), `src/hooks/fileLock.ts` (tâche `'erase'`), `src/app/donnees.tsx`, `src/app/(tabs)/parametres.tsx`, `src/config/libelles/effacement.ts` (et `index.ts`), `scripts/maquettes.mjs`, tests

Découpé le 2026-11-27 (décision du porteur) depuis le ticket 015, puis en 015b (conservation et purge) et 015f (Tout effacer) le même jour.

## Contexte

La conservation et la purge des anciennes saisons (EX-24). Tout effacer est au 015f.

## À lire

- Maquettes : Sauvegarde et données, Tout effacer, Purge des anciennes saisons

## Ce qui change

- `purgeCandidates` ne compte parmi les N saisons gardées que les saisons **commencées** (date de début ≤ aujourd'hui) ; une saison à venir est toujours gardée en plus (décision du porteur du 2026-11-27) ; `purge` reçoit la même date
- Réglage de conservation (dans `settings`, par `settingsRepo`), sans purge automatique ; candidates listées ; confirmation chiffrée de la purge ; purge sous le verrou commun ; ligne Conservation de Paramètres

## Critères d'acceptation

- [ ] Conservation de 1 à 3 saisons, 3 par défaut (EX-24)
- [ ] Confirmation de la purge qui liste ce qui part, membres compris (EX-24)
- [ ] Une saison à venir n'est jamais purgée et ne compte pas parmi les N ; une saison commencée aujourd'hui compte ; purge refusée (rien effacé) si la date change la liste

## Tests attendus

- Tests d'écrans

## Hors périmètre

- Tout effacer (015f)

## Questions prévues

Séance du 2026-11-27 : conservation de 1 à 3 saisons. Clôture du 2026-11-27 : seules les saisons commencées comptent parmi les gardées.

- Séance de lancement du lot 014c-014d-015b (2026-11-27), réponses du porteur :
  - découpage en 015b et 015f ;
  - confirmation de la purge chiffrée par `purgeImpact` : « Seront effacés définitivement : la saison 2023-2024, ses 3 groupes, 2 créneaux, 31 séances et 412 présences. » puis « 12 membres qui ne figurent plus dans aucune saison conservée seront aussi effacés. », plus « L'appel en cours (<groupe>) sera aussi effacé. » s'il appartient à une saison purgée ; maquette annotée ;
  - plan validé.
- Question du développement, réponse du porteur du 2026-11-27 : nom du groupe de l'appel en cours dans la confirmation de purge (EX-14 : `draftGroupName.ts` n'est importable que par `useRestore.ts`). Options : garder le texte sans nom ; autoriser `useErase.ts` à importer `draftGroupName` ; ajouter le nom à `purgeImpact`. **Réponse : texte sans nom, « L'appel en cours sera aussi effacé. »** ; le contrôle EX-14 n'est pas élargi.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| `purge` : quand la liste a-t-elle « changé » ? | Saisons visées incluses dans les candidates ; exactement les candidates | Exactement les candidates au jour donné, sinon `NOT_PURGEABLE`, rien d'effacé | Le jour qui avance ne fait qu'ajouter des candidates : seule l'égalité refuse une purge confirmée sur une liste qui a changé (plan validé : « si la date change la liste ») ; plus strict qu'avant | à relire |
| Jour invalide passé à `purgeCandidates` ou `purge` | `InputError('DATE_INVALID')` ; nouveau code | `validateDate` (`DATE_INVALID`), comme `settingsRepo` | Aucun nouveau code ; la valeur vient de l'horloge | à relire |
| Jour de la purge | Jour de l'ouverture de la confirmation ; jour de l'appui sur « Purger » | Jour de l'appui (`useLocalNow().date`) ; la durée est celle qui a produit les candidates affichées | Une liste changée entre-temps est refusée par la revérification | à relire |
| Confirmation : comptes et accords | Tous les comptes ; comptes nuls omis | Groupes, créneaux, séances, présences, comptes nuls omis (inscriptions non citées, comme le texte du porteur) ; « ses » pour une saison, « leurs » pour plusieurs, même avec un compte de 1 (« ses 1 groupe ») ; aucun contenu : « la saison 2023-2024. » | Texte du porteur gardé tel quel ; « ses 1 groupe » est peu naturel, une autre tournure s'écarterait du texte validé | en attente du porteur |
| Accord « Garder les 1 dernières saisons » (texte de la maquette) | Garder la phrase ; « Garder la dernière saison » pour 1 | Phrase de la maquette gardée pour toutes les valeurs (lue « Garder les 1 dernières saisons ») | Texte de la maquette ; une autre tournure s'en écarterait | en attente du porteur |
| Plusieurs saisons | — | Titre « Purger 2 saisons ? », « les saisons 2022-2023 et 2023-2024, leurs … » ; bouton « Purger 2 saisons… » ; une seule : « Purger 2023-2024… » (maquette) | Suite du texte du porteur | à relire |
| Aucun membre effacé | Ligne omise ; « Aucun membre ne sera effacé. » | « Aucun membre ne sera effacé. » ; un seul : « 1 membre qui ne figure plus … sera aussi effacé. » | La confirmation dit toujours ce qu'il advient des membres | à relire |
| « définitivement » en gras (maquette) | Texte simple ; gras | Gras : `ConfirmDialog` accepte un message en textes imbriqués (`ReactNode`) | La maquette fait foi ; changement minimal d'un composant (fichier hors liste) | à relire |
| Choix de la durée | `Select` (étiquette au-dessus, champ pleine largeur) ; champ dans la phrase avec `ChoiceList` | Champ « 3 ▾ » dans la phrase, liste plein écran `ChoiceList` (même composant que `Select`), titre « Saisons gardées », choix « 1 saison », « 2 saisons », « 3 saisons » ; lu « Garder les 3 dernières saisons » | Le `Select` ne se place pas dans une phrase ; la maquette montre la phrase | à relire |
| Échecs | — | Lecture de l'impact ou purge en échec : « La purge n'a pas abouti. Rien n'a été effacé. » ; réglage non enregistré : « La durée de conservation n'a pas pu être enregistrée. Réessayez. » ; journal `PURGE_FAILED`, `RETENTION_SAVE_FAILED`, `RETENTION_LOAD_FAILED`, sans détail (ABS-04) | Rien n'est effacé dans ces cas | à relire |
| Verrou | — | La purge prend le verrou commun (`'erase'`) ; le bouton de purge est désactivé pendant un export ou une restauration, et l'export et la restauration pendant la purge ; la liste du choix de durée reste ouverte (la purge porte sa propre durée) | Plan validé | à relire |
| Saison active ancienne (revue de code) | Elle prend une des N places ; elle est gardée en plus | Gardée en plus des N plus récentes commencées : l'appli garde alors N+1 saisons commencées (comportement d'avant ce ticket), test `purgeMembers.test.ts` | Direction prudente : rien de plus n'est effacé | à relire |
| Confirmation pendant la purge (revue de code) | — | `ConfirmDialog` reçoit `busy` (état `purging` de `useErase`) : « Garder » et « Purger » désactivés, retour caché, retour du système ignoré, comme l'écran Restauration | La confirmation ne se ferme pas pendant un effacement en cours | changée après revue |
| Relecture à minuit (revue de code) | Vider la valeur ; garder la précédente | `useLoaded(…, keepPrevious)` dans `useErase` : la section et une confirmation ouverte restent affichées pendant la relecture | Pas de disparition de la confirmation | changée après revue |
| Lecture de l'impact en échec (revue de code) | — | Journal `PURGE_IMPACT_FAILED` (sans détail), message « La purge n'a pas abouti. Rien n'a été effacé. » | ABS-04 | changée après revue |
| Choix de la durée sous le verrou (revue de code) | — | Champ « 3 ▾ » désactivé pendant un export, une restauration ou une purge | Cohérence avec les autres boutons | changée après revue |
| Notes de la maquette (contradicteur) | — | Chaque note découpée : « Réponse du porteur du 2026-11-27 » (texte chiffré, ligne des membres, conservation) et « Décisions automatiques, à relire (ticket 015b) » ; la ligne de l'appel en cours, d'abord notée en attente, est depuis une réponse du porteur (texte sans nom) | Les décisions automatiques étaient présentées comme des décisions du porteur | changée après contradiction |
| Fichiers au-delà de la liste | — | `src/ui/ConfirmDialog.tsx` (type du message, `busy`), `src/__fixtures__/purgeSeed.ts` (jeu fictif sorti de `purge.test.ts`, gardé sous 300 lignes), tests `purgeToday.test.ts`, `purgeMembers.test.ts`, `useErase.test.tsx`, `appTests/purge.test.tsx`, `appTests/purgeEdges.test.tsx`, `config/purgeTexts.test.ts`, `design/maquettes/index.html` régénéré | Ajouts mécaniques et tests | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Données : conservation de 1 à 3 saisons (3 par défaut) et purge des anciennes saisons depuis l'écran Sauvegarde, confirmation chiffrée membres compris ; seules les saisons commencées comptent parmi les gardées ; ligne Conservation dans Paramètres (EX-24, SEC-11).
- Architecture : `src/hooks/useErase.ts` (`useErase` : conservation, candidates au jour de `useLocalNow`, `purgeImpact`, purge sous le verrou commun ; `useRetention` pour Paramètres) ; `fileLock` reçoit la tâche `'erase'` ; `purgeCandidates(db, retention, today)` ne range que les saisons commencées (`startDate <= today`) et `purge(db, ids, retention, today)` refuse (`NOT_PURGEABLE`) si les saisons visées ne sont plus exactement les candidates ; textes dans `src/config/libelles/effacement.ts`.
- Pour `docs/IDEES.md` (revue de sécurité) : un membre effacé par la purge peut avoir un statut dans l'appel en cours d'une saison gardée ; l'effacement est correct (la cascade retire ce statut), mais la confirmation ne l'annonce pas. Idée : le dire dans la confirmation.
