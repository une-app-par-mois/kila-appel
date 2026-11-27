# 022 — Alertes d'assiduité : écrans

Statut : à faire · Jalon : 2 · Zone sensible : non (affiche sans calculer : séries et alertes viennent du 021) · Trivial : non

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

- [ ] EX-25 : un membre fictif à 3 absences apparaît sur l'accueil avec son groupe et « 3 absences » ; sans alerte, l'état vide de la maquette, avec le seuil réglé.
- [ ] Bienvenue (012b) remplace toujours l'accueil quand il le doit : la section n'apparaît que sur l'accueil, appel en cours compris.
- [ ] EX-26 : « Marquer comme traitée » le retire de l'accueil ; une absence de plus le fait revenir.
- [ ] Seuil modifié dans le réglage : l'accueil et la ligne de Paramètres suivent sans redémarrer.
- [ ] Les cases des dernières séances portent une icône et un libellé d'accessibilité, jamais la couleur seule (NF-06) ; zones d'appui de 44 pt au moins.
- [ ] Aucun texte en dur (CONV-03), aucune couleur hors du thème (CONV-16).
- [ ] Écarts avec la maquette listés dans la PR.

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

## Questions pour le porteur

## À reporter

- CHANGELOG : Accueil : alertes d'assiduité, écran de l'alerte avec « Marquer comme traitée », réglage du seuil dans Paramètres (F-04, EX-25, EX-26).
- Architecture : écrans `alertes/[id].tsx`, `assiduite.tsx` ; section `AttendanceAlerts` de l'accueil.
