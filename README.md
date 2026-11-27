# [Nom de l'app]

> [Une phrase : ce qu'elle fait, pour qui.]

**App n°[N] de la série [« Une app par mois »](https://github.com/une-app-par-mois)** · 100 % locale · Auditée · Licence MIT

[Capture d'écran ou GIF de démo — données fictives]

## À quoi ça sert

[Le problème, en deux ou trois lignes simples. Ce que l'app change.]

## 100 % locale

- Aucun serveur, aucun compte, aucune publicité, aucune télémétrie.
- Vos données restent sur votre appareil : [où exactement, ex. stockage du navigateur, dossier de l'app].
- L'app fonctionne sans connexion Internet. Chaque version est testée sur une machine déconnectée.

## Installer

1. Ouvrez la page [Releases](../../releases/latest).
2. Téléchargez [le fichier pour votre système] et `SHA256SUMS.txt`.
3. Vérifiez le téléchargement (voir ci-dessous).
4. [Étapes d'installation, une par ligne.]

[Si l'exécutable n'est pas signé : expliquer l'alerte Windows SmartScreen ou macOS Gatekeeper, et comment la passer en connaissance de cause.]

### Vérifier le téléchargement

Linux / macOS :

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

Windows (PowerShell) :

```powershell
Get-FileHash .\[fichier] -Algorithm SHA256
```

L'empreinte affichée doit être identique à celle de `SHA256SUMS.txt`. Chaque fichier est aussi accompagné d'une attestation de provenance GitHub : `gh attestation verify [fichier] --owner une-app-par-mois`.

## Utiliser

[Le parcours principal en 3 à 5 étapes.]

## Vos données

| Donnée | Où | Combien de temps | Comment l'effacer |
| --- | --- | --- | --- |
| [ ] | [ ] | [ ] | [ ] |

## Permissions demandées

| Permission | Pourquoi |
| --- | --- |
| `com.jitavision.kila.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | Ajoutée par AndroidX, de niveau signature : seule l'appli l'utilise, pour ses récepteurs internes. Aucune boîte de dialogue, aucun accès à vos données. |
| `android.permission.POST_NOTIFICATIONS` | Afficher la relance avant une séance (F-06), une notification **locale** programmée sur le téléphone. Demandée seulement quand vous activez la relance (boîte de dialogue à partir d'Android 13). Refusée, l'appli marche comme avant, sans relance. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Reprogrammer les relances après un redémarrage du téléphone, qui les efface. Aucune boîte de dialogue, aucun accès à vos données. |

Ce sont les seules permissions du binaire Android, relevées par `aapt2 dump permissions` et vérifiées à chaque build par `scripts/audit-apk.js` contre `config/permissions-attendues.txt`. **INTERNET est absente** (ABS-01), comme le stockage externe, la superposition aux autres applis et la vibration, ajoutés par défaut par Expo et bloqués. Les notifications sont locales : la bibliothèque `expo-notifications` embarque Firebase Cloud Messaging, mais ses composants sont retirés du binaire (`plugins/withoutFirebase.js`, vérifié par l'audit) et ses permissions bloquées (état du réseau, maintien en éveil, réception de messages Google, référent d'installation, pastilles des lanceurs). Pas d'alarme exacte : Android peut retarder une relance, de quelques minutes à davantage quand le téléphone est en veille prolongée ou que l'appli est restreinte (économie de batterie). Sur iOS : aucune permission, aucun lien entrant.

## Sécurité

- Rapport d'audit : [`AUDIT.md`](AUDIT.md) — ce qui a été trouvé et corrigé.
- Signaler une faille : voir [`SECURITY.md`](SECURITY.md).

## Comment elle a été construite

Codée avec Claude et Claude Code, en [X] heures, ticket par ticket. Cadrage dans [`docs/CADRAGE.md`](docs/CADRAGE.md), tickets dans [`docs/tickets/`](docs/tickets/), prompts clés dans [`PROMPTS.md`](PROMPTS.md), charte et maquettes dans [`design/`](design/).

[Idée proposée par @auteur, merci !]

## Développer

```bash
[installer]
./scripts/setup-hooks.sh   # une fois par poste : hooks Git (gitleaks requis)
[lancer]
./scripts/test.sh
```

Les règles du projet pour l'IA sont dans [`CLAUDE.md`](CLAUDE.md), ses garde-fous dans [`.claude/settings.json`](.claude/settings.json), les conventions et la Definition of Done dans [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md), les mots de la méthode dans [`docs/GLOSSAIRE-METHODE.md`](docs/GLOSSAIRE-METHODE.md).

### Tests de bout en bout

> **Attention : la campagne efface toutes les données de l'appli sur l'appareil** (désinstallation, puis réinstallation de l'APK). Elle ne tourne que sur un émulateur : un téléphone branché est refusé, sauf option explicite `--appareil-reel`, à réserver à un téléphone de test sans vraies données.

Parcours [Maestro](https://maestro.dev) (`.maestro/`), lancés en fin de jalon : appel de 20 membres chronométré, brouillon retrouvé après une fermeture forcée, sauvegarde puis tout effacer puis restauration.

Prérequis : Node 22.15 ou plus récent (le générateur de la sauvegarde fictive utilise `module.registerHooks`) et `npm ci` ; Maestro 2.12.0 (`~/.maestro/bin/maestro` ou dans le `PATH`) ; `adb` ; un émulateur Android démarré, et un seul appareil branché (sinon `ANDROID_SERIAL=<numéro>`). Sélecteur de fichiers du système en anglais ou en français.

```bash
# APK de version, construit en local (ou l'artefact de la CI de la PR du jalon)
npx expo prebuild --platform android --no-install --clean
(cd android && ./gradlew assembleRelease --no-daemon)
./scripts/e2e.sh android/app/build/outputs/apk/release/app-release.apk
```

Le script désactive les statistiques de Maestro (`MAESTRO_CLI_NO_ANALYTICS=1`), installe l'APK, génère une sauvegarde fictive avec le code de `src/data/` (aucun fichier binaire dans le dépôt) et la dépose dans `Téléchargements` de l'appareil, puis lance `maestro test .maestro`.

## Licence

[MIT](LICENSE) © 2026 Dimitri Lefebvre
