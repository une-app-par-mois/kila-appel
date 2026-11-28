# File de questions du porteur

Tenue par l'IA principale à l'intégration (`CLAUDE.md` § « Travail par lot »). Posée en QCM à la séance suivante ; une question répondue part dans `docs/DECISIONS.md` ou dans la fiche du ticket, puis sort de cette file.

| Ticket | Question | Options (recommandation en premier) | Appliqué en attendant | Bloque la fusion |
| --- | --- | --- | --- | --- |
| 023 | Sans saison active, quelle période par défaut pour les statistiques ? | « Ce mois », `season` nul, seuls les groupes ayant une séance dans la période (avec « Archivé ») ; un message seul, sans chiffres | « Ce mois » (aussi si « Saison » est demandé), `season` nul, groupes ayant une séance dans la période | non |
| 021 | Écran d'alerte d'un membre qui n'en a plus (traitée, ou série retombée) : que rend `useAlert` ? | `alert: null`, `recent` toujours lu (le 022 revient à l'accueil sans état vide) ; rendre l'alerte quand même | `alert: null`, `recent` lu | non |
| 027 | Un appel sans créneau (EX-39) enregistré le même jour pour un groupe du créneau retire-t-il la relance ? | A : non, la relance part (même règle qu'EX-17 pour les appels manquants, décision 013) ; B : un appel sans créneau du même jour pour **tous** les groupes actifs du créneau retire la relance et aussi l'appel manquant (ajustement de la décision 013) | A : la relance part, l'appel manquant reste | non |
| 028c | Appui sur une relance dont la cible est hors format, alors que l'appli est ouverte : où aller ? | A : rien ne s'ouvre, l'écran affiché reste (à froid, l'appli s'ouvre sur l'accueil) ; B : aller à l'accueil, même en quittant un appel en cours | A : rien ne s'ouvre | non |
| 028b | Lecture des données en échec pendant une reprogrammation : que deviennent les relances ? | A : rien n'est annulé ni retiré, `REMINDERS_SCHEDULE_FAILED`, nouvelle passe au prochain premier plan ou à la prochaine écriture ; B : tout annuler (une relance désactivée pendant la panne ne partirait plus, mais des relances valides seraient perdues jusqu'à la passe suivante) | A : rien n'est annulé | non |
| 028b | Relance désactivée ou permission refusée : que deviennent les relances déjà affichées ? | A : même règle que d'habitude, seules celles dont la séance n'est plus due sont retirées (les programmées sont toutes annulées) ; B : toutes les retirer | A : règle des séances dues | non |
