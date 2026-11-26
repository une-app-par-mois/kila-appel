/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fontFiles } from '@/config/theme';
import app from '../../app.json';

const root = join(__dirname, '..', '..');

describe('Polices embarquées (charte §5, ABS-01 : aucune police chargée par Internet)', () => {
  it('embarque chaque police du thème par l’extension expo-font, au build', () => {
    const plugin = app.expo.plugins.find(
      (p): p is [string, { fonts: string[] }] => Array.isArray(p) && p[0] === 'expo-font',
    );
    expect(plugin?.[1].fonts).toEqual(fontFiles);
  });

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
