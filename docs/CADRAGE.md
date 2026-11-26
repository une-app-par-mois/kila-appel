# Cadrage — [nom de l'app]

Mois : [AAAA-MM] · App n°[N] · Origine de l'idée : [moi | @auteur du commentaire, avec son accord pour être cité]

À remplir avant le design et le code. Ce document fait foi sur le périmètre.

## Le besoin

[Le problème, raconté comme une scène vécue. 3 lignes maximum.]

## L'utilisateur

- **Qui** : [ex. professeur de judo, trésorier d'association]
- **Contexte d'usage** : [où, sur quel appareil, avec ou sans réseau]
- **Niveau technique** : [aucun | bureautique | à l'aise]

## Ce que l'app fait (version du mois)

Chaque fonctionnalité a un identifiant, cité dans le code, le nom des tests et les tickets.

- **F-01** — [Fonctionnalité indispensable]
- **F-02** — [Fonctionnalité indispensable]
- **F-03** — [Fonctionnalité indispensable]

## Hors périmètre

- [Ce qu'on ne fera pas ce mois-ci, et pourquoi]
- Tout ce qui exige un serveur, un compte ou une synchronisation en ligne.

## Glossaire

Un mot par notion. Le terme du code (en anglais) est le seul employé dans le code ; le terme français est le seul employé dans les textes et les documents. Un nouveau terme s'ajoute ici avant d'apparaître dans le code.

| Terme | Définition | Terme du code | Mots à éviter |
| --- | --- | --- | --- |
| [ex. séance] | [ex. un cours daté, avec sa liste d'appel] | `Session` | [cours, leçon] |

## Données manipulées

| Donnée | Personnelle ? | Sensible ? | Où est-elle stockée | Durée de conservation | Export / suppression |
| --- | --- | --- | --- | --- | --- |
| [ex. prénom des adhérents] | Oui | Non | Stockage local de l'appareil | Jusqu'à suppression par l'utilisateur | Export CSV, bouton « tout effacer » |

## Zones sensibles

Les parties du code où une erreur touche les données, la sécurité ou l'exactitude : `/security-review` et relecture du porteur **avant** la fusion.

- [ex. import de fichiers CSV]
- [ex. effacement des données]
- [ex. calcul de ce qui est affiché comme résultat à l'utilisateur]

## Plateforme et stack

- **Format** : [PWA hors ligne | desktop | Android | CLI | extension]
- **Stack envisagée** : [ ] — pourquoi ce choix : [ ]
- **Mode de CI** : [par ticket | par groupe | par jalon] — par défaut par jalon ; par ticket si la CI est courte et qu'on veut chaque fusion vérifiée (`CLAUDE.md`, « Mode de CI »)

## Critères de réussite

- [ ] [Critère mesurable, ex. l'appel de 30 personnes prend moins d'une minute]
- [ ] Fonctionne sur une machine déconnectée du réseau
- [ ] Audit de sécurité sans problème critique ou élevé non corrigé
- [ ] Un utilisateur non technique l'installe seul avec le README

## Risques identifiés

- [Risque RGPD, sécurité, ou technique — et la parade]
