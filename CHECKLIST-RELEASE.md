# Checklist de release

À cocher dans la pull request de release. Rien ne part tant qu'une case reste vide.

## Code
- [ ] Tous les tests passent en CI.
- [ ] Les critères de réussite de `docs/CADRAGE.md` sont atteints.
- [ ] J'ai relu chaque diff depuis la dernière version.
- [ ] Aucune donnée réelle dans le code, les tests, les captures ou la démo.

## Sécurité
- [ ] Workflow `security.yml` au vert (Semgrep, gitleaks, dépendances).
- [ ] CodeQL sans alerte ouverte de gravité élevée ou critique.
- [ ] Audit IA en posture d'attaquant fait dans une session séparée (ou un sous-agent qui n'a pas écrit le code), avec le prompt de `AUDIT.md`.
- [ ] Les zones sensibles du cadrage ont été relues par le porteur.
- [ ] `AUDIT.md` à jour : problèmes, corrections, limites.
- [ ] Chaque permission demandée est justifiée dans le README.

## 100 % local
- [ ] Recherche dans le code de toute URL, `fetch`, `http`, CDN, police distante : aucune n'est nécessaire au fonctionnement.
- [ ] Test complet sur une machine déconnectée du réseau, résultat noté dans `AUDIT.md`.

## Documentation
- [ ] README : installation, vérification SHA-256, utilisation, données et vie privée.
- [ ] `PROMPTS.md` complété, bilan chiffré compris ; `ETAT.md` à jour.
- [ ] Idées écartées notées dans `docs/IDEES.md`.
- [ ] `design/` : charte et maquettes à jour.
- [ ] Version mise à jour dans le code et dans `CHANGELOG.md`.

## Publication
- [ ] Tag `vX.Y.Z` poussé sur `main` : le workflow `release.yml` construit, calcule les SHA-256 et publie.
- [ ] Release vérifiée : fichiers téléchargés, `sha256sum -c` OK.
- [ ] Ligne de l'app ajoutée au tableau du README de l'organisation.
- [ ] Démo vidéo prête (données fictives, mention « Montage et voix générés par IA »).
