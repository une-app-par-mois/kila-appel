# File de questions du porteur

Tenue par l'IA principale à l'intégration (`CLAUDE.md` § « Travail par lot »). Posée en QCM à la séance suivante ; une question répondue part dans `docs/DECISIONS.md` ou dans la fiche du ticket, puis sort de cette file.

| Ticket | Question | Options (recommandation en premier) | Appliqué en attendant | Bloque la fusion |
| --- | --- | --- | --- | --- |
| 023 | Sans saison active, quelle période par défaut pour les statistiques ? | « Ce mois », `season` nul, seuls les groupes ayant une séance dans la période (avec « Archivé ») ; un message seul, sans chiffres | « Ce mois » (aussi si « Saison » est demandé), `season` nul, groupes ayant une séance dans la période | non |
| 021 | Écran d'alerte d'un membre qui n'en a plus (traitée, ou série retombée) : que rend `useAlert` ? | `alert: null`, `recent` toujours lu (le 022 revient à l'accueil sans état vide) ; rendre l'alerte quand même | `alert: null`, `recent` lu | non |
| 023 | Séance où le membre était inscrit mais n'a pas de statut : comment l'afficher ? | Décidé au 025 sur la donnée `status: null`, `enrolled: true` ; case vide ; « hors inscription » | Le 023 renvoie `status: null` et `enrolled: true` ; affichage au 025 | non |
