# PRD — Ki&La (appel)

Statut : ✅ validé le 2026-11-26 · Révision 1 (EX-40 à EX-42, pages légales) validée le 2026-11-26

Ce document dit précisément ce que fait la v1. Il s'appuie sur `docs/CADRAGE.md` (validé le 2026-11-26), qui fait foi sur le périmètre et le vocabulaire : les mots en gras ci-dessous sont ceux du glossaire. Chaque exigence a un identifiant (`EX-xx`), rattaché à une fonctionnalité `F-xx`, cité dans le code, les tests et les tickets.

Priorité : toutes les exigences sont dans la v1 (décision du 2026-11-26). Le jalon de chacune sera fixé au plan de projet ; F-01 à F-03 forment le premier jalon.

## 1. Persona

**L'encadrant** : il anime un ou plusieurs **groupes** chaque semaine (club de sport d'abord, association, atelier). Il n'a aucun niveau technique. Il fait l'appel debout, d'une main, dans le bruit, souvent sans réseau. Il est seul sur son appareil, sans compte.

## 2. Parcours principaux

- **P1 — Première mise en route** : l'encadrant crée une **saison**, un **groupe**, ajoute des **membres** et un **créneau**, puis fait son premier **appel**.
- **P2 — L'appel du jour** : il ouvre l'appli, le créneau du moment est proposé, il marque les absents et les retards, enregistre. Moins de 30 secondes pour 20 membres.
- **P3 — L'appel interrompu** : il est dérangé, l'appli se ferme ; à la réouverture, son **brouillon d'appel** est là.
- **P4 — Le rattrapage** : il a oublié un appel ; l'historique le signale et il le fait après coup, ou corrige un appel passé.
- **P5 — L'urgence** : un membre se blesse ; il retrouve son **contact d'urgence** en quelques secondes.
- **P6 — Le suivi** : il voit qui décroche (**alertes d'assiduité**, statistiques) et sort un export pour le club.
- **P7 — Le changement de téléphone** : il exporte une **sauvegarde**, puis la restaure sur le nouvel appareil.

## 3. Exigences fonctionnelles

### F-01 — Saisons, groupes et membres

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-01 | Gérer les **saisons** | Créer, renommer, supprimer une saison (dates de début et de fin). Une seule saison est active ; en activer une autre désactive la précédente. Supprimer une saison efface ses groupes, créneaux, séances et présences, mais pas les membres, après une confirmation qui dit ce qui sera effacé. |
| EX-02 | Gérer les **groupes** d'une saison | Créer, renommer, **archiver**, **supprimer**. Un groupe archivé disparaît des écrans courants, son historique reste dans les statistiques. |
| EX-03 | Gérer les **membres** | Créer avec nom et prénom obligatoires ; date de naissance facultative, et l'interface dit qu'elle l'est. Modifier, **archiver**, **supprimer** (efface ses présences et contacts, après confirmation). Aucun autre champ personnel. |
| EX-04 | **Inscrire** un membre à un ou plusieurs groupes | L'**inscription** a une date de début et une date de fin facultative. Retirer un membre d'un groupe pose une date de fin sans effacer ses présences passées. |
| EX-05 | Gérer les **contacts d'urgence** | Zéro, un ou plusieurs par membre, chacun avec un nom (« sa mère ») et un téléphone obligatoires, dans un ordre choisi. Un appui sur le numéro lance l'appel téléphonique du système. |
| EX-06 | Retrouver un contact d'urgence vite | Depuis l'accueil, une recherche par nom ou prénom du membre affiche ses contacts en 2 appuis au plus après la saisie. |

### F-02 — Créneaux récurrents et appel

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-07 | Gérer les **créneaux** récurrents | Jour de la semaine, heure de début, durée, lieu facultatif, nom facultatif, groupe. Modifier ou supprimer un créneau ne modifie aucune **séance** déjà enregistrée. |
| EX-08 | Calculer les **séances** à la volée | Les séances d'un créneau ne sont pas créées d'avance : une séance n'existe en base qu'une fois son appel enregistré. Un créneau ne réclame aucun appel pour les semaines antérieures à sa création. |
| EX-09 | Lancer l'**appel** | À l'ouverture, l'appli propose la séance du créneau en cours ou le plus proche du jour. La liste contient les membres inscrits au groupe à la date de la séance, triés par nom. |
| EX-10 | Saisir les **présences** | Tous les membres démarrent à Présent. Un appui sur un membre change son statut ; Absent et Retard s'obtiennent en 1 et 2 appuis au plus. Chaque statut a une couleur, **un libellé et une icône** (jamais la couleur seule). Un compteur affiche le nombre de présents. |
| EX-11 | Trouver un membre dans l'appel | Au-delà de 20 membres, un champ de recherche filtre la liste. |
| EX-12 | Ajouter un membre pendant l'appel | Un nouveau membre peut être créé et inscrit au groupe sans quitter l'appel. |
| EX-13 | Commenter la séance | Un commentaire libre facultatif, au niveau de la séance uniquement (ABS-03). |
| EX-14 | Conserver le **brouillon d'appel** | Chaque changement est conservé aussitôt. Après une fermeture forcée de l'appli ou un redémarrage de l'appareil, l'appel est retrouvé tel quel à la réouverture. Le brouillon disparaît à l'enregistrement ou si l'encadrant l'abandonne explicitement. |
| EX-39 | Faire l'appel sans créneau | L'encadrant choisit un groupe et une date ; la séance enregistrée n'est rattachée à aucun créneau et compte comme les autres. |
| EX-15 | Enregistrer l'appel | Un appui enregistre la séance et ses présences, puis affiche une confirmation. |

### F-03 — Historique et sauvegarde

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-16 | Consulter l'**historique** | Liste des séances enregistrées, la plus récente en haut, avec date, groupe et nombre de présents ; filtre par groupe et par période. |
| EX-17 | Signaler les appels manquants | Les séances passées d'un créneau sans appel apparaissent dans l'historique et sur l'accueil, et s'ouvrent sur un appel à faire. |
| EX-18 | Corriger ou supprimer un appel passé | Modifier les statuts et le commentaire d'une séance enregistrée ; supprimer une séance après confirmation. |
| EX-19 | Exporter une **sauvegarde** | Un fichier unique contenant toutes les données, enregistré ou partagé là où l'encadrant le choisit (sélecteur du système). Avant l'export, l'écran dit ce que contient le fichier, qu'il n'est **pas protégé** et que sa garde revient à l'encadrant (ABS-06). |
| EX-20 | **Restaurer** une sauvegarde | Choisir un fichier ; l'appli vérifie qu'il est une sauvegarde valide avant de toucher à quoi que ce soit, dit qu'elle va remplacer toutes les données, demande confirmation, puis remplace. Un fichier invalide laisse les données intactes avec un message clair. |
| EX-21 | Rappeler de sauvegarder | Une invitation après le premier appel enregistré ; un bandeau si aucune sauvegarde depuis 30 jours. |
| EX-22 | Survivre à une base illisible | Si la base ne s'ouvre pas au démarrage : un écran propose de restaurer une sauvegarde ou de repartir de zéro. Jamais de plantage ni de message technique. |
| EX-23 | Tout effacer | Un réglage efface toutes les données de l'appareil, après une double confirmation. |
| EX-24 | **Purger** les anciennes saisons | Durée de conservation réglable, 3 saisons par défaut. Au-delà, l'appli propose la purge ; la saison active n'est jamais purgée. |

### F-04 — Alertes d'assiduité

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-25 | Lever une **alerte d'assiduité** | Un membre dont la **série d'absences** atteint le seuil (3 par défaut, réglable) apparaît sur l'accueil. |
| EX-26 | Traiter une alerte | « Marquer comme traitée » la retire ; elle réapparaît si la série s'allonge ensuite. |

### F-05 — Statistiques simples

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-27 | **Taux de présence** par groupe et par membre | Sur une période choisie (saison, mois, dates libres), avec le détail par statut. Une présence compte pour le groupe du membre à la date de la séance. |

### F-06 — Relance

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-28 | Envoyer une **relance** | Notification locale si aucun appel n'est enregistré X minutes après le début d'un créneau (30 par défaut, réglable, désactivable). Elle nomme le groupe, jamais un membre (ABS-04). |
| EX-29 | Demander la permission au bon moment | La permission de notification n'est demandée qu'à l'activation de la relance. Le réglage affiche l'état effectif (préférence et permission du système). |

### F-07 à F-14

| ID | F | Exigence | Critères d'acceptation |
| --- | --- | --- | --- |
| EX-30 | F-07 | Importer des membres depuis un CSV | Colonnes nom et prénom obligatoires ; date de naissance, téléphone d'urgence et groupe facultatifs. Aperçu avant toute écriture ; lignes invalides signalées ; doublons (nom, prénom, date de naissance) repérés, avec le choix de les ignorer. Toute autre colonne est ignorée. |
| EX-31 | F-08 | Exporter les présences en CSV | Une ligne par séance et par membre (date, créneau, groupe, nom, prénom, statut), sur une période et un groupe choisis ; partage par le sélecteur du système. |
| EX-32 | F-09 | Produire un rapport PDF | Format A4 : synthèse de la période, puis taux par groupe et par membre ; partage par le sélecteur du système. |
| EX-33 | F-10 | Gérer les créneaux ponctuels | Un créneau sans jour de semaine, avec une ou plusieurs dates. Il réclame un appel pour chacune de ses dates passées. |
| EX-34 | F-11 | Réunir plusieurs groupes dans un créneau | Un créneau peut avoir plusieurs groupes ; l'appel liste les membres de tous ses groupes ; chaque présence compte pour le groupe du membre. |
| EX-35 | F-12 | Afficher la frise des séances | Sur l'accueil, les séances passées et à venir, chacune marquée faite, manquante ou à venir ; un appui ouvre l'appel ou la séance. |
| EX-36 | F-13 | **Préparer** une séance à venir (7 jours glissants) | Ouvrir l'appel d'une séance qui n'a pas commencé la prépare : seuls deux statuts sont proposés, affichés « Attendu » et « Excusé » (« Attendu » est enregistré comme Présent, il n'y a pas de cinquième statut). Une séance préparée n'est comptée nulle part (statistiques, historique, appel fait) et la relance part quand même. Le jour venu, la préparation est reprise telle quelle et il ne reste qu'à l'enregistrer. |
| EX-38 | F-13 | **Annuler** une séance | « Que s'est-il passé ? », trois issues : « La séance a été annulée » (séance **annulée**), « Aucune séance prévue ce jour-là » (séance **non planifiée** : vacances, salle fermée), « Garder la séance ». Annulée et non planifiée : aucune relance, rien dans les statistiques, distinguées dans l'historique, et rétablissables (une préparation revient intacte). Possible tant que la séance n'a pas commencé, appel enregistré ou non ; impossible une fois la séance commencée et l'appel enregistré, refusé aussi par la base. |
| EX-37 | F-14 | Afficher le podium d'un groupe | Classement des membres d'un groupe par taux de présence sur la période, ex æquo au même rang. |

