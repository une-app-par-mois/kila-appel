# Décisions automatiques

Journal des choix que l'IA a faits seule en appliquant sa recommandation, sans poser la question (décision du porteur du 2026-11-27, `CLAUDE.md` § « Décisions automatiques »). Le porteur les relit dans chaque PR et en fin de jalon ; une décision annulée est marquée « annulée » avec la date et le ticket qui la corrige. On ajoute en bas, on ne réécrit pas.

Les décisions posées au porteur restent dans les tickets, l'architecture et le PRD, comme avant.

État : « à relire » (pas contestée par le contradicteur), « contestée, maintenue : <raison> », « changée après contradiction », « posée au porteur », « annulée (<date>, ticket) ».

| Date | Ticket | Question | Options | Choix | Raison | État |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-27 | 012b | Nom de la saison créée automatiquement | « 2026-2027 » ; « Saison 2026-2027 » | « 2026-2027 » | la maquette Paramètres affiche « Active : 2026-2027 » ; Bienvenue ajoute « Saison » devant | à relire |
| 2026-11-27 | 012b | Quand l'étape « Ajouter les membres » est-elle faite ? | un membre existe ; un membre inscrit (en cours ou à venir) à un groupe courant de la saison active | inscrit à un groupe courant | un membre sans groupe n'apparaît dans aucun appel | à relire |
| 2026-11-27 | 012b | Où mène « Ajouter des membres » ? | création d'un membre dans le premier groupe ; inscription au groupe | création d'un membre dans le premier groupe (`/membres/nouveau?groupe=`) | à la première ouverture, il n'y a encore aucun membre à inscrire | à relire |
| 2026-11-27 | 012b | « créée automatiquement » sous l'étape 1 | toujours ; seulement si elle vient d'être créée | seulement si elle a été créée pendant cette ouverture | sinon la saison a pu être créée ou renommée à la main : « Saison <nom> » | à relire |
| 2026-11-27 | 012b | Un appel en cours quand Bienvenue s'affiche (ex. seul groupe archivé) | caché ; carte « Appel en cours » au-dessus des étapes | carte au-dessus des étapes | sans elle, l'appel ne pourrait plus être abandonné et bloquerait tout autre appel | à relire |
| 2026-11-27 | 012b | Aucune saison active mais des saisons existent | créer une saison ; étape 1 non faite avec « Choisir la saison active » | étape 1 non faite, bouton vers Saisons | ne pas créer de saison en double à côté de celles du porteur | à relire |
