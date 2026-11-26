# Conformité — Ki&La (appel)

Statut : ✅ validé le 2026-11-26

Données personnelles, règles des stores, droit de l'UE, licences, et liste des actions avant le lancement. Sources officielles consultées le 2026-11-26 (§9) ; ce document n'est pas un avis juridique.

## 1. Décisions qui encadrent ce document

- Publication sous les **comptes développeur Jita Vision** ; nom **Ki&La** conservé ; politique de confidentialité hébergée sur **GitHub Pages** du dépôt (décisions du porteur du 2026-11-26).
- Aucune donnée ne quitte l'appareil, sauf par un fichier que l'encadrant exporte et destine lui-même (ABS-01, ABS-02).
- Pas de chiffrement applicatif (ADR-005).

## 2. Données personnelles (RGPD)

### 2.1 Qui est responsable de traitement

- **L'éditeur (Jita Vision) n'est pas responsable de traitement.** La CNIL : l'éditeur l'est « dès lors qu'il ne se contente pas de fournir le logiciel au public mais participe à son exploitation (par exemple, des transferts de données entre le terminal de l'utilisateur et ses serveurs) » ; ici, aucun transfert, aucun accès aux données.
- **Le responsable est celui qui utilise l'appli pour son activité** : en principe le club ou l'association (« la personne morale […] incarnée par son représentant légal », CNIL, sport amateur) ; un encadrant indépendant est lui-même responsable.
- Conséquence : les obligations de notification de violation (art. 33 et 34) reposent sur le club ou l'encadrant, pas sur l'éditeur. Cela confirme l'hypothèse du §6 de `docs/SECURITE.md`.
- Point de vigilance : les lignes directrices 07/2020 du CEPD (§ 67) évoquent une décision conjointe sur les moyens quand une entité utilise l'outil d'une autre ; risque très atténué ici (aucun accès, aucune influence de l'éditeur), mais non écarté par un texte.

### 2.2 Ce que l'appli fait pour aider le responsable

| Obligation du club ou de l'encadrant | Ce que fait l'appli |
| --- | --- |
| Minimisation | Nom et prénom seuls obligatoires ; aucun champ de santé ni commentaire par membre (ABS-03) |
| Durée de conservation (CNIL, sport amateur : 3 ans au plus après la fin de l'adhésion) | Conservation réglable, 3 saisons par défaut, purge (EX-24) |
| Droit d'accès d'une famille | Export CSV filtrable (EX-31) |
| Droit de rectification | Fiche membre modifiable (EX-03) |
| Droit à l'effacement | Suppression réelle d'un membre et de ses présences (ABS-05, EX-03) |
| Sécurité | Données dans l'espace privé de l'appli ; avertissement à chaque sortie de données (SEC-09) |
| Information des familles | Modèle de mention d'information à copier par le club, publié sur GitHub Pages (décision du 2026-11-26) ; rien dans l'appli |

### 2.3 Données de mineurs

Les mineurs n'utilisent pas l'appli : la règle du consentement parental en dessous de 15 ans (recommandation CNIL n° 4, art. 45 de la loi Informatique et Libertés) vise les mineurs qui utilisent eux-mêmes un service ; elle ne s'applique pas directement. L'information se fait auprès du représentant légal, par le club.

## 3. Google Play

| Sujet | Règle (source §9) | Ce que fait Ki&La |
| --- | --- | --- |
| Sécurité des données | « "Collect" means transmitting data from your app off a user's device » ; le traitement local n'est pas de la collecte ; le formulaire reste obligatoire même sans collecte | Formulaire rempli : **aucune donnée collectée ni partagée** |
| Export par le partage système | Un transfert « based on a specific user-initiated action » n'est pas un partage à déclarer ; mais le « transfert vers une autre appli sur l'appareil » est cité comme partage | Interprétation retenue (décision du 2026-11-26) : l'export choisi à chaque fois par l'encadrant relève de l'exemption ; la politique de confidentialité le décrit explicitement |
| Politique de confidentialité | Obligatoire même sans collecte, sur la fiche **et dans l'appli** ; URL publique en https, page web (pas un PDF) | GitHub Pages + écran EX-40, même texte |
| Suppression de compte | Ne vise que les applis qui permettent de créer un compte | Sans objet ; « Tout effacer » existe quand même (EX-23) |
| Public cible | Déclaré par tranches d'âge ; la politique Familles s'applique dès qu'une tranche inclut des enfants ; Google peut contrôler la cohérence avec la fiche | **16 ans et plus** (tranches 16-17 et 18+, décision du 2026-11-26, pour inclure de jeunes animateurs) ; fiche et visuels sans élément qui attire les enfants. À vérifier dans la console : que la tranche 16-17 ne déclenche pas la politique Familles |
| Permissions | Au strict nécessaire | Audit sur le binaire (SEC-02) |

## 4. App Store

| Sujet | Règle (source §9) | Ce que fait Ki&La |
| --- | --- | --- |
| App Privacy | « Data that is processed only on device is not "collected" » | **« No, we do not collect data from this app »** |
| Politique de confidentialité | URL obligatoire pour toutes les applis ; lien dans l'appli (5.1.1(i)) | GitHub Pages + écran EX-40 |
| Suppression de compte (5.1.1(v)) | Seulement si l'appli permet de créer un compte | Sans objet |
| Classification d'âge | Calculée par Apple d'après le questionnaire, à remplir honnêtement (2.3.6) | Questionnaire rempli sans contenu sensible ; catégorie Kids non demandée |
| Données d'enfants (5.1.4) | Prudence avec les données de mineurs | Minimisation, aucune transmission |
| Chiffrement | `ITSAppUsesNonExemptEncryption` = NO si l'appli, bibliothèques comprises, n'utilise aucun chiffrement ou seulement un chiffrement exempté | NO ; vérifier qu'aucune dépendance n'embarque de chiffrement (audit du binaire) |

## 5. Union européenne : statut de commerçant (DSA)

Apple et Google demandent de déclarer si l'éditeur est un **commerçant** (*trader*) ; Google exige cette déclaration **avant le 1er février 2027**.

- Commerçant : coordonnées publiées sur la fiche (adresse, téléphone, courriel).
- Non-commerçant (activité sans but lucratif, hors activité professionnelle) : aucune coordonnée publiée, et les consommateurs de l'UE sont informés que le droit de la consommation ne s'applique pas.
- Critères cités : recherche de profit, volume, organisation professionnelle, statut juridique, assujettissement à la TVA, lien avec une activité professionnelle. Une fausse déclaration peut entraîner la suspension du compte.
- **Jita Vision se déclare commerçant** (décision du 2026-11-26) : adresse, téléphone et courriel de Jita Vision publiés sur les deux fiches ; le droit de la consommation de l'UE s'applique (gratuité : pas de droit de rétractation à gérer, mais information exacte de la fiche).

## 6. Chiffrement et ANSSI

« L'utilisation des moyens de cryptologie est libre » ; seules la fourniture, le transfert ou l'importation d'un moyen de cryptologie imposent une déclaration (loi n° 2004-575, art. 30). Ki&La ne met en œuvre aucun chiffrement : **rien à déclarer**. Toute évolution qui chiffrerait (sauvegarde protégée par mot de passe, par exemple) rouvre la question avant le code (ABS-06).

## 7. Licences

- **Code du dépôt** : MIT (fichier `LICENSE`).
- **Licences acceptées pour une dépendance** : MIT, ISC, BSD, Apache-2.0 ; **polices** : SIL OFL 1.1. **Refusées sans décision du porteur** : GPL, LGPL, AGPL, SSPL et toute licence copyleft.
- **Registre** : la liste des licences embarquées est générée depuis les dépendances réellement présentes dans le build et affichée dans l'appli (EX-42) ; elle est mise à jour dans le même ticket que toute nouvelle dépendance, police ou ressource.
- Polices IBM Plex : fichier de licence OFL livré à côté des `.ttf` (ADR-001).

## 8. Actions avant le lancement

| Action | Qui | Quand |
| --- | --- | --- |
| Déclarer Jita Vision commerçant (DSA) sur Play et App Store, avec ses coordonnées | Porteur | Avant le 1er février 2027 et avant la soumission |
| Activer GitHub Pages et publier la politique de confidentialité | Porteur (réglage), IA (page générée) | Avant la première soumission |
| Rédiger la politique de confidentialité et les conditions d'utilisation (source unique pour l'appli et la page web) | IA, validé par le porteur | Ticket des pages légales |
| Publier sur GitHub Pages un modèle de mention d'information que le club remet aux familles | IA, validé par le porteur | Ticket des pages légales |
| Remplir « Sécurité des données » (Play) et « App Privacy » (Apple) | Porteur | À la soumission |
| Déclarer le public cible 18+ (Play) et remplir le questionnaire d'âge (Apple) | Porteur | À la soumission |
| Auditer les permissions et l'absence de chiffrement sur les binaires | IA (CI), porteur (lecture) | Fin de jalon et chaque version |
| Générer le registre des licences | IA | Chaque version |
| Préparer un jeu de données fictif pour la revue des stores (une appli vide est souvent refusée) | IA | Avant la première soumission |

## 9. Sources (consultées le 2026-11-26)

- Google Play, Sécurité des données : <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play, données utilisateur et politique de confidentialité : <https://support.google.com/googleplay/android-developer/answer/9859455>
- Google Play, suppression de compte : <https://support.google.com/googleplay/android-developer/answer/13327111>
- Google Play, public cible : <https://support.google.com/googleplay/android-developer/answer/9867159> ; Familles : <https://support.google.com/googleplay/android-developer/answer/9893335>
- Google Play, statut de commerçant : <https://support.google.com/googleplay/android-developer/answer/17594752>
- Apple, App Privacy : <https://developer.apple.com/app-store/app-privacy-details/> ; <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>
- Apple, App Review Guidelines : <https://developer.apple.com/app-store/review/guidelines/>
- Apple, classification d'âge : <https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions>
- Apple, `ITSAppUsesNonExemptEncryption` : <https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption>
- Apple, statut de commerçant (DSA) : <https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements>
- CNIL, recommandation applications mobiles (délibération n° 2025-024) : <https://www.cnil.fr/sites/cnil/files/2025-04/recommandation-applications-mobiles-modifiee.pdf>
- CNIL, sport amateur : <https://cnil.fr/fr/sport-amateur-hors-contrat/grandes-notions> ; <https://www.cnil.fr/fr/sport-amateur-hors-contrat/questions-reponses>
- RGPD, art. 4, 33, 34 : <https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre1> ; <https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4>
- CEPD, lignes directrices 07/2020 : <https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf>
- Loi n° 2004-575, art. 30 : <https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006421577>
- ANSSI, démarches : <https://cyber.gouv.fr/reglementation/reglementation-identite-confiance-numerique/controles-reglementaires-cryptographie/controle-moyen-de-cryptologie/controle-rglementaire-cryptographie-demarches/>

Non lus (pages vides ou en erreur) : considérant 18 du RGPD (EUR-Lex), deux pages de l'ANSSI.

## Décisions du porteur

- 2026-11-26 (ticket 005) : date d'effet de l'horaire des créneaux ajoutée (donnée d'organisation, non personnelle, stockée sur l'appareil) ; rien ne change pour les déclarations des stores (« aucune donnée collectée ») ; la politique de confidentialité (EX-40) la range avec les créneaux (ABS-08).
- 2026-11-26 : comptes Jita Vision, nom Ki&La, GitHub Pages ; Jita Vision **commerçant** au sens du DSA ; modèle de mention d'information pour les familles sur la page web ; export non déclaré comme partage (action initiée par l'utilisateur) ; public cible Play **16 ans et plus**.

## Questions ouvertes

- Vérifier dans la console Play que la tranche 16-17 ne rend pas la politique Familles applicable (à la soumission).
- Le droit de la consommation qu'implique le statut de commerçant pour une appli gratuite : la phrase du §5 est une lecture de l'IA, à confirmer si besoin.
