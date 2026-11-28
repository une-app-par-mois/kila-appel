# 030 — Campagne Maestro du jalon 2

Statut : fusionné dans le groupe (PR #86) · Jalon : 2 · Zone sensible : non (parcours de test, aucun code de l'appli) · Trivial : non

Dépend de : 022, 024, 025 (et 029 pour le dernier parcours) · Fichiers touchés : `.maestro/alerte-traitee.yaml` (nouveau), `.maestro/statistiques.yaml` (nouveau), `.maestro/relance-reglage.yaml` (nouveau), `src/__fixtures__/e2eBackup.ts`, `scripts/e2e/sauvegarde-fictive.test.ts`, `scripts/e2e.sh` — 6 fichiers

Découpé le 2026-11-27 (séance de découpage du jalon 2).

## Contexte

Parcours de bout en bout de fin de jalon (`docs/CONVENTIONS.md` §5.2), sur l'APK de la CI, comme le 016. Le critère de sortie du jalon (`docs/PLAN.md` §2) reste un prétest du porteur sur son téléphone ; la campagne en vérifie ce qui s'automatise.

## À lire

- Ticket 016 (décisions : émulateur seul, sauvegarde fictive générée, `--appareil-reel`) ; `docs/CONVENTIONS.md` §5.2 ; `docs/ARCHITECTURE.md` §8
- Tickets 022 à 025 (jeu fictif vérifié à la main du 023), 029
- `.maestro/`, `scripts/e2e.sh`, `src/__fixtures__/e2eBackup.ts`

## Ce qui change

- Sauvegarde fictive enrichie (ou seconde sauvegarde) : un membre à 3 absences de suite, et le jeu du 023 dont les taux sont écrits en clair dans le test.
- `alerte-traitee.yaml` : restauration de la sauvegarde fictive → alerte sur l'accueil → « Marquer comme traitée » → alerte disparue → appel avec une absence de plus → alerte revenue (EX-25, EX-26).
- `statistiques.yaml` : onglet Stats → taux de la saison et d'un groupe égaux aux valeurs du test → membre (EX-27, RM-01).
- `relance-reglage.yaml` : activer la relance → écran de permission → « Pas maintenant » → relance non activée (EX-29) ; la boîte du système n'est pas pilotée.

## Critères d'acceptation

- [ ] Les trois parcours verts sur l'émulateur, puis sur l'APK de la CI de la PR du jalon. (Émulateur : fait, 7/7 avec `volume-nf08` ; APK de la CI : à faire à la PR du jalon.)
- [x] Taux affichés égaux au tableau vérifié à la main (023).
- [x] Le parcours de la campagne du jalon 1 reste vert.

## Tests attendus

- `scripts/e2e/sauvegarde-fictive.test.ts` : contenu de la sauvegarde fictive (série, taux attendus).
- **À la main sur le téléphone** (critère de sortie, non automatisable) : relance reçue écran verrouillé, sans nom de membre ; appui → appel ; après redémarrage ; en mode avion.

## Hors périmètre

- La notification elle-même dans Maestro (écran verrouillé, volet du système) : vérifiée à la main.
- Parcours iOS (jalon 7).

## Questions prévues

- Aucune : mêmes réponses du porteur que le 016 (émulateur, sauvegarde fictive générée, A55 « non vérifié » s'il n'est pas disponible).

Reports de l'intégration du lot J2-1 (2026-11-27) :

- taux affiché avec l'espace insécable `NBSP` (U+00A0, constante exportée par `src/domain/attendanceRate.ts`) avant « % » : l'utiliser dans `getByText` (`64\u00a0%` ou `` `64${NBSP}%` ``) et dans les parcours Maestro ; un « 64 % » tapé avec une espace simple ne correspond pas (023).
- mesurer NF-08 sur l'appareil avec `volumeSeed` de `src/__fixtures__/statsSeed.ts` (variante `twoGroups` comprise) et le jeu de volume des alertes (`src/__fixtures__/alertsSeed.ts`) ; durées `node:sqlite` de référence dans la fiche du 023 (023, 021).

Reports de l'intégration du lot J2-2 (2026-11-27) :

- vérifier sur l'appareil le focus et le retour Android de l'écran d'alerte (`alertes/[id].tsx` : retour à l'accueil quand l'alerte n'est plus montrée, seulement avec le focus ; recherche d'urgence ouverte par-dessus) (022).
- vérifier sur l'appareil `router.dismissTo` de l'écran Période (`stats/periode.tsx`) : un retour ne rouvre pas l'écran Période, la barre d'onglets revient (024).

## Décisions

| Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- |
| Relance dans Maestro | Piloter le volet des notifications ; vérifier à la main | À la main, comme le demande le critère de sortie | Volet du système fragile selon la version d'Android ; le critère exige le téléphone réel | remplacée par la décision du porteur du 2026-11-27 (dialogue de permission piloté, ligne suivante) ; la notification elle-même reste vérifiée à la main |
| Appareil de la campagne | Émulateur ; A55 | Émulateur seul (`emulator-5554`), jamais `--appareil-reel` ; A55 « non vérifié » | Séance de lancement du lot | décidée par le porteur le 2026-11-27 |
| Dialogue de permission du système | Le piloter ; s'arrêter à « Pas maintenant » | Piloté par Maestro (`com.android.permissioncontroller:id/permission_allow_button` et `permission_deny_button`), trois cas : « Pas maintenant » (interrupteur éteint, ligne « Désactivée ») ; « Continuer » puis « Autoriser » (« Activée · 30 min ») ; « Continuer » puis « Ne pas autoriser » (bandeau « refusées »). Pas de relance réelle | Remplace « la boîte du système n'est pas pilotée » de « Ce qui change ». Maestro 2.12 accorde toutes les permissions à `launchApp` par défaut (doc de `launchApp` : « By default, all permissions are allowed ») : `permissions: { notifications: unset }`. EX-29 : aucun dialogue du système au lancement ni avant l'écran « Autoriser les notifications ? », vérifié par `assertNotVisible` de l'identifiant | décidée par le porteur le 2026-11-27 |
| NF-08 dans la campagne | Durées relevées sans seuil ; seuil | Sauvegarde de volume générée depuis `volumeSeed` (jamais versionnée), restaurée, durées de l'accueil (alertes) et de l'onglet Stats relevées dans `volume-nf08.yaml`, sans seuil | Le porteur juge à l'œil sur l'A55 au prétest | décidée par le porteur le 2026-11-27 |
| Sauvegardes de la campagne | Une enrichie ; une par parcours | Une par parcours, toutes écrites par `e2eBackup.ts` (`E2E_FILES`) ; celle du jalon 1 inchangée | Chaque parcours garde ses chiffres sans dépendre des autres | à relire |
| Jeu des statistiques | `statsSeed` tel quel ; jeu propre | `statsSeed` exporté tel quel ; taux du 023 écrits en clair (saison 87 %, Poussins 88 %, Benjamins 78 %, Hugo Moreau 64 %), période « Saison » seule ; `"\u00a0"` dans des chaînes YAML entre guillemets doubles | Un seul tableau vérifié à la main | à relire |
| Jeu de l'alerte | Membre du jeu du 023 ; petit groupe | « Minimes jeudi » : Rémi Exemple absent à J-14, J-10, J-7 du jour de l'appareil, Inès Fictif présente ; seuil par défaut 3 | Indépendant de la date du jeu du 023 | à relire |
| Retour Android de l'écran d'alerte | Retour sur l'accueil après le traitement ; retour sans traiter aussi | Les deux : un retour Android sans traiter ramène à l'accueil, l'alerte toujours là ; « Marquer comme traitée » ramène à l'accueil, l'alerte disparue. Pas de retour Android depuis l'accueil (il quitterait l'appli) | Couvre le report du 022 (focus, retour) sans dépendre du lanceur | à relire |
| Retour après l'écran Période | — | « Appliquer », puis retour Android : l'écran Période ne revient pas (`dismissTo`) | Report du 024 | à relire |
| Jour de l'appareil hors du jeu du 023 | Refus de toute la campagne ; sauvegarde des statistiques seule absente ; `statsSeed` décalé à partir du jour | Avant le 2026-11-25 (dernière séance du jeu) ou après le 2027-07-31 (fin de sa saison), seule la sauvegarde des statistiques n'est pas écrite ; `e2e.sh` affiche un avertissement et ne joue pas le parcours `statistiques` (tag `statistiques`, `--exclude-tags`) ; les autres sauvegardes et parcours, jalon 1 compris, tournent à n'importe quelle date. `writeStatsBackup` appelé seul refuse toujours, message clair | Le décalage n'est pas simple et sûr : il faudrait décaler aussi la saison (« Saison 2026-2027 », 1er septembre au 31 juillet, validée à la restauration), les inscriptions, les archivages et les jours de la semaine, et revérifier le tableau du 023 ; le jeu vérifié à la main resterait alors à revérifier | changée après contradiction |
| Nom du fichier dans le sélecteur | Paramètre de `runFlow` ; un sélecteur par fichier | `FICHIER` en paramètre de `runFlow`, défaut `kila-e2e-sauvegarde-fictive.db` posé en script (`typeof FICHIER === 'undefined'`) | Essayé sur Maestro 2.12 : un `env` d'en-tête du sous-parcours écrase la valeur passée par `runFlow` | à relire |
| Ordre et départ des parcours | — | Après ceux du jalon 1 (`flowsOrder`), chacun part d'un `clearState` ; restauration commune dans `sous-parcours/restaurer.yaml` (`FICHIER`, `RESUME`) | Mêmes règles que le 016 | à relire |
| Variante « Ne pas autoriser » | Parcours à part ; même parcours | Même parcours `relance-reglage.yaml`, après un second `launchApp` avec `clearState` | Un refus ne se défait pas sans effacer l'appli ; un fichier de moins | à relire |
| Mesure de l'accueil (NF-08) | Après la restauration ; lancement à froid | Du lancement à froid (`stopApp`, puis `launchApp` sans effacer) jusqu'à la section « Alertes d'assiduité » ; Stats : de l'appui sur l'onglet jusqu'au taux | L'accueil est déjà monté après la restauration ; le lancement à froid est ce que voit l'encadrant | à relire |
| Taille du ticket | Découper ; garder | Gardé : 14 fichiers (au lieu de 6 prévus) — 4 parcours et 2 sous-parcours de plus que prévu (restauration commune, ouverture du réglage, volume), le second fichier de test, le `.mjs`, la configuration, le README et cette fiche | Tous des fichiers de test ou d'outillage, une seule session | décidée par le porteur le 2026-11-27 : gardé entier à 14 fichiers |
| État de l'interrupteur de la relance (revue) | `checked` sur le libellé ; `testID` sur le `Switch` ; ligne « Relance » de Paramètres | Ligne de Paramètres : « Relance, Désactivée », « Relance, Activée · 30 min », « Relance, Refusée par le téléphone » | `checked: false` trouvait le titre (un texte, jamais coché) : toujours vrai. Un `testID` serait du code de l'appli en zone sensible. Contrôle vérifié en l'inversant une fois (« Désactivée » attendue après « Autoriser ») : le parcours échoue | à relire |
| Chiffres de la synthèse des statistiques (revue) | Texte seul ; `childOf` ou `containsDescendants` de la carte ; position | Position : « 87 % » sous « Taux de présence », « 21 » sous « Séances », tous deux au-dessus de « Par groupe » | Les cartes `stats-rate` et `stats-sessions` n'ont aucun descendant dans la hiérarchie d'Android (vue aplatie) : `childOf` et `containsDescendants` échouent même quand le chiffre est affiché (essayés). Contrôle vérifié en attendant 88 % une fois : échec | à relire |
| Séances après le jour dans la sauvegarde de volume (revue) | `volumeSeed` tel quel ; séances arrêtées au jour | Les séances datées après le jour de l'appareil sont retirées (présences et liens compris) : 930 séances le 2026-11-27 (130 de la saison active, 800 des deux passées) au lieu de 1 200 ; le résumé attendu dans le parcours ne fixe plus ce nombre | L'appli n'enregistre jamais de séance future ; la mesure ne dépend plus de séances qui ne peuvent pas exister | à relire |
| Version d'Android de l'émulateur (revue) | README seul ; README et contrôle | README (API 33 ou plus) et contrôle de `ro.build.version.sdk` par `e2e.sh`, refus en dessous | La permission de notification ne se demande qu'à partir d'Android 13 : le parcours de la relance échouerait sans dire pourquoi | à relire |

## Questions pour le porteur

- **Taille du ticket** (répondue le 2026-11-27 : gardé entier à 14 fichiers) : 14 fichiers au lieu des 6 prévus, au-delà de la limite de 10. Options : 1) garder le ticket en un seul morceau (recommandé : tous des fichiers de test ou d'outillage, faits en une session, déjà relus) ; 2) le découper après coup (sauvegardes et générateur, puis parcours).

## À reporter

- CHANGELOG : « Tests : campagne Maestro du jalon 2 (`.maestro/`) : alerte traitée puis revenue après une absence de plus, statistiques du jeu vérifié à la main du 023 (période « Saison »), réglage de la relance avec le dialogue de permission du système (pas maintenant, autoriser, refuser), durées indicatives de NF-08 sur une sauvegarde de volume ; une sauvegarde fictive par parcours, générée à chaque lancement (ticket 030). »
- Architecture : §8, ligne « Bout en bout » : quatre parcours du jalon 2 (`alerte-traitee`, `statistiques`, `relance-reglage`, `volume-nf08`) après ceux du jalon 1 ; `src/__fixtures__/e2eBackup.ts` écrit une sauvegarde fictive par parcours (`E2E_FILES` : jalon 1, alerte, `statsSeed`, `volumeSeed`), jamais versionnée ; hors du 2026-11-25 au 2027-07-31, la sauvegarde des statistiques n'est pas écrite et `e2e.sh` ne joue pas le parcours `statistiques` (avertissement) ; la sauvegarde de volume s'arrête au jour de l'appareil ; `e2e.sh` exige Android API 33 ou plus ; le dialogue de permission du système est piloté (`launchApp` avec `notifications: unset`).
- README : section « Tests de bout en bout » mise à jour dans ce ticket (parcours du jalon 2, date de l'appareil, émulateur API 33 ou plus).
- Critères d'acceptation (à cocher à l'intégration) : trois parcours prévus verts sur l'émulateur, plus `volume-nf08` ; taux affichés égaux au tableau du 023 (87 %, 88 %, 78 %, 64 %) ; campagne du jalon 1 verte. Reste : la campagne sur l'APK de la CI de la PR du jalon.
- Résultats (2026-11-27, émulateur `emulator-5554`, `Medium_Phone_API_36.1`, Android 16 / API 36, écran 320 × 640 imposé ; APK de version construit en local depuis `0e0fe96` plus ce ticket, `app-release.apk`, sha256 `dd708dd2639e5529…`) :
  - passage 1 : 6 parcours sur 7 verts ; `statistiques` en échec à cause du parcours lui-même (`childOf: stats-rate` ne trouve pas le texte, imbriqué plus bas dans la carte ; lignes des groupes hors de l'écran ; « Dates… » hors de l'écran au retour) : corrigé, puis `statistiques` seul vert ;
  - passage 2 : **7/7 verts**, `exit 0`, 15 min 48 s ; appel de 20 membres en 24,2 s ;
  - passage 3 : **7/7 verts**, `exit 0`, 15 min 44 s ; appel de 20 membres en 25,1 s ;
  - **NF-08, à titre indicatif, sans seuil** (500 membres, 3 saisons, 1 200 séances, 60 000 présences ; durées avec le temps propre de Maestro) : accueil (section des alertes) après un lancement à froid **1,57 s** (passage 1), **1,61 s** (passage 2), **1,58 s** (passage 3) ; onglet Stats, de l'appui au taux **3,12 s** (passage 1), **2,68 s** (passage 2), **2,64 s** (passage 3). Durées `node:sqlite` de référence dans la fiche du 023.
  - après les corrections de revue (interrupteur lu sur la ligne de Paramètres, chiffres de la synthèse par position, volume arrêté au jour, exclusion du parcours `statistiques` hors dates, contrôle de l'API), même APK (aucun code de l'appli changé), jour de l'appareil 2026-11-27 : campagne complète **7/7 verte**, `exit 0`, 15 min 40 s ; appel de 20 membres en 25,4 s ; puis `relance-reglage` et `statistiques` rejoués seuls : 2/2 verts. **NF-08 sur la sauvegarde arrêtée au jour (930 séances, 500 membres)** : accueil après un lancement à froid **1,07 s**, onglet Stats **2,95 s** (les durées ci-dessus portaient sur 1 200 séances, dont 270 futures) ;
  - instabilités : aucune sur les parcours corrigés ; l'écran Période ne revient pas après un retour (`dismissTo`, 024) ; le retour Android de l'écran d'alerte ramène à l'accueil (022) ; aucun dialogue du système avant l'écran « Autoriser les notifications ? » (EX-29).
- Non vérifié :
  - A55 (décision du porteur : émulateur seul) ; `--appareil-reel` jamais lancé ; campagne sur l'artefact APK de la CI de la PR du jalon (`./scripts/e2e.sh <apk de la CI>`, par l'IA principale) ;
  - relance réellement reçue (écran verrouillé, appui, redémarrage, mode avion) : à la main sur le téléphone ;
  - dialogue de permission fermé sans réponse ; retour Android pendant la demande ; « Ouvrir les réglages du téléphone » ;
  - périodes « Ce mois » et dates libres des statistiques (seulement « Saison », comme décidé) ; TalkBack, textes agrandis, tablette ;
  - la campagne avec un émulateur réglé hors du 2026-11-25 au 2027-07-31 (parcours `statistiques` exclu) : vérifié par les tests et par le générateur lancé à la main au 2027-08-15, pas par une campagne ;
  - le refus d'`e2e.sh` sur un émulateur sous l'API 33 (aucun disponible).
