# 008b — Contacts d'urgence : écrans

Statut : en cours · Jalon : 1 · Zone sensible : non · Trivial : non

Découpé du ticket 008 le 2026-11-26 (décision du porteur).

## À lire

- `docs/PRD.md` EX-05, EX-06 ; maquettes : Fiche membre, Contact d'urgence, Recherche d'un contact d'urgence

## Décisions du porteur (2026-11-26)

- Ordre des contacts par glisser-déposer, comme la maquette : `react-native-gesture-handler` et `react-native-reanimated` à proposer (version, licence, date, permissions du binaire) avant installation.
- Dépendances acceptées (2026-11-26) : react-native-gesture-handler ~3.3.0, react-native-reanimated 4.7.1, react-native-worklets 0.13.0 (MIT, Software Mansion) ; permissions et réseau vérifiés sur l'APK.
- Entrée de la recherche en haut de l'accueil provisoire (écran Paramètres), à sa place quand le 012 fera l'accueil.

## Critères d'acceptation

- [ ] Section Contacts de la fiche, formulaire « Qui est-ce ? » et « Téléphone », suppression (EX-05)
- [ ] Un appui sur « Appeler » ouvre le composeur du système (aucune permission d'appel)
- [ ] Contacts affichés en 2 appuis au plus après la saisie du nom (EX-06)

## Tests attendus

- Tests d'écrans sur `node:sqlite` ; audit des permissions du binaire après ajout des dépendances

## Hors périmètre

- Notifications (F-06)