### Transverse — pages légales (révision 1 du 2026-11-26)

| ID | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EX-40 | Consulter la politique de confidentialité | Accessible depuis Paramètres, lisible hors ligne dans l'appli ; même texte que la version en ligne exigée par les stores. Contenu : document de conformité. |
| EX-41 | Consulter les conditions d'utilisation | Accessible depuis Paramètres, lisible hors ligne ; dit notamment que les données ne vivent que sur l'appareil et que la sauvegarde est le seul moyen de les retrouver. |
| EX-42 | Consulter les licences tierces | Accessible depuis Paramètres, hors ligne : chaque bibliothèque, police et ressource redistribuée, avec sa licence et sa mention obligatoire. |

## 4. Règles métier

- **RM-01** Taux de présence = (Présent + Retard) / (Présent + Retard + Absent). Excusé n'entre pas dans le calcul. Sans séance, le taux s'affiche « — » et non 0 %.
- **RM-02** Série d'absences : seules les séances enregistrées comptent, dans l'ordre des dates. Absent l'allonge ; Excusé l'interrompt sans la remettre à zéro ; Présent ou Retard la remet à zéro.
- **RM-03** Une présence compte pour le groupe auquel le membre était inscrit à la date de la séance.
- **RM-04** Les dates sont stockées en `AAAA-MM-JJ` et affichées en `JJ/MM/AAAA`.
- **RM-05** Une seule séance par créneau et par date.
- **RM-06** Une saison se termine par défaut le 31 juillet.

