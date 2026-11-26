# Cadrage — Ki&La (appel)

Statut : ✅ validé le 2026-11-26 · Révision du glossaire (5 entrées « séance … » et « Attendu ») validée le 2026-11-26

Mois : 2026-11 · App n°1 · Origine de l'idée : moi

Niveau de méthode : **renforcé** (publication sur les stores, données de mineurs), décision du porteur du 2026-11-26.

À remplir avant le design et le code. Ce document fait foi sur le périmètre.

L'ancienne version (Expo, publiée en test sur Google Play et TestFlight) sert de référence fonctionnelle uniquement : aucun code n'en est repris.

## Le besoin

L'encadrant arrive en salle, ouvre l'appli et fait l'appel en moins de 30 secondes, debout, d'une main, dans le bruit. Aujourd'hui, c'est une feuille papier ou un tableur qu'on ne remplit pas, et on ne sait pas qui décroche.

## L'utilisateur

- **Qui** : tout encadrant d'un groupe qui se réunit régulièrement (club de sport d'abord, mais aussi association, atelier, périscolaire), seul utilisateur de son appareil, sans compte.
- **Contexte d'usage** : téléphone ou tablette, Android ou iPhone/iPad, en salle, sans réseau garanti. L'appli n'émet aucune requête réseau.
- **Niveau technique** : aucun. Il ne doit jamais avoir besoin d'un terme technique pour se servir de l'appli.

## Ce que l'app fait (v1)

Chaque fonctionnalité a un identifiant, cité dans le code, le nom des tests et les tickets. Toute la liste fait partie de la v1 (décision du 2026-11-26), construite **jalon par jalon** avec un prétest sur appareil à la fin de chacun. F-01 à F-03 forment le premier jalon. La numérotation de F-04 à F-14 ne fixe pas l'ordre des jalons suivants, qui sera décidé au plan de projet.

- **F-01** — Saisons, groupes et membres : une saison active à la fois, groupes rattachés à une saison, membres qui traversent les saisons, inscription d'un membre à un groupe, contacts d'urgence (plusieurs par membre) avec une recherche rapide, archivage, suppression réelle.
- **F-02** — Créneaux récurrents et appel : créneau hebdomadaire (jour, heure, durée, lieu, groupe) ; appel en 4 statuts (Présent, Absent, Retard, Excusé), tous à Présent au départ ; brouillon conservé si l'appel est interrompu, y compris si l'appli est fermée.
- **F-03** — Historique et sauvegarde : liste des appels passés, correction et suppression, appels manquants signalés ; sauvegarde complète exportée par l'encadrant, et restauration.
- **F-04** — Alertes d'assiduité : N absences consécutives non excusées (3 par défaut, réglable), à marquer comme traitées.
- **F-05** — Statistiques simples : taux de présence par groupe et par membre, sur une période.
- **F-06** — Relance : notification locale si aucun appel n'est enregistré X minutes après le début d'un créneau (30 par défaut, réglable, désactivable).
- **F-07** — Import CSV des membres, avec aperçu avant import et repérage des doublons.
- **F-08** — Export CSV des présences.
- **F-09** — Rapport PDF des statistiques.
- **F-10** — Créneaux ponctuels (stage, rattrapage) : une ou plusieurs dates.
- **F-11** — Créneaux à plusieurs groupes : un seul appel quand plusieurs groupes se réunissent ensemble.
- **F-12** — Frise des séances sur l'accueil (passées et à venir).
- **F-13** — Préparer un appel à l'avance ; annuler une séance.
- **F-14** — Podium : classement d'assiduité des membres d'un groupe.

## Hors périmètre

- Import des membres par photo de la liste : noté dans `docs/IDEES.md` (décision du 2026-11-26).
- Chiffrement dans l'appli (base ou sauvegarde) : la protection est celle du système (iOS Data Protection, Android File-Based Encryption). Motif repris de l'ancienne version : un chiffrement maison impose une déclaration à l'ANSSI et une déclaration d'export côté Apple. Décision reconduite le 2026-11-26.
- Toute donnée de santé, et tout commentaire libre au niveau d'une personne (il se remplirait de motifs médicaux, donc de données de santé, article 9 du RGPD).
- Courriel et photo des membres.
- Verrouillage de l'appli à l'ouverture : on s'en remet au verrouillage de l'appareil, pour ne pas ralentir l'appel (décision du 2026-11-26).
- Autre langue que le français : les libellés sont rassemblés dans un seul fichier pour pouvoir traduire plus tard (décision du 2026-11-26).
- Tout ce qui exige un serveur, un compte ou une synchronisation en ligne : deux encadrants d'un même club tiennent deux historiques distincts.

