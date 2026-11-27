# 012 — Onglets et accueil

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé le 2026-11-27 (décision du porteur) : Bienvenue au 012b, états vides au 012c.

## Contexte

Relier les écrans : barre d'onglets et accueil (EX-09, EX-17, EX-06).

## À lire

- `docs/PRD.md` EX-09, EX-17
- Maquettes : Accueil, Accueil avec un appel interrompu, Paramètres

## Décisions du porteur (2026-11-27)

- Onglets : seulement les écrans existants — Accueil, « Nouvel appel » (au centre), Paramètres ; Historique au 013, Stats au jalon 2
- « Nouvel appel » ouvre l'appel directement : l'appel en cours, sinon la séance proposée, sinon l'appel sans créneau
- Appels manquants : les 5 plus récents d'abord, puis « et N autres » (le reste dans l'historique, 013)
- Hors de ce ticket : « Annuler » une séance (F-13, jalon 2), bandeau de sauvegarde (EX-21, ticket 014)

## Ce qui change

- Barre d'onglets ; accueil (date, recherche d'urgence, appel en cours, « Maintenant », appels manquants) ; Paramètres dans son onglet

## Critères d'acceptation

- [x] Barre d'onglets : Accueil, Nouvel appel, Paramètres
- [x] « Nouvel appel » : appel en cours, séance proposée ou appel sans créneau
- [x] Accueil : séance du moment, appels manquants (5 au plus), accès à la recherche d'urgence
- [x] Paramètres : organisation et licences, dans son onglet

## Tests attendus

- Tests d'écrans

## Revue de code (2026-11-27)

- L'accueil ne se vide plus à chaque minute (`useLoaded` garde valeur et « chargé » avec `keepPrevious`)
- La séance proposée n'apparaît plus aussi dans les appels manquants
- « Maintenant » attend de savoir s'il y a un appel en cours
- Une seule horloge (`useLocalNow`) pour l'accueil et la barre d'onglets, relue au retour au premier plan

## Hors périmètre

- Bienvenue (012b), états vides (012c), frise et alertes (jalons 2 et 5)
