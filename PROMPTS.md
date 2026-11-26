# Journal des prompts — Ki&La (appel)

Les prompts clés et les décisions, pour que chacun puisse reproduire la démarche. Données fictives uniquement.

## Bilan

- Temps total : [X h] · Sessions Claude Code : [X]
- Part du code générée par l'IA, estimée : [X %]
- Ce que l'IA a raté et que j'ai dû reprendre : [ ]

## Journal

### Mise en route et cadrage — 2026-11-26

**Prompt**

```text
Je veux refaire de zéro mon appli d'appel Ki&La (relevé de présence des séances de sport) avec la méthode de vibe coding : utilise le skill methode-vibe-coding. [...] L'ancienne version [...] sert uniquement de référence fonctionnelle : ne copie pas son code, et ne la modifie pas. [...] Pose-moi en QCM le niveau, puis le nom du dépôt, l'organisation et la visibilité [...]. Remplis docs/CADRAGE.md avec moi par questions courtes [...] sans jamais rien décider à ma place. Pose aussi le mode de CI en QCM. Liste ce que l'ancienne version faisait de bien et ce qu'elle faisait mal [...]. Toutes tes questions doivent être des QCM (2 à 4 options, ta recommandation en premier).
```

**Ce que l'IA a fait** : lecture de l'ancienne version par un sous-agent (documents, code, historique git), bilan de ce qui a marché ou coûté cher, création du dépôt depuis le modèle, cadrage puis PRD rédigés par QCM successifs, règles absolues ABS-01 à ABS-08 dans `CLAUDE.md`.

**Ce que j'ai corrigé ou refusé** : périmètre élargi à tout ce que faisait l'ancienne version (contre la recommandation d'une v1 resserrée), construit par jalons ; import par photo ajouté puis renvoyé en boîte à idées ; tablette ; « tout encadrant » plutôt que « entraîneur » ; préparer/annuler gardés dans leur version complète ; import CSV et exports en zone sensible ; cycle de sauvegarde vérifié sur Android réel seulement.

**Décision** : niveau renforcé, dépôt public `une-app-par-mois/kila-appel`, Expo + React Native + TypeScript, CI par jalon, pas de chiffrement applicatif. Cadrage et PRD validés le 2026-11-26.

### [Étape] — [AAAA-MM-JJ]

**Prompt**

```text
[le prompt, tel quel]
```

**Ce que l'IA a fait** : [ ]

**Ce que j'ai corrigé ou refusé** : [ ]

**Décision** : [ ]