## Glossaire

Un mot par notion. Le terme du code (en anglais, décision du 2026-11-26) est le seul employé dans le code ; le terme français est le seul employé dans les textes, l'interface et les documents. Un nouveau terme s'ajoute ici avant d'apparaître dans le code.

| Terme | Définition | Terme du code | Mots à éviter |
| --- | --- | --- | --- |
| encadrant | La personne qui utilise l'appli et fait l'appel | `Instructor` | entraîneur, coach, professeur, utilisateur |
| membre | Une personne appelée. Elle n'appartient pas à une saison : elle les traverse | `Member` | adhérent, élève, participant, enfant |
| saison | L'année d'activité. Une seule est active à la fois ; elle regroupe les groupes, les inscriptions et les statistiques | `Season` | année, période |
| groupe | Ensemble de membres qui se réunissent ensemble, dans une saison | `Group` | équipe, classe, section |
| inscription | L'appartenance d'un membre à un groupe, avec une date de début et une date de fin | `Enrollment` | adhésion, affectation |
| créneau | Rendez-vous d'un ou plusieurs groupes : hebdomadaire (récurrent) ou à une ou plusieurs dates (ponctuel) | `Slot` | cours, horaire, plage |
| séance | Une occurrence datée d'un créneau. Elle n'existe en base qu'une fois l'appel enregistré | `Session` | cours, leçon, entraînement |
| séance enregistrée | Séance dont l'appel est enregistré ; la seule qui compte dans l'historique et les statistiques | `recorded` | séance validée, faite |
| séance préparée | Séance à venir dont l'appel est saisi d'avance (Attendu, Excusé) ; comptée nulle part | `prepared` | brouillon |
| séance annulée | Séance prévue qui n'a pas eu lieu ; rétablissable | `cancelled` | supprimée |
| séance non planifiée | Date proposée par un créneau mais absente du calendrier (vacances, salle fermée) ; rétablissable | `unscheduled` | annulée |
| Attendu | Libellé affiché pendant la préparation à la place de Présent ; enregistré comme Présent | `present` (affiché « Attendu ») | prévu |
| appel | L'action de relever les présences d'une séance, et son résultat | `RollCall` | pointage, relevé |
| brouillon d'appel | Un appel commencé et pas encore enregistré, conservé même si l'appli est fermée | `RollCallDraft` | appel en cours |
| présence | Le statut d'un membre à une séance : Présent, Absent, Retard ou Excusé | `Attendance` (`present`, `absent`, `late`, `excused`) | pointage |
| taux de présence | (Présent + Retard) / (Présent + Retard + Absent) ; Excusé ne compte pas | `attendanceRate` | assiduité (seul) |
| série d'absences | Nombre d'absences non excusées consécutives d'un membre ; Excusé l'interrompt, Présent ou Retard la remet à zéro | `absenceStreak` | |
| alerte d'assiduité | Signal qu'un membre a atteint le seuil de la série d'absences | `AttendanceAlert` | avertissement |
| contact d'urgence | Nom et téléphone d'une personne à prévenir pour un membre | `EmergencyContact` | responsable, parent |
| archiver | Retirer des écrans courants sans rien effacer de l'historique | `archive` | supprimer, masquer |
| supprimer | Effacer définitivement, présences comprises | `delete` | archiver |
| sauvegarde | Fichier contenant toutes les données, exporté par l'encadrant ; seul moyen de les récupérer | `Backup` | export (seul), copie |
| relance | Notification locale quand l'appel n'est pas fait à temps | `Reminder` | rappel, alerte |
| purge | Effacement des saisons plus anciennes que la durée de conservation | `purge` | nettoyage |

## Données manipulées

| Donnée | Personnelle ? | Sensible ? | Où est-elle stockée | Durée de conservation | Export / suppression |
| --- | --- | --- | --- | --- | --- |
| Nom et prénom d'un membre (obligatoires) | Oui, souvent d'un mineur | Non | Base locale de l'appareil | 3 saisons, réglable ; purge proposée, saison active jamais purgée | Sauvegarde, export CSV, rapport PDF ; suppression réelle du membre |
| Date de naissance d'un membre (facultative) | Oui | Non | Base locale | Idem | Idem |
| Contacts d'urgence : nom et téléphone (facultatifs, plusieurs par membre) | Oui, d'un tiers | Non | Base locale | Idem, supprimés avec le membre | Sauvegarde ; suppression avec le membre |
| Présences (statut par membre et par séance) | Oui | Non | Base locale | 3 saisons, réglable | Sauvegarde, export CSV, rapport PDF ; effacées avec le membre |
| Commentaire de séance (pas de membre) | Non, en principe | Non | Base locale | Idem | Sauvegarde |
| Saisons, groupes, créneaux, réglages | Non | Non | Base locale et préférences | Jusqu'à suppression | Sauvegarde |
| Sauvegarde exportée | Oui (tout ce qui précède) | Non | Là où l'encadrant la dépose ; **en clair**, avec avertissement à l'export | Sous la garde de l'encadrant | Hors de l'appli |

