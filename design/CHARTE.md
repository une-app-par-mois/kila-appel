# Charte graphique — Ki&La (appel) · « Carnet »

Statut : ✅ validé le 2026-11-26

Reprise de la charte « Carnet » du 2026-11-25, conçue pour la version ouverte de Ki&La (décision du porteur du 2026-11-26), adaptée au cadrage et au PRD validés. Elle ne reprend rien de l'identité d'origine Jita Vision (fond beige, Rethink Sans, accent saumon, dégradés, icônes Phosphor).

**Source unique des valeurs : `design/jetons.json`.** Ce document en explique l'usage ; les maquettes puis le code lisent le fichier de jetons, jamais des valeurs recopiées. Les contrastes sont revérifiés par `node scripts/contrastes.mjs`, qui échoue sous le seuil.

## 1. Intention

**Le cahier d'appel, rendu numérique** : papier, encre bleue, marge rouge, petits carreaux. L'encadrant retrouve un repère qu'il connaît dès la première ouverture ; la familiarité passe avant l'originalité.

1. **Lisible debout, d'une main, dans le bruit** : gros noms, gros boutons, peu d'éléments à l'écran.
2. **La couleur dit le statut**, jamais seule : l'encre pour ce qui est normal ou à faire, le rouge de la marge pour ce qui demande une attention.
3. **La matière reste discrète** : papier et carreaux donnent le caractère sans gêner la lecture.

## 2. Logo

- Fichier : `design/logo.svg`. Symbole : un cahier vu de face (contour encre), sa marge rouge à gauche, quatre lignes de quadrillage, une coche à l'encre. Nom : « Ki&La » en IBM Plex Sans Bold, approche −0,03 em.
- Démarche : dessiné en SVG pour la charte Carnet du 2026-11-25.
- Le nom s'écrit toujours « Ki&La ». Icône d'application : le symbole seul sur fond Papier. Espace de protection : quatre fois la largeur de la marge rouge.
- Interdit : changer les couleurs du symbole, retirer la marge, déformer, ajouter ombre ou dégradé.
- L'usage de la marque Ki&La reste une question ouverte du cadrage.

## 3. Couleurs

| Rôle | Couleur | Code | Contraste (WCAG 2.1) |
| --- | --- | --- | --- |
| Fond des écrans | Papier | `#FBFAF6` | — |
| Cartes, champs, barre d'onglets | Blanc | `#FFFFFF` | — |
| Texte principal | Texte | `#1B2233` | 15,2:1 sur Papier |
| Actions principales, onglet actif, chiffres | Encre | `#1F3A93` | 9,6:1 sur Papier |
| Alertes, « appel non fait », soulignés de section | Marge | `#C83C3C` | 4,8:1 sur Papier |
| Libellés, aides, séances annulées | Texte secondaire | `#667085` | 4,8:1 sur Papier, 5,0:1 sur Blanc |
| Carreaux, bordures, séparateurs | Quadrillage | `#DCE3F0` | décoratif |

Le rouge Marge n'est **jamais** utilisé pour une action normale. Les valeurs « Erreur » du modèle sont portées par Marge.

### Statuts de présence

| Statut | Fond | Texte | Contraste |
| --- | --- | --- | --- |
| Présent | `#1F3A93` | `#FFFFFF` | 10,1:1 |
| Absent | `#C83C3C` | `#FFFFFF` | 5,0:1 |
| Retard | `#D98E2B` | `#1B2233` | 5,9:1 |
| Excusé | `#646C7B` | `#FFFFFF` | 5,3:1 |
| Attendu (préparation, EX-36) | `#FFFFFF`, contour Encre 1,5 pt | `#1F3A93` | 10,1:1 |

Chaque statut porte toujours son **libellé écrit** et une **icône** (NF-06) : la couleur n'est jamais le seul signe. « Attendu » se distingue de « Présent » par son fond blanc à contour : une séance préparée ne doit jamais ressembler à un appel fait.

PDF, grille séance par séance : teinte claire du fond du statut, lettre en texte foncé (décision du porteur du 2026-11-28).

### États de séance (EX-38)

Séance **annulée** et **non planifiée** : dans l'historique et la frise, libellé écrit en Texte secondaire (« Annulée », « Non planifiée »), sans couleur de statut ; elles ne ressemblent ni à un appel fait ni à un appel manquant (qui est en Marge).

## 4. Typographies

| Usage | Famille | Graisses | Licence |
| --- | --- | --- | --- |
| Titres, texte, boutons | IBM Plex Sans | 400, 600, 700 | SIL Open Font License 1.1, fichiers embarqués |
| Chiffres, compteurs, dates courtes | IBM Plex Mono | 500 | SIL Open Font License 1.1, fichiers embarqués |

Aucune police chargée depuis Internet (ABS-01).

Exception — PDF : police du système (décision du porteur du 2026-11-28 ; la CSP du rapport interdit toute police embarquée) : `system-ui, sans-serif`, chiffres en `font-variant-numeric: tabular-nums`.

