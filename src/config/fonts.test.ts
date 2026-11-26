/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fontFiles, theme } from '@/config/theme';
import app from '../../app.json';
import jetons from '../../design/jetons.json';

const root = join(__dirname, '..', '..');

/** Lit dans un fichier TrueType le nom PostScript, la famille et la graisse (tables name et OS/2). */
const readFontInfo = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map<string, number>();
  for (let i = 0; i < view.getUint16(4); i++) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(record, record + 4));
    tables.set(tag, view.getUint32(record + 8));
  }
  const name = tables.get('name') ?? 0;
  const strings = name + view.getUint16(name + 4);
  const names = new Map<number, string>();
  for (let i = 0; i < view.getUint16(name + 2); i++) {
    const r = name + 6 + i * 12;
    // Plateforme Windows (3), encodage Unicode : UTF-16 gros-boutiste.
    if (view.getUint16(r) === 3 && !names.has(view.getUint16(r + 6))) {
      const start = strings + view.getUint16(r + 10);
      const raw = bytes.subarray(start, start + view.getUint16(r + 8));
      names.set(view.getUint16(r + 6), new TextDecoder('utf-16be').decode(raw));
    }
  }
  return {
    postScriptName: names.get(6),
    family: names.get(16) ?? names.get(1),
    weight: view.getUint16((tables.get('OS/2') ?? 0) + 4),
  };
};

describe('Polices embarquées (charte §5, ABS-01 : aucune police chargée par Internet)', () => {
  it('embarque chaque police du thème par l’extension expo-font, au build', () => {
    const plugin = app.expo.plugins.find(
      (p): p is [string, { fonts: string[] }] => Array.isArray(p) && p[0] === 'expo-font',
    );
    expect(plugin?.[1].fonts).toEqual(fontFiles);
  });

  it.each([
    ['text', 'texte'],
    ['textSemi', 'texteSemi'],
    ['title', 'titre'],
    ['digits', 'chiffres'],
  ] as const)(
    'police %s : nom PostScript = nom de fichier (iOS), famille et graisse des jetons (%s)',
    (key, jetonKey) => {
      const info = readFontInfo(readFileSync(join(root, `assets/fonts/${theme.fonts[key]}.ttf`)));
      // iOS trouve une police par son nom PostScript, Android par son nom de fichier : ils doivent être égaux.
      expect(info.postScriptName).toBe(theme.fonts[key]);
      expect(`${info.family} ${info.weight}`).toBe(jetons.polices[jetonKey]);
    },
  );

  it('livre la licence SIL OFL 1.1 à côté des polices', () => {
    const licence = readFileSync(join(root, 'assets/fonts/OFL.txt'), 'utf8');
    expect(licence).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/i);
  });

  it.each(fontFiles)('%s correspond à l’empreinte SHA-256 notée dans SOURCES.md', (file) => {
    const sources = readFileSync(join(root, 'assets/fonts/SOURCES.md'), 'utf8');
    const digest = createHash('sha256')
      .update(readFileSync(join(root, file)))
      .digest('hex');
    const name = file.split('/').pop() ?? '';
    expect(sources).toContain(`| ${name} | ${digest} |`);
  });
});
