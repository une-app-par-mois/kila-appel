# Changelog

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouté

- Inscription dans les dates de la saison : une date de début hors de la saison active est refusée avec un message ; la date proposée est aujourd’hui, ramené au premier ou au dernier jour de la saison — ticket 007e.
- Écrans des contacts d’urgence : section de la fiche avec poignée ≡ pour changer l’ordre (glisser, ou « Monter » et « Descendre » au lecteur d’écran), formulaire, recherche depuis l’accueil provisoire et « Appeler » vers le composeur du système ; react-native-gesture-handler, react-native-reanimated et react-native-worklets explicites aux versions du SDK — ticket 008b.
- Contacts d’urgence (données) : créer, modifier, supprimer, réordonner ; téléphone français vérifié et affiché par paires ; recherche d’un membre avec ses contacts — ticket 008.
- Écrans des inscriptions : inscrits du groupe à la date du jour (« jusqu’au » si un retrait est prévu) et section « À venir », ajout de plusieurs membres à une date, nouveau membre déjà inscrit, groupes d’un membre, retrait à une date, ajout à un groupe — ticket 007c.
- Écrans des membres : liste (recherche, filtre par groupe, archivés), création avec groupe facultatif, fiche enregistrée champ par champ, archivage, suppression avec ce qui sera effacé ; puce de filtre et champ de choix « ▾ » — ticket 007b.
- Membres et inscriptions (données) : liste avec recherche, filtre par groupe et archivés ; créer avec un groupe facultatif, modifier, archiver, supprimer avec ce qui sera effacé ; inscrire plusieurs membres, retirer à une date — ticket 007.
- Licences embarquées : écran « À propos › Licences » et texte de chaque licence, registre généré depuis le bundle exporté et les polices (`scripts/licences.js`), vérifié par la CI — ticket 006e.
- Écrans des groupes : liste de la saison active, archivés, création, fiche (archiver, désarchiver), modification et suppression avec ce qui sera effacé — ticket 006d.
- Écrans Paramètres (accueil provisoire), Saisons et formulaire de saison, avec la confirmation de suppression qui dit ce qui sera effacé — ticket 006c.
- Composants de base : bouton, carte, ligne de liste, confirmation, icônes (react-native-svg 15.16.0, lucide-react-native 1.81.0) — ticket 006b.
- Saisons et groupes (données) : créer, modifier, activer (une seule active), archiver, désarchiver, supprimer, avec ce que chaque suppression effacera — ticket 006.
- Séances calculées à la volée : dates d'un créneau, séance proposée, appels manquants ; date d'effet de l'horaire des créneaux — ticket 005.
- Builds sur la CI (APK Android de test, build iOS simulateur) et audit du binaire : une seule permission interne, sans INTERNET, sans sauvegarde système, sans lien entrant ; base ouverte et migrée au démarrage — ticket 004.
- Thème tiré de la charte, polices IBM Plex embarquées (OFL 1.1), module de journal sans donnée personnelle, contrôles automatiques (textes, couleurs, réseau, jetons de notification) — ticket 003.
- Base locale : schéma complet de la v1 (migration 1, 16 tables), suppressions en cascade (SEC-11) — ticket 002.
- Dates : années acceptées de 1900 à 2100 (RM-04).
- Socle Expo SDK 58 (React Native 0.88.1, Expo Router) et outillage de test : Biome 2.6.9, TypeScript 6.0.3, Jest (jest-expo) — ticket 001.
- Dépendances : liste et versions exactes dans `docs/ARCHITECTURE.md` §2.

### Corrigé

- Fiche d’un membre : une sortie de champ juste après la frappe enregistre la nouvelle saisie, pas celle du rendu précédent — ticket 008b.


## [0.1.0] — [AAAA-MM-JJ]

- Première version publiée.
