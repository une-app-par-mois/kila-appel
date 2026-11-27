# Changelog

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouté

- Écran « Base illisible » : « Restaurer une sauvegarde » (bouton principal) ; le fichier est vérifié sur l'écran même, puis résumé avec « Les données abîmées seront effacées définitivement. » ; refus ou Annuler ne touchent pas au fichier abîmé ; après la confirmation, effacement, base neuve et recopie en une transaction, puis l'accueil ; si la recopie échoue, « La restauration n'a pas abouti », base vide ouverte, « Choisir un fichier… » ou « Repartir de zéro » ; si la base neuve ne s'ouvre pas après l'effacement (restauration ou « Repartir de zéro »), « Les données abîmées ont été effacées, mais l'appli n'a pas pu préparer un nouveau fichier de données. Réessayez. », jamais « Rien n'a été effacé » ; retour Android sans effet pendant l'effacement et la recopie (EX-22, EX-20, SEC-10, SEC-11) — ticket 014f.
- Données : Tout effacer, depuis l'écran Sauvegarde ou Paramètres, après double confirmation (le bouton, puis le mot EFFACER) ; les copies du cache sont vidées juste après, puis Bienvenue recrée la saison comme à une installation neuve (EX-23, SEC-10, SEC-11) — ticket 015f.
- Base illisible au démarrage : écran de récupération au lieu d'un plantage, en trois variantes (base abîmée : « Réessayer », ou « Repartir de zéro » après confirmation, puis Bienvenue ; réglage refusé ou erreur passagère : « Réessayer », rien n'est effacé ; version plus récente : « mettez l'appli à jour », sans action) ; dossiers temporaires des sauvegardes et restaurations vidés au démarrage (EX-22, SEC-10, SEC-11) — ticket 014c.
- Données : conservation de 1 à 3 saisons (3 par défaut) et purge des anciennes saisons depuis l'écran Sauvegarde, confirmation chiffrée membres compris ; seules les saisons commencées comptent parmi les gardées ; ligne Conservation dans Paramètres (EX-24, SEC-11) — ticket 015b.
- Rappels de sauvegarde : invitation unique après le premier appel enregistré, et bandeau sur l'accueil après 30 jours sans sauvegarde (depuis la plus ancienne séance s'il n'y en a jamais eu) (EX-21) — ticket 014d.
- Écran Restauration : choix d'un fichier par le sélecteur du système, vérification sur une copie à part (« Vérification du fichier… »), résumé et appel en cours remplacé annoncés, confirmation « Remplacer mes données », puis accueil ; quatre messages de refus clairs, rien n'est modifié ; l'écran ne se quitte pas pendant la restauration ; export et restauration jamais en même temps ; copies temporaires effacées dans tous les cas (EX-20, NF-04, SEC-10) — ticket 014e.
- Écran Sauvegarde : export d'une copie datée de la base par le partage du système, avertissement complet « fichier non protégé » avant l'export, date de la dernière sauvegarde notée à la fin du partage et affichée dans l'écran et dans Paramètres ; copie effacée dès la fin du partage (EX-19, EX-21, SEC-09, ABS-06) — ticket 014b.
- Sécurité : le mode de journal de la base est fixé à `delete` et vérifié à chaque ouverture ; sinon la base n'est pas ouverte (SEC-11, ABS-05) — ticket 015c.
- Onglet Historique : séances enregistrées et appels manquants, la plus récente en haut, filtres par groupe et par période (30 derniers jours, saison active, toutes les saisons) ; détail d'une séance pour corriger les statuts et le commentaire, ou la supprimer après confirmation (EX-16 à EX-18). Après l'enregistrement d'un appel, retour à l'Historique ; le compteur compte les retards parmi les présents (« 19 présents dont 2 retards ») ; barre d'onglets à cinq places, le rond « Nouvel appel » au centre — ticket 013.
- Données : sauvegarde de la base (copie datée), vérification d'un fichier avant tout remplacement (cause précise, dont « version plus récente »), restauration en une seule transaction ; réglages de l'appli (EX-19, EX-20, NF-04) — ticket 014.
- Données : tout effacer (une transaction) et purge des anciennes saisons, membres qui ne figurent plus dans aucune saison gardée compris (EX-23, EX-24, SEC-11) — ticket 015.
- États vides de la maquette : recherche sans résultat (saisie rappelée et conseil) dans les membres, le contact d'urgence et l'appel ; carte « Aucun membre » avec « Nouveau membre » ; appel d'un groupe vide — ticket 012c.
- Bienvenue : à la première ouverture, saison créée automatiquement sur une base vide (1er septembre au 31 août, celle de la rentrée dès le 1er juillet) ; quatre étapes et un seul bouton, sur la première qui reste, tant que la mise en route n'est pas finie et qu'aucun appel n'est fait — ticket 012b.
- Barre d'onglets (Accueil, « Nouvel appel » au centre, Paramètres) ; accueil : date du jour, recherche d'un contact d'urgence, appel en cours ou séance du moment avec « Faire l'appel », appels manquants (5 au plus, « et N autres ») — ticket 012.
- Suppression d'un groupe ou d'un membre : la confirmation annonce l'appel en cours qu'elle touche ; supprimer le groupe de l'appel en cours efface ce brouillon — ticket 011b.
- Brouillon d'appel : chaque changement (statut, commentaire) écrit aussitôt dès le premier ; appel retrouvé tel quel après une fermeture forcée ; carte « Appel en cours » sur l'accueil (commencé à, absents notés), « Abandonner » confirmé ou « Reprendre l'appel » ; « Nouvel appel » ouvre le brouillon ; un autre appel est bloqué tant qu'il existe ; brouillon effacé à l'enregistrement — ticket 011.
- Appel sans créneau : groupe et date (jamais future, dans la saison), heure de l'ouverture de l'appel ; « Ajouter un membre » pendant l'appel, inscrit à la date de la séance et ajouté à Présent, statuts gardés ; « Nouvel appel » y mène sans séance à faire — ticket 010c.
- Écran d'appel : membres inscrits à la date, tous à Présent ; un appui fait passer à Absent, Retard, Excusé ; pastilles avec icône et libellé, compteur, recherche au-delà de 20 membres, commentaire, « Enregistrer l'appel » puis « Appel enregistré » ; « Nouvel appel » en tête de l'accueil, vers la séance proposée (jamais d'un jour à venir) — ticket 010b.
- Enregistrement d'un appel (données) : séance, groupe figé et présences d'un bloc ; une séance par créneau et par date ; membres inscrits à la date ; commentaire de 500 caractères au plus ; séance proposée (créneau en cours ou le plus proche) — ticket 010.
- Écrans des créneaux : liste « Mercredi 14:00 – 15:30 », création et modification (jour, début, durée « 1 h 30 », groupe, lieu et nom facultatifs), suppression après confirmation qui garde les séances ; ligne « Créneaux » dans Paramètres — ticket 009b.
- Créneaux hebdomadaires (données) : jour, début, durée, lieu et nom facultatifs, un groupe ; un nouveau jour ou une nouvelle heure prennent effet le jour même ; modifier ou supprimer un créneau ne touche à aucune séance enregistrée — ticket 009.
- Saisons : changer les dates est refusé si une inscription à l’un de ses groupes commencerait hors des nouvelles dates — ticket 006f.
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

### Modifié

- Sauvegarde : le dossier d'export est vidé au début de chaque export, sous le verrou commun, et plus à l'ouverture de l'écran (SEC-10) — ticket 014g.

### Sécurité

- Outillage : minimatch forcé en 11.0.9 sur la plage vulnérable (>= 7.0.0) par `overrides`, alerte Dependabot n° 2 levée ; garde-fou `scripts/minimatch.test.js` — ticket 017.

### Corrigé

- Fiche d’un membre : une sortie de champ juste après la frappe enregistre la nouvelle saisie, pas celle du rendu précédent — ticket 008b.


## [0.1.0] — [AAAA-MM-JJ]

- Première version publiée.
