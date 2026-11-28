# 037 — Export CSV des présences : écran et partage

Statut : à faire · Jalon : 3 · Zone sensible : **oui** (sortie de données de mineurs par le partage du système ; avertissement SEC-09) · Trivial : non

Dépend de : 033, 036 · Fichiers touchés : `src/hooks/useAttendanceExport.ts` et son test (nouveaux), `src/app/stats/export.tsx` (nouveau), `src/app/(tabs)/stats.tsx` (bouton « Exporter (CSV) »), `src/config/libelles/exports.ts` (nouveau, repris par 041), `src/config/libelles/index.ts` (une ligne, partagé avec 035), `src/appTests/attendanceExport.test.tsx` (nouveau) — 7 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

EX-31 : choisir un groupe et une période, voir le nombre de lignes, lire l'avertissement « en clair », puis partager le fichier par le sélecteur du système. Le contenu est au 036, l'adaptateur de fichiers au 033.

## À lire

- `design/maquettes/` : « Statistiques » (rangée « Exporter (CSV) » un tiers / « Rapport PDF » deux tiers, sous la légende), « Export CSV des présences », « États vides » (« Aucune présence sur cette période : rien à exporter. »)
- `docs/SECURITE.md` : SEC-09, SEC-10, SEC-12 ; tickets 014b et 014g (export de la sauvegarde : dossier neuf, effacé à la fin du partage, verrou)
- `src/hooks/useBackupExport.ts` (modèle), `src/app/(tabs)/stats.tsx`, `src/ui/statsPeriodParams.ts`, `src/app/stats/periode.tsx`

## Ce qui change

- `src/app/(tabs)/stats.tsx` : bouton « Exporter (CSV) » (un tiers de la rangée de la maquette ; la place de « Rapport PDF » est prise au 041), qui passe la période affichée (`periodParams`).
- `src/app/stats/export.tsx` : « Groupe » (« Tous les groupes » et les groupes de la période), « Du » et « Au » (période reçue, modifiable ; « Du » après « Au » refusé), bandeau de la maquette (« Le fichier contient les noms des membres et leurs présences, **en clair**. Partagez-le seulement avec qui doit le recevoir. »), bouton « Exporter (N lignes) » ; à 0 ligne, l'état vide de la maquette et le bouton désactivé.
- `src/hooks/useAttendanceExport.ts` : verrou `'csv'` ; dossier neuf de `cache/exports/` ; fichier `kila-presences-AAAA-MM-JJ.csv` ; partage `text/csv` ; sous-dossier effacé dès la fermeture de la feuille de partage, réussite ou échec ; journal par codes (`CSV_SHARED`, `CSV_EXPORT_FAILED`).

## Critères d'acceptation

- [ ] EX-31 : depuis Stats sur « Ce mois », l'écran s'ouvre sur le mois ; changer le groupe ou les dates met à jour le nombre de lignes.
- [ ] SEC-09 : le bandeau est présent et entier avant le bouton (test d'écran) ; il n'est jamais réduit.
- [ ] EX-31 : le fichier partagé contient les lignes du 036 (faux partage qui relit le fichier avant son effacement).
- [ ] SEC-10 : aucun fichier ne reste dans `cache/exports/` après le partage, ni après une erreur d'écriture.
- [ ] Bouton désactivé pendant un autre export, une restauration, une purge ou Tout effacer (verrou commun).
- [ ] NF-06, NF-05 ; écran comparé à la maquette, écarts listés dans la PR.
- [ ] **À la main** (critère de sortie) : fichier envoyé à soi-même depuis l'A55, ouvert dans Excel ou LibreOffice sur l'ordinateur : colonnes séparées, accents justes, dates reconnues.

## Tests attendus

- `src/hooks/useAttendanceExport.test.tsx` : faux fichiers (033), contenu, effacement, verrou, échec du partage.
- `src/appTests/attendanceExport.test.tsx` : période reçue, filtre, état vide, bandeau SEC-09.

## Hors périmètre

- Rapport PDF (038 à 041) ; choix du séparateur ou de l'encodage par l'encadrant.

## Questions prévues

- Plan ci-dessus à valider à la séance de lancement (zone sensible).
- Décisions automatiques proposées :
  - Période par défaut : celle de l'onglet Stats au moment de l'appui (« Saison » se résout comme dans l'onglet).
  - Nom du fichier : `kila-presences-AAAA-MM-JJ.csv` (date du jour, comme la sauvegarde), sans nom de groupe ni période (un nom court et stable ; le contenu dit le reste).
  - Comme pour la sauvegarde, un partage annulé ne se détecte pas : aucun message de réussite après la feuille de partage.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : export des présences en CSV (une ligne par séance et par membre), sur une période et un groupe, par le partage du système (F-08, EX-31).
- Architecture : `src/hooks/useAttendanceExport.ts`, `src/app/stats/export.tsx`, libellés `exports.ts`.
