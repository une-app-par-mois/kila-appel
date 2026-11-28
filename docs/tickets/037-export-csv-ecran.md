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

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Plan validé par le porteur le 2026-11-28.
- Décisions d'office ci-dessus appliquées, notées dans `docs/DECISIONS.md` (état « à relire »).
- Relecture du porteur avant la fusion dans le groupe (zone sensible).

Reporté du lot J3-1 (2026-11-28) :

- Vérifier sur l'A55 qu'un envoi différé vers Drive lit bien le fichier avant l'effacement du sous-dossier à la fermeture de la feuille de partage (033).
- Tenir le verrou `'csv'` par `fileLock.run('csv', …)` (rendu dans un `finally`, même après une erreur), de l'écriture à la fermeture de la feuille de partage.

Reporté du lot J3-2 (2026-11-28, fiche 036) :

- Mesurer la mémoire de l'export sur l'A55 avec `volumeSeed` (120 000 lignes, pic estimé entre 100 et 200 Mo) ; sur `node:sqlite`, les trois cas NF-08 passent en 1,7 s au total.
- Prévoir un plafond de lignes si la mesure le demande (écart de maquette et texte à poser au porteur le cas échéant).
- `attendanceExportRepo.groups(period)` passe par la requête `OVERVIEW` des statistiques : durée à mesurer sur l'appareil.

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Plafond de lignes de l'export (reporté du lot J3-2) | Aucun ; plafond | 50 000 lignes, constante nommée testée à 50 000 et 50 001 ; au-delà, export refusé : « Trop de lignes : réduisez la période ou choisissez un groupe », bouton désactivé, compteur affiché | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| États absents de la maquette | — | « Export en cours… » sur le bouton désactivé ; « Le fichier n'a pas pu être exporté. Réessayez. » en cas d'échec ; « · Archivé » après un groupe archivé de la liste ; erreur de date sous le champ, textes de `periode.tsx` | Réponse du porteur à la séance de lancement du lot J3-3 (écart de maquette) | décidée par le porteur le 2026-11-28 |
| Bouton « Exporter (CSV) » de Stats | Toujours ; selon les séances | Seulement s'il y a des séances et une période valide ; premier tiers de la rangée | Pré-analyse du lot J3-3 | à relire |
| Période transmise | — | Comme à l'ouverture d'un groupe ; modifier Du ou Au rend la période libre | Pré-analyse du lot J3-3 ; `statsPeriodParams` | à relire |
| Lecture de `count` et `groups` | — | Seulement si les dates sont valides ; « Du » après « Au » : `END_BEFORE_START` | Pré-analyse du lot J3-3 | à relire |
| Groupe reçu qui n'existe plus | — | Retour à « Tous les groupes » seulement si le groupe est supprimé ; un groupe sans séance sur la nouvelle période reste choisi (ajouté en fin de liste, lu par `groupsRepo.get`, sans toucher au dépôt du 036) et l'état vide s'affiche | Revue du lot J3-3 : le repli ne doit jamais élargir l'export en silence | changée après contradiction |
| Export à 0 ligne | — | « Aucune présence sur cette période : rien à exporter. », bandeau gardé | Pré-analyse du lot J3-3 ; maquette « États vides » ; SEC-09 | à relire |
| Libellé du bouton | — | « Exporter (N lignes) », N formaté en fr-FR | Pré-analyse du lot J3-3 ; maquette | à relire |
| Bandeau SEC-09 | — | Texte de la maquette au caractère près, testé | Pré-analyse du lot J3-3 ; SEC-09 | à relire |
| Place des textes | — | Textes de l'écran dans `exports.ts` ; ceux du fichier restent dans `stats.csv` ; `labels.weekdays` passé tel quel | Pré-analyse du lot J3-3 ; NF-07 | à relire |
| Cycle de l'export | — | `fileLock.run('csv')` ; `clear` ; `newDir` ; `writeFile` vers `kila-presences-AAAA-MM-JJ.csv` ; `shareFile` ; `removeDir` dans un `finally` ; codes `CSV_*` ; aucun message de réussite ; bouton désactivé sous le verrou | Pré-analyse du lot J3-3 ; modèle `useBackupExport`, SEC-10 | à relire |
| Nombre du bouton (développement du lot J3-3) | Espace simple ; espace fine insécable (`toLocaleString`) ; espace insécable | « 2 418 » avec l'espace insécable `NBSP` importée de `attendanceRate.ts` ; « 1 ligne » au singulier | Même caractère que « 87 % » (`attendanceRate.ts`) ; rendu identique sur Hermes et Node, sans dépendre d'`Intl` | à relire |
| Bouton quand le nombre est inconnu (dates à corriger, première lecture) | Masqué ; « Exporter (0 ligne) » ; « Exporter (CSV) » désactivé | « Exporter (CSV) » désactivé | Ne montre pas un faux compte ; même libellé que le bouton de Stats | à relire |
| Moment de l'erreur de date (pas de bouton « Appliquer » sur cet écran) | À chaque frappe ; date entière (10 caractères) ou sortie du champ | Date entière ou sortie du champ ; aucune lecture tant qu'une date est fausse | Pas d'erreur rouge pendant la frappe d'une date | à relire |
| Place de l'état vide et de « Trop de lignes » | — | Sous le bandeau SEC-09, juste avant le bouton ; « Trop de lignes… » en Marge, comme un message d'échec | Le bandeau reste entier et avant le bouton dans tous les cas | à relire |
| Plafond au moment de l'export | Seulement sur l'aperçu ; revérifié sur les lignes lues | Sous le verrou, `count` relancé avant `rows()`, puis longueur des lignes en second filet ; refus : `CSV_REJECTED_TOO_MANY` et texte « Trop de lignes… », aucun fichier écrit | Revue du lot J3-3 ; les données peuvent changer entre l'aperçu et l'appui | changée après contradiction |
| Codes du journal | — | `CSV_SHARED`, `CSV_EXPORT_FAILED`, `CSV_REJECTED_TOO_MANY`, `CSV_CLEAR_FAILED`, `CSV_CLEANUP_FAILED`, `CSV_PREVIEW_LOAD_FAILED`, sans détail | ABS-04, SEC-12 ; modèle de la sauvegarde | à relire |
| Nom de l'objet de libellés | `exports` ; `exportScreens` | `exportScreens` (fichier `exports.ts`), clé `labels.attendanceExport` | `exports` est un nom réservé de CommonJS après la compilation par Babel | à relire |
| Fichiers touchés : 9 au lieu de 7 | — | `src/appTests/attendanceExportEdges.test.tsx` ajouté aux corrections de revue (cas limites ; le test d'écran aurait dépassé 300 lignes) ; `src/appTests/stats.test.tsx` modifié : l'assertion « aucun bouton CSV ni PDF » (masqués jusqu'au jalon 3) devient « Exporter (CSV) présent, PDF absent », et l'état vide vérifie l'absence du bouton | Assertion rendue fausse par le ticket même ; justifié (9 au plus) | à relire |
| Nom du fichier | `kila-presences-AAAA-MM-JJ.csv` (date du jour) ; période dans le nom | `kila-presences-AAAA-MM-JJ-au-AAAA-MM-JJ.csv` (début et fin de la période) ; `_` refusé par `EXPORT_NAME` (033), règle inchangée | Revue du lot J3-3 | changée après contradiction |
| Aperçu périmé (revue du lot J3-3) | — | Chaque aperçu retient le choix pour lequel il a été lu (période, groupe, jour) ; bouton désactivé et aucun export tant qu'il ne correspond pas aux champs et au groupe affichés, ou après une lecture en échec ; l'ancien compteur reste affiché | Revue de code et de sécurité ; un appui ne doit jamais exporter l'ancienne période ou l'ancien groupe | à relire |
| Champs de date avant la première lecture, saison retapée | — | Saisie avant l'aperçu : l'autre date part des paramètres reçus ; deux dates égales à la saison résolue : la saison (`seasonId`) est gardée, sinon période libre | Revue du lot J3-3 | à relire |
| Dates invalides dans l'adresse | Message « Chargement impossible » ; valeurs reçues dans les champs | Valeurs reçues dans les champs (telles quelles si illisibles), erreur sous le champ dès l'ouverture, rien n'est lu ni journalisé | Revue du lot J3-3 | à relire |
| Message d'échec | Gardé jusqu'au nouvel essai ; effacé au changement | Effacé dès que le groupe ou une date change | Revue du lot J3-3 | à relire |

## Questions pour le porteur

## À reporter

- CHANGELOG : Statistiques : export des présences en CSV (une ligne par séance et par membre), sur une période et un groupe, par le partage du système (F-08, EX-31).
- SEC-12 (`docs/SECURITE.md`, liste des codes) : export CSV : `CSV_SHARED`, `CSV_EXPORT_FAILED`, `CSV_REJECTED_TOO_MANY`, `CSV_CLEAR_FAILED`, `CSV_CLEANUP_FAILED`, `CSV_PREVIEW_LOAD_FAILED`, sans détail ; `error.message` jamais journalisé ; test « ABS-04 SEC-12 » de `src/hooks/useAttendanceExport.test.tsx`.
- Risque à vérifier sur l'A55 : un envoi différé vers Drive (ou une autre appli qui lit le fichier après la fermeture de la feuille de partage) pourrait trouver le sous-dossier déjà effacé ; à essayer avant la clôture du jalon.
- Architecture : `src/hooks/useAttendanceExport.ts` (aperçu, plafond `MAX_EXPORT_ROWS`, export sous le verrou `'csv'`), `src/app/stats/export.tsx` (écran « Exporter les présences »), libellés `src/config/libelles/exports.ts` (`labels.attendanceExport`, repris par 041).
