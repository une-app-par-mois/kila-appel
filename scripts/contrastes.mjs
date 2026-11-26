#!/usr/bin/env node
// Vérifie les contrastes WCAG 2.1 de la charte (design/jetons.json). Sans dépendance.
// Échoue (code 1) si une paire passe sous son seuil : 4,5:1 pour du texte, 3:1 pour un contour.
import { readFileSync } from 'node:fs';

const j = JSON.parse(readFileSync(new URL('../design/jetons.json', import.meta.url), 'utf8'));
const c = j.couleurs;

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const paires = [
  ['Texte sur Papier', c.texte, c.papier, 4.5],
  ['Texte sur Blanc', c.texte, c.blanc, 4.5],
  ['Encre sur Papier', c.encre, c.papier, 4.5],
  ['Encre sur Blanc', c.encre, c.blanc, 4.5],
  ['Texte secondaire sur Papier', c.texteSecondaire, c.papier, 4.5],
  ['Texte secondaire sur Blanc', c.texteSecondaire, c.blanc, 4.5],
  ['Marge sur Papier', c.marge, c.papier, 4.5],
  ['Marge sur Blanc', c.marge, c.blanc, 4.5],
  ...Object.values(j.statuts).map((s) => [`Pastille ${s.libelle}`, s.texte, s.fond, 4.5]),
  ...Object.values(j.statuts)
    .filter((s) => s.bordure)
    .map((s) => [`Contour ${s.libelle} sur Blanc`, s.bordure, c.blanc, 3]),
  ...Object.values(j.etatsSeance).map((s) => [
    `Séance ${s.libelle} sur Blanc`,
    s.texte,
    c.blanc,
    4.5,
  ]),
];

let echecs = 0;
for (const [nom, a, b, seuil] of paires) {
  const r = ratio(a, b);
  const ok = r >= seuil;
  if (!ok) echecs++;
  console.log(`${ok ? 'ok  ' : 'ÉCHEC'} ${r.toFixed(2).padStart(5)}:1 (min ${seuil}) ${nom}`);
}
process.exit(echecs ? 1 : 0);