| Rôle | Taille (pt) | Graisse | Approche |
| --- | --- | --- | --- |
| Titre d'écran | 30 | 700 | −0,02 em |
| Titre de carte | 22 | 700 | −0,01 em |
| Nom d'un membre (appel) | 18 | 600 | 0 |
| Texte courant | 16 | 400 | 0 |
| Titre de section | 13, capitales | 600 | +0,08 em |
| Libellé, aide | 13 à 14 | 400 | 0 |
| Chiffre clé | 26, Plex Mono | 500 | 0 |
| Libellé d'onglet | 12 | 600 | 0 |

Taille minimale : 12 pt (les onglets de Carnet, à 9,5–10,5, sont remontés à 12). Les tailles suivent le réglage de taille de texte du système (NF-06).

## 5. Matières

- **Grain papier** : bruit très léger brun-gris (`rgb(89, 77, 56)`, 17 % d'opacité au plus), livré en image PNG tuilée de 240 pt.
- **Petits carreaux** : grille de 22 pt, traits de 1 pt en Quadrillage, **uniquement sur le fond des écrans**, jamais dans une carte, un champ ou un bouton.
- **Marge rouge** : trait vertical de 2 pt, Marge à 55 %, à 30 pt du bord gauche ; le contenu commence à 44 pt (à droite de la marge), retrait droit 20 pt.

## 6. Espacements, rayons, ombres

| Élément | Valeur |
| --- | --- |
| Unité d'espacement | 4 pt (4, 8, 12, 16, 20, 24) |
| Zone d'appui minimale | 44 × 44 pt (NF-06) |
| Rayons | carte 16, bouton 14, champ 12, pastille 10, barre 4 |
| Ombre des cartes | 0 2 pt 0, Encre à 6 % (papier posé, sans flou) |
| Ombre du bouton central | 0 6 pt 14 pt, Encre à 35 % |
| Bordure des cartes | 1 pt Quadrillage |

**Tablette (portrait seul, NF-05)** : même mise en page que le téléphone ; la colonne de contenu est centrée et limitée à 640 pt de large ; carreaux et marge restent sur toute la largeur de l'écran.

## 7. Composants

- **Bouton principal** : fond Encre, texte blanc, Plex Sans 600 17 pt, hauteur 54 pt, rayon 14. **Un seul par écran** (« Faire l'appel », « Enregistrer l'appel »).
- **Bouton secondaire** : fond blanc, bordure Quadrillage 1,5 pt, Texte secondaire, toujours plus petit que le principal (« Annuler » occupe un tiers de la carte de séance, « Faire l'appel » les deux tiers).
- **Carte** : fond blanc, bordure Quadrillage, rayon 16, ombre de papier.
- **Pastille de statut** : largeur minimale 84 pt, rayon 10, Plex Sans 600 14 pt, icône et libellé. Sur l'appel, un appui sur la ligne fait défiler **Présent → Absent → Retard → Excusé → Présent** (Absent en 1 appui, Retard en 2 : EX-10). En préparation : **Attendu ↔ Excusé**.
- **Titre de section** : capitales, Plex Sans 600 13 pt, souligné d'un trait Marge de 2,5 pt.
- **Compteur d'appel** : carte en tête de l'appel, Plex Mono, un carré à la couleur de chaque statut suivi de son nombre et de son libellé.
- **Barre d'onglets** : Accueil, Stats, **Nouvel appel**, Historique, Paramètres ; onglet central rond de 58 pt, fond Encre, coche blanche, surélevé de 14 pt ; onglet actif en Encre.
- **Alerte d'assiduité** : ligne dans une carte, nom en 600, groupe en Texte secondaire, nombre d'absences à droite en Marge.
- **Barres de statistiques** : barre de 12 pt, segments Présent, Retard, Excusé, Absent ; séance par séance : une case de 22 pt par séance, case vide en Quadrillage hors inscription.
- **Avertissement de sauvegarde (EX-19, ABS-06)** : carte à bordure Marge, texte courant, jamais repliée ni raccourcie.

## 8. Iconographie

Icônes au trait de 2 pt, coins arrondis, grille de 24 pt ; Texte secondaire au repos, Encre à l'état actif. Bibliothèque libre de redistribution, compatible MIT, sans lien avec l'identité d'origine : **à choisir et valider comme dépendance** au ticket qui l'installe.

Thème : **clair seul en v1** (décision du 2026-11-26) ; le thème sombre est en boîte à idées.

## 9. Maquettes

HTML local, générées par `node scripts/maquettes.mjs` depuis `design/jetons.json`, dans `design/maquettes/index.html` (décision du 2026-11-26). La page liste les écrans, les exigences que chacun couvre et leur état de relecture. Données toujours fictives. On ne modifie jamais le HTML à la main : on modifie le script et on régénère.

## 10. À ne pas faire

- Reprendre un élément de l'identité d'origine.
- Mettre carreaux ou grain derrière un texte dense, dans une carte ou un champ.
- Utiliser Marge pour une action normale.
- Distinguer un statut ou un état de séance par la seule couleur.
- Afficher de vraies données de membres dans une maquette, une capture ou une vidéo.
- Écrire une couleur ou une taille en dur ailleurs que dans `design/jetons.json` (puis le fichier de thème du code qui en dérive).

## Ce que j'ai changé par rapport aux propositions de l'IA

- Aucun changement : ajouts (Attendu, états de séance, onglets à 12 pt, tablette), ordre des statuts et thème clair seul validés tels que proposés le 2026-11-26.
