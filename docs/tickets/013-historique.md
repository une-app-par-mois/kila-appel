# 013 — Historique et correction des appels

Statut : fusionné dans le groupe (PR #38) · Jalon : 1 · Zone sensible : non · Trivial : non

Dépend de : aucun ticket à faire · Fichiers touchés : `src/app/(tabs)/historique.tsx`, `src/app/seances/[id].tsx`, `src/data/sessionsRepo.ts`, onglets, `src/app/appel.tsx` (retour après l'enregistrement), libellés

## Contexte

Retrouver, corriger, supprimer un appel passé (EX-16 à EX-18).

## À lire

- `docs/PRD.md` EX-16, EX-17, EX-18
- Maquettes : Historique, Détail d'une séance, Suppression d'une séance

## Ce qui change

- Écrans historique et détail ; filtres

## Critères d'acceptation

- [x] Liste la plus récente en haut, filtres par groupe et période (EX-16)
- [x] Appels manquants dans la liste (EX-17)
- [x] Correction des statuts et du commentaire ; suppression confirmée, la date redevient manquante (EX-18)

## Tests attendus

- Tests de données et d'écrans

## Hors périmètre

- Séances annulées (F-13)

## Questions prévues

Séance de lancement du 2026-11-27 (réponses du porteur) :
- détail d'une séance : champ « Commentaire de la séance (facultatif) » comme à l'appel, 500 caractères au plus, entre la liste et les boutons (EX-18 ; maquette annotée) ;
- filtres : puce Groupe, période « 30 derniers jours », saison active, et **« Toutes les saisons »** pour consulter les saisons passées.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Nombre de présents d'une ligne (« 19/22 présents ») | Présent + Retard / total ; Présent seul | Présent + Retard sur le total des présences, Excusé compris dans le total ; « présent » au singulier pour 0 ou 1 ; le compteur dit le même nombre (« 19 présents dont 2 retards ») | RM-01 ; décision du porteur du 2026-11-27 (question ci-dessous) | répondue par le porteur (2026-11-27) |
| Séances listées | Toutes ; enregistrées seulement | `state = 'recorded'` seulement | Annulées et non planifiées : jalon 2 (F-13) ; pré-analyse | à relire |
| Appels manquants dans l'Historique | Calcul de l'accueil ; autre calcul | Même calcul que l'accueil (`loadMissingRollCalls`, partagé), sans exclure la séance de « Maintenant » ; mêlés aux séances par date, soumis aux filtres ; saison active seulement, même avec « Toutes les saisons » | Une seule règle EX-17 ; pré-analyse | à relire |
| Ordre et format des lignes | — | Date puis heure décroissantes (EX-16) ; « Lun. 24/11 · 18:00 » et « Mer. 19/11 · 19/22 présents » comme la maquette | Maquette ; pré-analyse | à relire |
| Séance dont le groupe a été supprimé | Masquée ; « Groupe supprimé » | « Groupe supprimé », seulement avec « Tous les groupes » | Les présences restent (EX-02) ; pré-analyse | à relire |
| Appel sans créneau (EX-39) | — | Affiché comme les autres ; supprimé, aucune date ne revient comme manquante | Pré-analyse | à relire |
| Phrase « La date réapparaîtra comme appel manquant. » | Toujours ; seulement si c'est vrai | Seulement si la séance est d'un créneau qui existe encore avec un groupe actif, en saison active, et que sa date est une occurrence du créneau, aujourd'hui ou avant, sans regarder l'heure de fin : la date d'un créneau du jour pas encore fini reviendra à sa fin (corrigé après la revue de code) | Ne rien promettre de faux, ni taire ce qui arrivera ; pré-analyse | à relire |
| Message de suppression selon le nombre de présences | — | 0 : « L'appel de X du JJ/MM/AAAA sera effacé définitivement. » ; 1 : « … et sa présence seront effacés… » ; groupe supprimé : « L'appel du JJ/MM/AAAA… » | Accord correct dans tous les cas ; texte de la maquette pour n > 1 | à relire |
| Correction | — | Un appui fait défiler les statuts comme à l'appel (EX-10) ; seuls les membres de la séance, archivés compris, sans ajout ; permise même saison inactive ou groupe archivé | Pré-analyse | à relire |
| « Enregistrer les corrections » | Toujours actif ; actif après un changement | Désactivé tant que rien n'a changé (revenir au statut d'origine le désactive à nouveau) ; aucune confirmation en revenant sans enregistrer | Pré-analyse | à relire |
| Après une correction ou une suppression | Rester sur le détail ; revenir à l'Historique | Retour à l'Historique | Maquette (`data-go="historique"`) | à relire |
| Bouton « Supprimer la séance » | Secondaire gris ; secondaire Marge | Secondaire Marge (`destructiveSecondary`), un tiers ; « Enregistrer les corrections » deux tiers | Maquette (`btn-s tiers danger`) | à relire |
| Compteur du détail | — | `AttendanceCounter` tel quel | Pré-analyse | à relire |
| Après l'enregistrement d'un appel | Accueil ; Historique | Retour à l'Historique (`useSavedReturn`, sorti de `appel.tsx`, 283 lignes) | Note de la maquette Appel ; pré-analyse | à relire |
| État vide | — | Carte de la maquette (« Aucun appel enregistré… », « Faire l'appel », même destination que l'onglet « Nouvel appel ») sans séance ni appel manquant, filtres masqués ; avec des filtres et rien qui correspond : « Aucun appel pour ces filtres. » | Pré-analyse ; rien à filtrer quand rien n'existe | à relire |
| Période par défaut | 30 derniers jours ; saison active | « 30 derniers jours » | Libellé affiché par la maquette | à relire |
| Portée de « 30 derniers jours » | Toutes saisons ; saison active | Toutes les saisons ; les appels manquants restent ceux de la saison active | Au changement de saison, les appels de juin ou d'août ont moins de 30 jours ; sans saison active, le filtre par défaut n'afficherait rien (contradicteur) | changée après contradiction |
| Groupes proposés au filtre | Groupes actifs ; tous les groupes de la période | « 30 derniers jours » : groupes qui ont une séance dans la période ou un appel manquant, toutes saisons ; « Saison active » : groupes de la saison, archivés compris ; « Toutes les saisons » : tous. Hors saison active, suivis de leur saison (« Benjamins · Saison 2025-2026 »). Un groupe absent de la nouvelle période redevient « Tous les groupes » dans le même rendu, sans lecture de trop ; après un changement de filtre, aucune ligne de l'ancien n'est affichée, même si la lecture échoue | Un groupe archivé a des séances ; suit la portée de « 30 derniers jours » changée après contradiction ; revue de code | changée après contradiction |
| Puces « sélectionnées » | — | Puce Groupe toujours sélectionnée (maquette, écran Membres) ; puce Période sélectionnée hors de « 30 derniers jours » | Maquette : « Tous les groupes » allumé, « 30 derniers jours » éteint | à relire |
| Emplacement du code | — | `sessionsRepo` (`history`, `hasRecorded`, `get`, `correct`, `remove`, 271 lignes) ; `groupsRepo.listForHistory` (requête sur les groupes) ; `domain/history.ts` (période, ordre) ; `hooks/useHistory.ts` ; onglet `(tabs)/historique.tsx`, détail `/seances/[id]`, icône `list` de lucide (déjà installé) ; pas d'onglet Stats | Pré-analyse ; `validateStatuses` sorti de `validateRollCall` pour la correction | à relire |
| Ticket non découpé (plus de 10 fichiers) | Découper ; garder | Gardé en un ticket | Les fichiers étaient prévus par la fiche et le lot ; une session | à relire |

## Questions pour le porteur

- **Nombre de présents** — état : répondue par le porteur (2026-11-27), choix (a) : le compteur de l'appel et du détail affiche « 19 présents dont 2 retards » (sans retard : « 19 présents »), puis les absents et les excusés ; note ajoutée à la maquette Appel. Question d'origine (remarque du contradicteur) : La ligne de l'Historique compte Présent + Retard (« 19/22 présents »), le détail les sépare (« 17 présents · 2 retards »), alors que la maquette montre le même chiffre aux deux endroits. Options :
  - (a) « 19 présents dont 2 retards » dans le détail, ce qui change le compteur de la maquette Appel ;
  - (b) Présent seul dans la ligne de l'Historique ;
  - (c) garder tel quel.

  Appliqué en attendant : (c), remplacé par (a).
- **Barre d'onglets** — état : répondue par le porteur (2026-11-27), choix (a) : cinq places, Accueil, place vide de Stats (ni appuyable ni lue), rond au centre, Historique, Paramètres ; aucun écran Stats. Question d'origine (contradiction avec la maquette et le ticket 012) : Avec quatre éléments, le rond « Nouvel appel » n'est plus centré. Options, recommandation en premier :
  - (a) cinq places, une place vide là où viendra Stats (Accueil, vide, rond, Historique, Paramètres) : le rond reste au centre et ne bougera plus au jalon 2 ;
  - (b) garder l'ordre actuel, décentré.

  Appliqué : (a).

## À reporter

- CHANGELOG : « Ajouté : onglet Historique — séances enregistrées et appels manquants, la plus récente en haut, filtres par groupe et par période (30 derniers jours, saison active, toutes les saisons) ; détail d'une séance pour corriger les statuts et le commentaire, ou la supprimer après confirmation. Modifié : après l'enregistrement d'un appel, retour à l'Historique ; le compteur de l'appel compte les retards parmi les présents (« 19 présents dont 2 retards ») ; la barre d'onglets garde le rond « Nouvel appel » au centre. »
- Architecture : « Écrans `(tabs)/historique.tsx` et `seances/[id].tsx` ; hooks `useHistory.ts` (Historique, détail, correction, suppression) et `useSavedReturn.ts` (retour après l'appel) ; `sessionsRepo` : `history`, `hasRecorded`, `get`, `correct`, `remove` ; `groupsRepo.listForHistory` ; domaine `history.ts` (période, ordre) ; `loadMissingRollCalls` (`useRollCall.ts`) partagé par l'accueil et l'Historique. »
