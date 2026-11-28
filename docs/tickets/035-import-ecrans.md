# 035 — Import CSV : écrans

Statut : à faire · Jalon : 3 · Zone sensible : non (écrans ; lecture, contrôles et écriture au 031, 032, 034) · Trivial : non

Dépend de : 034 · Fichiers touchés : `src/app/import/index.tsx`, `src/app/import/apercu.tsx`, `src/app/import/resultat.tsx` (nouveaux), `src/app/membres/index.tsx` (bouton « Importer (CSV) »), `src/config/libelles/import.ts` (nouveau), `src/config/libelles/index.ts` (une ligne, partagé avec 037), `src/appTests/memberImport.test.tsx` (nouveau) — 7 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

Les quatre écrans de la maquette : choisir le fichier, aperçu, résultat, fichier non reconnu ; et le bouton « Importer (CSV) » de la liste des membres.

## À lire

- `design/maquettes/` : « Membres » (bouton « Importer (CSV) » à gauche de « Nouveau membre »), « Import CSV : choisir le fichier », « Import CSV : aperçu », « Import CSV : résultat », « Import CSV : fichier illisible » ; `design/CHARTE.md`
- Tickets 032, 034 ; `docs/PRD.md` : EX-30, NF-05, NF-06, NF-07
- `src/app/membres/index.tsx`, `src/app/restauration.tsx` (modèle d'écran qui ouvre le sélecteur), `src/ui/`

## Ce qui change

- `src/app/import/index.tsx` : explication et tableau d'exemple de la maquette, « Choisir le fichier… » ; en cas de refus, l'état « Fichier non reconnu » (bandeau, « Choisir un autre fichier ») avec le texte de la cause.
- `src/app/import/apercu.tsx` : compteur (lignes, à importer, invalides, doublons), section « Doublons » (bascule « Ignorer » par doublon), section « Ligne invalide » (« Ligne 17 · Prénom manquant »), section « Groupe introuvable » (décision du porteur du 2026-11-28), bouton « Importer N membres » (N suit les bascules ; désactivé à 0).
- `src/app/import/resultat.tsx` : « 21 membres importés », phrase de la maquette, « Voir les membres ».
- `src/app/membres/index.tsx` : rangée de deux boutons de la maquette (« Importer (CSV) » un tiers, « Nouveau membre » deux tiers).
- Tous les textes dans `src/config/libelles/import.ts` (NF-07), accords au singulier (« 1 membre importé », « 1 doublon »).

## Critères d'acceptation

- [ ] EX-30 : parcours complet sur le fichier fictif : aperçu conforme à la maquette, « Importer 21 membres », résultat, membres visibles.
- [ ] EX-30 : une bascule « Ignorer » décochée fait passer le bouton à « Importer 22 membres ».
- [ ] « Fichier non reconnu » pour chaque refus (colonnes, trop gros, trop de lignes, pas un CSV), rien d'importé.
- [ ] Bouton « Choisir le fichier… » désactivé pendant un export, une restauration ou une purge (verrou).
- [ ] NF-06 : zones d'appui de 44 points au moins ; bascules annoncées au lecteur d'écran (« Ignorer, coché ») ; NF-05 : tablette en portrait.
- [ ] Écrans comparés à la maquette, écarts listés dans la PR.

## Tests attendus

- `src/appTests/memberImport.test.tsx` (Testing Library, faux sélecteur) : parcours, bascules, refus, verrou, retour Android.

## Hors périmètre

- Règles et écriture (032, 034) ; aide détaillée sur Excel (au-delà de la phrase de la maquette).

## Questions prévues

- **Réservée (écart de maquette)** : la maquette n'a que le refus « colonnes nom et prénom absentes ». Textes proposés pour les autres causes, sur le même écran « Fichier non reconnu » :
  - pas un CSV : « Ce fichier n'est pas un CSV. Dans Excel : Fichier › Enregistrer sous › CSV (séparateur : point-virgule). Rien n'a été importé. »
  - trop gros : « Ce fichier dépasse 1 Mo ou 2 000 lignes. Découpez-le en plusieurs fichiers. Rien n'a été importé. »
  - illisible : « Ce fichier n'a pas pu être lu (guillemet non fermé ?). Rien n'a été importé. »
- **Réservée (écart de maquette)** : section « Groupe introuvable » de l'aperçu, si le porteur la retient au 032.
- Décision automatique proposée : trois routes empilées (retour Android naturel) et l'aperçu passé par `importSession` (034), plutôt qu'un seul écran à étapes.

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Refus de l'import : **même écran « Fichier non reconnu », un texte par cause**, les trois textes ci-dessus tels quels (écart de maquette validé le 2026-11-28).
- Section **« Groupe introuvable »** de l'aperçu retenue (écart de maquette validé le 2026-11-28) : « Ligne 12 · « Poussin mercredi » : importé sans groupe ».
- Maquette et `scripts/maquettes.mjs` à mettre à jour pour ces deux écarts (à l'intégration, comme au jalon 2), avant la comparaison de la PR.
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).

Reporté du lot J3-1 (2026-11-28) :

- Refus `UNSUPPORTED_ENCODING` (MacRoman, décision du porteur du 2026-11-28) : « Ce fichier est enregistré dans un ancien format Mac. Dans Excel : Enregistrer sous › CSV UTF-8. Rien n'a été importé. » (maquette mise à jour à l'intégration du lot J3-1).
- Refus `NOT_TEXT` (UTF-16, octet nul, BOM UTF-8 suivi d'octets invalides) : texte « pas un CSV » déjà validé.
- Aperçu : montrer les colonnes reconnues (et celles ignorées).
- Section « Groupe introuvable » : la cellule « groupe » s'affiche sur une seule ligne, tronquée à 100 points de code avec une ellipse.
- Un doublon gardé dont `unknownGroup` n'est pas nul est importé sans groupe : l'écran le dit.
- L'aperçu dit qu'un doublon ignoré déjà dans l'appli sera inscrit au groupe du fichier et, s'il est archivé, désarchivé (décision du porteur du 2026-11-28 ; maquette « Import CSV : aperçu » mise à jour à l'intégration du lot J3-1).

Reporté du lot J3-2 (2026-11-28, fiche 034) :

- **Réservée (écart de maquette, à poser au porteur)** : le résultat de `confirm` a six compteurs, `{ added, enrolled, duplicatesIgnored, invalid, duplicatesEnrolled, unarchived }` ; la maquette de l'écran de fin n'en montre que quatre. Afficher `duplicatesEnrolled` (doublons inscrits à un groupe du fichier) et `unarchived` (doublons désarchivés, dès que le groupe du fichier est trouvé, décision du porteur du 2026-11-28) demande la validation du porteur.
- Passer l'aperçu affiché à `confirm(aperçuAffiché, kept)` : le hook rend `stale` (`IMPORT_NO_SESSION`) si cet aperçu n'est plus celui de la session.
- `useMemberImport(os, { owner: true })` sur l'écran de choix seulement : il vide la session à son démontage ; les écrans suivants l'appellent sans `owner`.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Bouton de l'aperçu quand aucun membre n'est à importer mais que des doublons de l'appli seront inscrits | Désactivé à N = 0 ; actif si N > 0 ou M > 0 | Actif si N > 0 membres à importer, ou si M > 0 doublons de l'appli restent sur « Ignorer » avec un groupe trouvé ; libellé « Importer N membres » si N > 0, sinon « Inscrire M membres à leur groupe » ; désactivé seulement si N = 0 et M = 0 | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| Phrase du résultat (six compteurs de `confirm`) | Quatre compteurs de la maquette ; six compteurs | Une phrase n'apparaît que si son compteur est non nul, une partie à 0 disparaît ; ex. « 21 membres ajoutés, dont 18 inscrits à leur groupe. 2 doublons ignorés, dont 2 inscrits au groupe du fichier et 1 désarchivé. 1 ligne invalide. » ; `duplicatesIgnored` compte déjà les doublons inscrits : pas de double compte | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| Liste des membres vide : place du bouton « Importer (CSV) » | Absent ; rangée de deux boutons dans la carte vide | La carte vide contient la même rangée : « Importer (CSV) » en secondaire sur un tiers, « Nouveau membre » sur deux tiers | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| Colonnes reconnues ou ignorées dans l'aperçu (reporté du lot J3-1) | Les afficher ; rien | Rien d'affiché ; idée notée dans `docs/IDEES.md` | Réponse du porteur à la séance de lancement du lot J3-3 | décidée par le porteur le 2026-11-28 |
| Textes absents de la maquette | — | Validés tels quels : `EMPTY` « Ce fichier est vide. Rien n'a été importé. » ; en-tête seul « Ce fichier ne contient aucun membre. Rien n'a été importé. » ; aucune saison active « Aucune saison active : les membres seront importés sans groupe. » (une ligne au-dessus des sections) ; doublon gardé au groupe introuvable « « X » introuvable : importé sans groupe » ; doublon archivé « 14/03/2017 · déjà dans l'appli (archivé) » ; doublon dans le fichier « en double dans le fichier » ; titre à `added = 0` « Aucun membre importé » | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| Navigation entre les écrans | Écran à étapes ; trois routes empilées | Trois routes empilées ; retour depuis l'aperçu = `abandon()` ; le résultat remplace l'aperçu (`router.replace`) ; « Voir les membres » = `dismissTo('/membres')` | Pré-analyse du lot J3-3 ; retour Android naturel | à relire |
| Propriétaire de la session d'import | — | `owner: true` sur l'écran de choix seulement ; `confirm(aperçu affiché, kept)` | Pré-analyse du lot J3-3 ; contrat du 034 | à relire |
| Compteurs vers l'écran de résultat | Magasin du module ; paramètres de route | Paramètres de route, relus comme des entiers ≥ 0 | Pré-analyse du lot J3-3 ; aucun nom en paramètre (ABS-04) | à relire |
| Textes des refus | — | Ceux validés le 2026-11-28 ; `TOO_MANY_ROWS` reprend le texte de `TOO_LARGE` | Pré-analyse du lot J3-3 ; un seul texte annonce les deux limites | à relire |
| Texte de `stale`, quelle que soit sa cause | — | « Les membres ou les groupes ont changé : recommencez l'import. » | Pré-analyse du lot J3-3 ; texte du 034 | à relire |
| Texte de `busy` | — | « Une autre opération sur les fichiers est en cours. Réessayez dans un instant. » | Pré-analyse du lot J3-3 | à relire |
| Texte de `failed` | Un texte ; un par étape | Lecture : « Ce fichier n'a pas pu être lu. Rien n'a été importé. » ; écriture : « L'import n'a pas abouti. Rien n'a été modifié. Réessayez. » | Pré-analyse du lot J3-3 ; l'écriture est une seule transaction | à relire |
| Retour pendant l'écriture | Permis ; bloqué | Bloqué | Pré-analyse du lot J3-3 ; la session ne doit pas être vidée en pleine transaction | à relire |
| Textes des lignes invalides | — | Modèle « <Champ> <problème> » (ex. « Prénom manquant ») | Pré-analyse du lot J3-3 ; maquette « Ligne 17 · Prénom manquant » | à relire |
| Groupe introuvable long | — | Tronqué à 100 points de code avec une ellipse | Pré-analyse du lot J3-3 ; reporté du lot J3-1 | à relire |
| Section vide de l'aperçu | Affichée vide ; cachée | Cachée | Pré-analyse du lot J3-3 | à relire |
| Rôle d'accessibilité des bascules | Nouveau composant ; `FilterChip` | `FilterChip` peut prendre le rôle `checkbox`, en option (« Ignorer, coché ») | Pré-analyse du lot J3-3 ; NF-06 | à relire |
| Clé de libellés | — | Une seule clé `memberImport` | Pré-analyse du lot J3-3 ; NF-07 | à relire |
| Plafond d'affichage de l'aperçu | Plafond ; aucun | Aucun plafond ; test de volume à 2000 lignes | Pré-analyse du lot J3-3 ; l'import est déjà plafonné à 2 000 lignes | à relire |
| Taille du ticket | — | 9 fichiers au plus | Pré-analyse du lot J3-3 ; plafond de 10 fichiers | à relire |
| Échec de lecture (`failed`) et fichier à l'en-tête seul : où les montrer | Écran d'aperçu ; écran « Fichier non reconnu » | « Fichier non reconnu », avec le texte validé de chacun ; l'aperçu ne s'ouvre pas pour un fichier sans membre | Même place que les autres refus : rien n'a été importé, on choisit un autre fichier (ticket 035) | à relire |
| Retour depuis « Fichier non reconnu » | Revenir aux membres ; revenir à l'explication | Revenir à l'explication (`abandon()`) par le bouton « ‹ », le geste et la touche Android (`usePreventRemove(refus affiché, abandon)`) ; « Choisir un autre fichier » ramène aussi à l'explication, sans ouvrir le sélecteur | Maquette : le retour et « Choisir un autre fichier » de « Fichier non reconnu » mènent à « Import CSV : choisir le fichier » ; la touche Android menait aux membres (revue du ticket 035) | changée après contradiction |
| Retour depuis le résultat | Écran de choix ; liste des membres | Liste des membres : à la fin de l'import, `dismissTo('/membres')` puis `push('/import/resultat')`, pile [membres, résultat] ; bouton « ‹ », geste, touche Android et « Voir les membres » y mènent | Maquette : le retour du résultat mène à « Membres » ; avec `replace`, la touche Android ramenait à l'écran de choix (revue du ticket 035) | changée après contradiction |
| Abandon de la session en quittant l'aperçu | Écouteur `beforeRemove` ; démontage de l'écran | Au démontage de l'écran d'aperçu, seulement si la génération de session notée au montage n'a pas changé (une session ouverte depuis reste) ; retour bloqué pendant l'écriture (`usePreventRemove`) | `beforeRemove` n'est pas émis par la pile sans blocage actif ; un nouveau choix de fichier avant le démontage ne doit pas être vidé (revue du ticket 035) | à relire |
| Titres de section quand il n'y a qu'un élément | Toujours la forme de la maquette ; accordés | Accordés : « Doublon » / « Doublons », « Ligne invalide » / « Lignes invalides », « Groupe introuvable » / « Groupes introuvables » | La maquette accorde déjà (« Doublons » pour 2, « Ligne invalide » pour 1) (ticket 035) | à relire |
| Phrase « Un doublon ignoré déjà dans l'appli sera inscrit… » | Toujours dans la section Doublons ; seulement s'il y a un doublon de l'appli | Seulement s'il y a au moins un doublon de l'appli | Sans objet pour un doublon du fichier seul (ticket 035) | à relire |
| Compteur « invalide » en rouge | Toujours ; seulement si > 0 | Seulement si > 0 | Le rouge signale un problème ; « 0 invalide » n'en est pas un (ticket 035) | à relire |
| Sous-titre d'un doublon du fichier | Mention seule ; date puis mention | « 14/03/2017 · en double dans le fichier », mention seule sans date | Même modèle que « 14/03/2017 · déjà dans l'appli » (ticket 035) | à relire |
| Textes des autres motifs d'une ligne invalide | — | « Nom trop long », « Nom avec un caractère invisible », « Prénom avec un caractère invisible », « Date de naissance invalide (JJ/MM/AAAA) », « Date de naissance dans le futur », « Téléphone invalide » (modèle « <Champ> <problème> ») | Le motif dit quoi corriger : format de date attendu ; le seul caractère refusé dans un nom est invisible (revue du ticket 035) | changée après contradiction |
| Aperçu ouvert sans session (Tout effacer, session vidée) | Écran vide ; texte de `stale` | Texte de `stale` (« Les membres ou les groupes ont changé : recommencez l'import. ») | Même cause, même texte ; le retour ramène à l'écran de choix (ticket 035) | à relire |
| Libellé du bouton désactivé (N = 0, M = 0) | « Importer 0 membre » ; autre texte | « Importer 0 membre » | Suit le modèle « Importer N membres » de la maquette (ticket 035) | à relire |
| Nom lu par le lecteur d'écran sur la bascule | « Ignorer » ; « Ignorer Léo Garcia » | « Ignorer » suivi du prénom et du nom (« Ignorer Léo Garcia »), annoncé « case cochée » ; le texte affiché reste « Ignorer » | Plusieurs bascules « Ignorer » ne se distinguaient pas au lecteur d'écran (revue du ticket 035) ; ajuste le critère du porteur (« Ignorer, coché ») | changée après contradiction, en attente du porteur |
| Compteur de l'aperçu et bascules | Compteur fixe ; compteur qui suit les bascules | « à importer » = N du bouton, « doublons » = doublons moins ceux gardés ; lignes et invalides fixes | Même règle que le bouton, prévue par la décision du porteur (revue du ticket 035) | à relire |
| M de « Inscrire M membres » | Lignes ; membres distincts | Membres distincts (`memberId`) parmi les doublons de l'appli ignorés au groupe trouvé | Deux lignes du même membre n'inscrivent qu'un membre (revue du ticket 035) | à relire |
| Groupe introuvable sur une ligne | Texte tel quel s'il est court ; espaces réduits toujours | Espaces, tabulations et sauts de ligne réduits à une espace, puis troncature à 100 points de code | La cellule tient sur une seule ligne (revue du ticket 035) | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Membres : import d'une liste depuis un fichier CSV, avec aperçu, doublons et lignes invalides signalés avant d'importer (F-07, EX-30).
- Architecture : `src/app/import/` (trois écrans : `index.tsx` choix et refus, propriétaire de la session ; `apercu.tsx` ; `resultat.tsx`, compteurs en paramètres de route), libellés `src/config/libelles/import.ts` (clé `memberImport`) ; `FilterChip` prend le rôle `checkbox` en option.
- IDEES : montrer dans l'aperçu les colonnes reconnues et celles ignorées (décision du porteur du 2026-11-28) ; écrit par l'IA principale à l'intégration.
- Limite de M (« Inscrire M membres à leur groupe ») : l'aperçu (034) ne connaît pas les inscriptions ; un membre déjà inscrit au groupe trouvé, sans fin d'inscription et non archivé, compte dans M. Le bouton peut donc être actif sans rien écrire (résultat « Aucun membre importé » et doublons ignorés). Correction possible dans le domaine ou le dépôt du 034, sur un ticket.
