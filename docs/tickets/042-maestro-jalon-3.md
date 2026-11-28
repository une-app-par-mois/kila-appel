# 042 — Campagne Maestro du jalon 3

Statut : à faire · Jalon : 3 · Zone sensible : non (parcours de test, aucun code de l'appli) · Trivial : non

Dépend de : 035, 037, 041 (et 040 pour le parcours du rapport) · Fichiers touchés : `.maestro/import-csv.yaml`, `.maestro/export-csv.yaml`, `.maestro/rapport-pdf.yaml` (nouveaux), `.maestro/sous-parcours/feuille-partage.yaml` (nouveau), `scripts/e2e/csv-fictifs.mjs` et son test `scripts/e2e/csv-fictifs.test.ts` (nouveaux), `scripts/e2e.sh` — 7 fichiers

Découpé le 2026-11-28 (séance de découpage du jalon 3).

## Contexte

Parcours de bout en bout de fin de jalon (`docs/CONVENTIONS.md` §5.2), sur l'émulateur puis l'APK de la CI, comme le 016 et le 030. Critère de sortie (`docs/PLAN.md` §2) : « import d'un CSV fictif Excel (UTF-8 et Windows-1252) ; CSV et PDF ouverts sur l'ordinateur » : la campagne vérifie l'import des deux encodages et les parcours d'export jusqu'à la feuille de partage ; l'ouverture sur l'ordinateur reste un prétest du porteur.

## À lire

- Tickets 016 et 030 (émulateur seul, fichiers fictifs générés à chaque lancement et jamais versionnés, `--appareil-reel`, sous-parcours `selecteur-telechargements.yaml`) ; `docs/CONVENTIONS.md` §5.2 ; `docs/ARCHITECTURE.md` §8
- Tickets 031, 032 (fichier fictif de la maquette), 035, 037, 041 ; `scripts/e2e.sh`, `.maestro/`

## Ce qui change

- `scripts/e2e/csv-fictifs.mjs` : écrit dans le dossier de travail deux CSV fictifs (`kila-e2e-import-utf8.csv` avec BOM et `kila-e2e-import-1252.csv`, séparateur `;`, noms accentués : « Zoé », « Léo », « Noël », « Françoise »), à partir des lignes de `src/__fixtures__/csvFiles.ts`.
- `scripts/e2e.sh` : pousse aussi ces deux fichiers dans Téléchargements, comme les sauvegardes fictives.
- `import-csv.yaml` : pour chaque encodage : restauration d'une sauvegarde fictive (groupes) → Membres → « Importer (CSV) » → sélecteur → fichier → aperçu (compteurs attendus) → « Importer N membres » → résultat → « Voir les membres » → « Zoé » et « Françoise » visibles, accents justes (EX-30, SEC-06).
- `export-csv.yaml` : Stats → « Exporter (CSV) » → bandeau visible (SEC-09) → nombre de lignes attendu sur le jeu du 023 → « Exporter » → feuille de partage du système visible → retour (EX-31).
- `rapport-pdf.yaml` : Stats → « Rapport PDF » → « Créer et partager le PDF » → feuille de partage visible → retour (EX-32).
- `sous-parcours/feuille-partage.yaml` : reconnaît la feuille de partage d'Android (libellés anglais ou français) et la ferme.

## Critères d'acceptation

- [ ] Les trois parcours verts sur l'émulateur, puis sur l'APK de la CI de la PR du jalon.
- [ ] Import : mêmes membres et mêmes accents pour le fichier UTF-8 et le fichier Windows-1252.
- [ ] Les parcours des jalons 1 et 2 restent verts.

## Tests attendus

- `scripts/e2e/csv-fictifs.test.ts` : octets des deux fichiers (BOM, octets Windows-1252 de « é » = `E9`, « ç » = `E7`).
- **À la main sur l'A55** (critère de sortie, non automatisable) : CSV et PDF envoyés à soi-même (Gmail ou Drive), ouverts sur l'ordinateur (Excel ou LibreOffice ; lecteur PDF) ; un CSV enregistré par Excel sur l'ordinateur, en « CSV UTF-8 » puis en « CSV (séparateur : point-virgule) », importé sur le téléphone.

## Hors périmètre

- Contenu des fichiers exportés dans Maestro (l'APK de version n'est pas débogable : le cache de l'appli n'est pas lisible par `adb`) : vérifié par les tests Jest (036, 039, 040) et à la main.
- Parcours iOS (jalon 7).

## Questions prévues

- Aucune réservée : mêmes réponses du porteur que le 016 et le 030 (émulateur, fichiers fictifs générés, A55 « non vérifié » s'il n'est pas disponible).
- Décision automatique proposée : exports vérifiés jusqu'à la feuille de partage seulement ; contenu vérifié par Jest et à la main (voir « Hors périmètre »).

Séance de découpage du jalon 3 (2026-11-28), réponses du porteur :

- Aucune question nouvelle ; à la main sur l'A55, en plus : pages de grille du PDF (paysage, blocs d'environ 25 séances, noms répétés) lisibles sur l'ordinateur.
- Décision d'office ci-dessus appliquée, notée dans `docs/DECISIONS.md` (état « à relire »).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |

## Questions pour le porteur

## À reporter

- CHANGELOG : rien (tests seulement).
- Architecture : §8, trois parcours Maestro de plus ; CSV fictifs générés par `scripts/e2e/csv-fictifs.mjs`.