## Zones sensibles

Les parties du code où une erreur touche les données, la sécurité ou l'exactitude : `/security-review` et relecture du porteur **avant** la fusion.

- Sauvegarde, restauration et migrations du schéma de la base.
- Effacement : suppression d'un membre, d'une saison, purge, effacement de toutes les données.
- Import CSV et exports (CSV, PDF) : fichier extérieur lu, données de mineurs qui sortent de l'appareil (ajouté le 2026-11-26).
- Permissions et dépendances (règle « aucun réseau »), notifications (aucun nom de membre sur l'écran verrouillé), calculs affichés (taux de présence, séries d'absences, alertes).

## Plateforme et stack

- **Format** : application Android et iOS, téléphone et tablette, publiée sur Google Play et l'App Store.
- **Stack envisagée** : Expo + React Native + TypeScript, base SQLite locale. Pourquoi ce choix : un seul code pour les deux stores, et l'expérience de l'ancienne version (pièges déjà connus). Versions exactes vérifiées au premier ticket.
- **Publication** : nouvelle appli, avec un nouveau nom de paquet et des fiches de store neuves ; elle ne remplace pas l'ancienne version de Jita Vision et n'en reprend pas les données (décision du 2026-11-26). Nom de paquet exact à fixer avant le premier build.
- **Mode de CI** : par jalon (décision du 2026-11-26).

## Critères de réussite

- [ ] Un appel de 20 membres, de l'ouverture de l'appli à l'enregistrement, prend moins de 30 secondes, chronométré sur un téléphone réel.
- [ ] Fonctionne sur un appareil sans réseau ; aucune requête réseau, permission INTERNET absente du binaire Android de production.
- [ ] Un appel interrompu (appli fermée de force) est retrouvé intact à la réouverture.
- [ ] Le cycle sauvegarde → effacement de toutes les données → restauration redonne les mêmes données, sur un appareil Android réel (iOS vérifié sur simulateur seulement, décision du 2026-11-26).
- [ ] Audit de sécurité sans problème critique ou élevé non corrigé.
- [ ] Un encadrant non technique installe l'appli depuis le store et fait son premier appel seul.

## Risques identifiés

- **Dérive du périmètre** (14 fonctionnalités, comme l'ancienne version qui a enchaîné 8 migrations en 4 jours) — parade : jalons avec critère de sortie, prétest sur appareil à chaque fin de jalon, toute nouveauté passe par `docs/IDEES.md`.
- **Perte de données** (tout est local, la sauvegarde est le seul filet) — parade : sauvegarde en zone sensible, cycle complet testé sur appareil réel, rappel quand la dernière sauvegarde est ancienne.
- **Fuite de données de mineurs** (sauvegarde en clair, appareil sans code) — parade : minimisation des champs, avertissement net à l'export, aucun nom dans les journaux ni les notifications.
- **Refus ou retard sur les stores** (permissions apportées par des dépendances, politique de confidentialité, déclarations « aucune donnée collectée ») — parade : aucune dépendance installée avant la fonctionnalité qui l'utilise, permissions auditées sur le binaire construit, textes légaux tenus à jour dans le même lot que le code.

## Décisions du porteur

- 2026-11-26 : révision du glossaire, ajout de séance enregistrée, préparée, annulée, non planifiée et du libellé « Attendu » (suite au PRD, EX-36 et EX-38).
- 2026-11-26 : niveau renforcé ; dépôt public `une-app-par-mois/kila-appel` ; besoin, utilisateur, contexte et niveau technique ; périmètre F-01 à F-14 dans la v1, par jalons ; import par photo en boîte à idées ; Expo + React Native + TypeScript ; termes du code en anglais (glossaire validé tel quel) ; mode de CI par jalon ; pas de chiffrement dans l'appli ; données et conservation comme l'ancienne version ; zones sensibles ; critères de réussite (iOS sur simulateur) ; risques ; pas de verrouillage ; français seul ; nouvelle appli avec nouveau nom de paquet.

## Questions ouvertes

- Nom de paquet exact (Android et iOS) : avant le premier build.
- Usage de la marque Ki&La pour la nouvelle appli : à confirmer par le porteur avant la fiche de store.