## 5. Exigences non fonctionnelles

| ID | Exigence | Mesure |
| --- | --- | --- |
| NF-01 | Rapidité de l'appel | 20 membres, de l'ouverture à l'enregistrement, en moins de 30 s sur un téléphone réel |
| NF-02 | Hors ligne | Toutes les fonctionnalités marchent en mode avion ; aucune requête réseau (ABS-01) |
| NF-03 | Confidentialité | Permission INTERNET absente du binaire Android de production ; déclarations « aucune donnée collectée » |
| NF-04 | Fiabilité des données | Aucun appel perdu (EX-14) ; cycle sauvegarde → effacement → restauration identique sur Android réel |
| NF-05 | Plateformes | Android et iOS, téléphone et tablette, en portrait seulement |
| NF-06 | Accessibilité | Statuts jamais distingués par la seule couleur ; zones d'appui d'au moins 44 × 44 points ; textes lisibles avec la taille de police agrandie du système |
| NF-07 | Langue | Français seul ; tous les libellés dans un seul fichier |
| NF-08 | Volume | Fluide avec 500 membres et 3 saisons d'historique |

## 6. Indicateurs de succès

Aucune mesure d'usage dans l'appli (ABS-01). Les indicateurs viennent des consoles des stores (installations, notes) et des retours des encadrants testeurs pendant la bêta.

