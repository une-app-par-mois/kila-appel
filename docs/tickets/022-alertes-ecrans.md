# 022 — Alertes d'assiduité : écrans

Statut : fait (PR #88 vers `main` ; PR #72 dans le groupe) · Jalon : 2 · Zone sensible : non (affiche sans calculer : séries et alertes viennent du 021) · Trivial : non

Dépend de : 021 · Fichiers touchés : `src/app/(tabs)/index.tsx`, `src/ui/AttendanceAlerts.tsx` (nouveau), `src/app/alertes/[id].tsx` (nouveau), `src/app/assiduite.tsx` (nouveau), `src/app/(tabs)/parametres.tsx`, `src/config/libelles/alertes.ts` (nouveau), `src/config/libelles/index.ts`, `src/ui/SessionSquares.tsx` (nouveau, repris par le 025), `src/appTests/alerts.test.tsx` (nouveau) — 9 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

Montrer les alertes sur l'accueil, l'écran « Alerte d'assiduité » avec « Marquer comme traitée », le réglage du seuil et la ligne de Paramètres (maquettes « Accueil complet », « Alerte d'assiduité », « Réglage des alertes d'assiduité », « États vides du lot 2 »).

## À lire

- `design/maquettes/` : écrans ci-dessus ; `design/CHARTE.md` (pastilles de statut : libellé et icône, NF-06)
- `docs/PRD.md` : EX-25, EX-26 ; ticket 021 (plan validé)
- `src/app/(tabs)/index.tsx`, `src/ui/MissingCalls.tsx` (même forme de section), `src/ui/Attendance.tsx` (`StatusPill`), `src/app/(tabs)/parametres.tsx` (commentaire : relance et alertes aux jalons suivants)

## Ce qui change

- Accueil : section « Alertes d'assiduité » (nom, groupe, « 4 absences » en Plex Mono rouge) ; un appui ouvre l'alerte. Sans alerte, la section garde l'état vide de la maquette « États vides du lot 2 » : « Aucune alerte : personne n'a manqué 3 séances de suite. », avec le seuil réglé.
- `src/app/alertes/[id].tsx` : titre = nom du membre, sous-titre « Poussins mercredi · 4 absences non excusées de suite », « Dernières séances » (cases de statut de `src/ui/SessionSquares.tsx` : icône et libellé d'accessibilité, la plus récente d'abord, « De la plus récente à la plus ancienne. »), « Voir ses contacts d'urgence », « Marquer comme traitée » (retour à l'accueil).
- `src/app/assiduite.tsx` : « Alerter après [3 ▾] absences de suite », « Seules les absences non excusées comptent. »
- Paramètres : section « Réglages », ligne « Alertes d'assiduité · Après 3 absences » (la ligne Relance arrive au 029).
- Libellés dans `src/config/libelles/alertes.ts` (CONV-03), accords au singulier (« 1 absence » n'existe pas : le seuil vaut 2 au moins).

## Critères d'acceptation

- [x] EX-25 : un membre fictif à 3 absences apparaît sur l'accueil avec son groupe et « 3 absences » ; sans alerte, l'état vide de la maquette, avec le seuil réglé. — tests d'écran (`src/appTests/alerts.test.tsx`) ; non vérifié sur le téléphone
- [x] Bienvenue (012b) remplace toujours l'accueil quand il le doit : la section n'apparaît que sur l'accueil, appel en cours compris. — retour anticipé de l'accueil inchangé, tests de Bienvenue existants verts ; la section reste visible pendant un appel en cours (test)
- [x] EX-26 : « Marquer comme traitée » le retire de l'accueil ; une absence de plus le fait revenir. — test d'écran ; alerte levée puis traitée sur un jeu fictif à la main : non vérifié sur le téléphone
- [x] Seuil modifié dans le réglage : l'accueil et la ligne de Paramètres suivent sans redémarrer. — test d'écran
- [x] Les cases des dernières séances portent une icône et un libellé d'accessibilité, jamais la couleur seule (NF-06) ; zones d'appui de 44 pt au moins. — icône et libellé testés ; zones d'appui de 44 pt et lecteur d'écran réel : non vérifié sur le téléphone
- [x] Aucun texte en dur (CONV-03), aucune couleur hors du thème (CONV-16). — contrôles CONV-03 et CONV-16 de `./scripts/test.sh`
- [x] Écarts avec la maquette listés dans la PR. — PR #72

## Tests attendus

- `src/appTests/alerts.test.tsx` : accueil avec et sans alerte, ouverture de l'alerte, traitement, retour, réapparition ; choix du seuil et ligne de Paramètres.
- À la main (téléphone, prétest du jalon) : alerte levée puis traitée sur un jeu fictif.

## Hors périmètre

- Frise et bouton « Annuler » de l'accueil complet (F-12, F-13 : jalons 4 et 5).
- Le calcul (021).

## Questions prévues

- Place de la section sur l'accueil : la maquette « Accueil complet » n'a pas les appels manquants ; proposé : après « Appels manquants », avant le bandeau de sauvegarde (question du découpage).
- Nombre d'alertes sur l'accueil : proposé 5 au plus, puis « et N autres », comme les appels manquants (question du découpage).
- Destination de « Voir ses contacts d'urgence » : la maquette ouvre la recherche d'urgence ; à préciser par la pré-analyse (recherche vide, ou fiche du membre).

Séance de découpage du jalon 2 (2026-11-27), réponses du porteur :

- Place de la section : après « Appels manquants », avant le bandeau de sauvegarde.
- Nombre : 5 alertes au plus, puis « et N autres », comme les appels manquants.
- `alert_acks` ajoutée au tableau « Données manipulées » du cadrage.
- Destination de « Voir ses contacts d'urgence » : reste à préciser par la pré-analyse (non tranchée au découpage).

Reports de l'intégration du lot J2-1 (2026-11-27) :

- `useAlert` rend `alert: null` quand l'alerte n'est plus montrée (traitée, série retombée), `recent` toujours lu : après « Marquer comme traitée », revenir à l'accueil, sans afficher d'état vide sur l'écran de l'alerte (021 ; décision en attente du porteur, `docs/QUESTIONS.md`).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Destination de « Voir ses contacts d'urgence » | Recherche vide ; fiche du membre ; recherche remplie | `/urgence?membre=<id>` : l'écran lit le membre par son identifiant et remplit la recherche avec son nom, modifiable ; le nom ne passe jamais dans la route (ABS-04) ; identifiant invalide ou inconnu : recherche vide. `src/app/urgence.tsx` ajouté aux fichiers (10) | Séance de lancement du lot | décidée par le porteur le 2026-11-27 |
| Place et taille de la section sur l'accueil | — | Après « Appels manquants », avant le bandeau de sauvegarde ; 5 alertes au plus, puis « et N autres » | Réponse du découpage ; même forme que les appels manquants ; pré-analyse | à relire |
| Pendant un appel en cours | Section cachée ; visible | Visible ; Bienvenue garde la priorité (retour anticipé inchangé) | L'accueil reste l'accueil pendant un appel ; pré-analyse | à relire |
| État vide et échec de lecture | — | État vide seulement quand la liste et le seuil sont lus ; en cas d'échec, section cachée et `labels.common.loadFailed` dans l'erreur de l'accueil | Pas de clignotement ni d'état vide trompeur (CONV-15) ; pré-analyse | à relire |
| Sans saison active | — | Liste vide (calcul du 021) et état vide normal | Pré-analyse | à relire |
| Seuil lu par l'accueil | — | `useAlerts` renvoie le seuil qu'il a lu pour la liste (une seule lecture) ; l'accueil n'appelle plus `useAlertThreshold()` ; `src/hooks/useAlerts.ts` (et son test) ajoutés aux fichiers | Contrat des hooks (CONV-10) ; pré-analyse | contestée, changée après contradiction (revue du 022) : un seuil lu à part pouvait échouer sans erreur affichée ou différer de celui de la liste |
| Ligne d'alerte | Étendre `ListRow` ; ligne propre | Ligne propre à `AttendanceAlerts.tsx` : nom en 600, groupe en Texte secondaire, « N absences » en Plex Mono Marge, 44 pt au moins, lue d'un bloc (« Alix Exemple, Poussins, 3 absences ») ; `ListRow` inchangé | Pas de changement d'un composant partagé ; pré-analyse | à relire |
| Alerte qui n'est plus montrée (`alert: null`) | État vide ; retour | Retour à l'accueil (`router.back()`, sinon `replace('/')`), sans état vide, seulement quand l'écran a le focus (`useIsFocused`), donc aussi au retour du focus ; pendant la lecture et après le départ, rien n'est affiché (pas d'en-tête vide) ; lecture en échec : titre « Alertes d'assiduité » et message | Report du 021 ; pré-analyse | à relire (corrigée après revue : la recherche d'urgence ouverte par-dessus se fermait) |
| Navigation après « Marquer comme traitée » | — | Une seule navigation, protégée par une ref (le rechargement qui suit ne revient pas une seconde fois) ; le retour « ‹ » passe par la même fonction | Pré-analyse | à relire |
| Traitement refusé | — | `errorMessage` dans l'erreur de l'écran ; l'écran reste et `notifyDataChanged()` relit l'alerte : une longueur périmée (`RangeError`) se corrige, un nouvel appui réussit | CONV-15 ; pré-analyse | à relire (corrigée après revue) |
| Cases des dernières séances | — | `SessionSquares.tsx` : 22 pt, non cliquables, icône et libellé d'accessibilité « Absent, 03/12/2026 », la plus récente d'abord, sans case vide (025) | NF-06 ; maquette ; pré-analyse | à relire |
| Réglage du seuil | Champ libre ; liste de choix | « Alerter après [N ▾] absences de suite » avec la `ChoiceList` existante, de 2 à 10 ; enregistré au choix | Même forme que la conservation (EX-24) ; pré-analyse | à relire |
| Textes | — | Tous dans `src/config/libelles/alertes.ts`, clé unique `alerts` (y compris le titre de section « Réglages ») ; `commun.ts` et `accueil.ts` inchangés | CONV-03 ; limiter les fichiers communs du lot ; pré-analyse | à relire |
| Paramètres | — | Section « Réglages » entre Organisation et Données, une seule ligne « Alertes d'assiduité · Après N absences » (Relance : 029) | Maquette Paramètres ; pré-analyse | à relire |
| Identifiant de route invalide | — | Même règle que `idFrom` de `membres/[id].tsx` (chiffres seulement, sinon 0) pour `alertes/[id]` et `urgence?membre=` | Pré-analyse | à relire |
| Recherche d'urgence remplie après une saisie déjà commencée | Remplacer ; garder la saisie | Garder la saisie : le nom ne remplit la recherche que si elle est encore vide, une seule fois | Ne jamais écraser ce que l'utilisateur tape (champ en autoFocus) | à relire |
| Libellé des choix du seuil | « 4 » ; « 4 absences » | « 4 absences » dans la liste ; le champ affiche le nombre seul, comme la maquette | Liste lisible hors contexte | à relire |
| Recherche d'urgence ouverte depuis une alerte | Tous les résultats ; seulement le membre | Tant que la saisie pré-remplie n'est pas modifiée, seule la carte du membre (`memberId`) ; toute modification rend la recherche normale ; pas d'`autoFocus` (« Appeler » reste visible) ; `loadFailed` de `useMember` dans l'erreur de l'écran | Un homonyme ou un « Martinez » ferait appeler le mauvais parent (revue du 022) | à relire |

## Questions pour le porteur

Aucune.

## À reporter

- CHANGELOG : Accueil : alertes d'assiduité, écran de l'alerte avec « Marquer comme traitée », réglage du seuil dans Paramètres (F-04, EX-25, EX-26).
- Architecture : écrans `alertes/[id].tsx`, `assiduite.tsx` ; section `AttendanceAlerts` de l'accueil.
- Architecture (suite) : composant `SessionSquares` (repris par le 025) ; `urgence.tsx` accepte `?membre=<id>` (identifiant seul, ABS-04).
- Écarts de maquette, pour la PR : section des alertes placée après « Appels manquants » (absents de la maquette « Accueil complet ») ; pas de ligne Relance dans « Réglages » (029) ; ni frise ni bouton « Annuler » sur l'accueil (F-12, F-13 : jalons 4 et 5) ; libellé « 4 absences » dans la liste de choix du seuil.
- Fichiers touchés : 12 (`src/app/urgence.tsx` ajouté par la réponse du porteur ; `src/hooks/useAlerts.ts` et `src/hooks/useAlerts.test.tsx` après la revue : le seuil vient de la même lecture que la liste) ; `src/appTests/home.test.tsx` non modifié (tests dans `alerts.test.tsx`).
- Pour un ticket de nettoyage : `idFrom` est copié dans `membres/[id].tsx`, `alertes/[id].tsx` et `urgence.tsx`, à factoriser ; la clé `alerts.settingsSection` (« Réglages ») est à déplacer au ticket 029, quand la section reçoit la ligne Relance.
