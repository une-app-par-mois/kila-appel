# Polices embarquées : sources et empreintes

Polices IBM Plex, licence SIL Open Font License 1.1 (`OFL.txt`, nom réservé « Plex » : fichiers utilisés sans modification). Embarquées au build par l'extension `expo-font` (`app.json`) ; aucune police chargée par Internet (ABS-01, charte §5).

Téléchargées le 2026-11-26 depuis les versions officielles de github.com/IBM/plex (dossier `fonts/complete/ttf/` de chaque archive) :

| Archive | Version | SHA-256 de l'archive |
| --- | --- | --- |
| ibm-plex-sans.zip | @ibm/plex-sans@1.3.6 | a52bd405930040a6bfdb5c8aff67f1b7205538999986e2186d8f8895ca6a5de1 |
| ibm-plex-mono.zip | @ibm/plex-mono@2.5.0 | 6d23f01257663d8cc49a0d64c22ced630b79e0e2a0ac08a0da86e9a38bbc481c |

Fichiers, renommés d'après leur nom PostScript (iOS cherche une police par ce nom, Android par le nom de fichier ; vérifié par `src/config/fonts.test.ts`) :

| Fichier | SHA-256 |
| --- | --- |
| IBMPlexSans.ttf | b47ebd72b5ce53b60f909033ff84d6fc12358cc147e2981f8c321ad3f36246b6 |
| IBMPlexSans-SmBld.ttf | c51119b25f4a296da2b66edf3201b9aa1735091ed7efc1fca0313346f3851a4d |
| IBMPlexSans-Bold.ttf | 22f59d358e8b9b9fb38ac6ee26a7ea7263ffa1c89a9056c101acff5add91f5d6 |
| IBMPlexMono-Medm.ttf | 98fbd727aae340b236955879dabed4d991aac9e8e90b3b2a67ce4a59221cc97c |