## 7. Exclusions définitives

Serveur, compte, synchronisation, chiffrement dans l'appli, verrouillage à l'ouverture, données de santé, commentaire au niveau d'un membre, courriel et photo des membres : voir « Hors périmètre » du cadrage.

## 8. Écarts relevés

- 2026-11-26 : les maquettes affichaient des pages légales (Confidentialité, Conditions, Licences) sans exigence au PRD. Ajout d'EX-40 à EX-42, révision 1 validée par le porteur.
- 2026-11-26 : EX-36 et EX-38 introduisaient des notions absentes du glossaire : **séance enregistrée**, **préparée**, **annulée**, **non planifiée** et le libellé « Attendu ». Ajoutées au glossaire du cadrage, révision validée par le porteur le 2026-11-26.

## 9. Questions ouvertes

~~Ordre des statuts au fil des appuis (EX-10)~~ : Présent → Absent → Retard → Excusé, tranché dans `design/CHARTE.md` le 2026-11-26.
- Contenu exact du rapport PDF (EX-32). (→ ticket F-09)

## Décisions du porteur

- 2026-11-26 : EX-09 (créneau en cours ou le plus proche), EX-36 et EX-38 (version de l'ancienne appli), RM-01, RM-06, EX-21, EX-23, EX-06, NF-06 et NF-08 validés tels que proposés. EX-17 et EX-33 gardés ; tablette en portrait seul (NF-05) ; appel sans créneau ajouté (EX-39).
