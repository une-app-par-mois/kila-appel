import { fontFiles, theme } from '@/config/theme';
import jetons from '../../design/jetons.json';

describe('Thème dérivé de design/jetons.json (CONV-16)', () => {
  it('expose exactement les couleurs, statuts et états de séance des jetons', () => {
    expect(theme.colors).toEqual(jetons.couleurs);
    expect(theme.statuses).toEqual(jetons.statuts);
    expect(theme.sessionStates).toEqual(jetons.etatsSeance);
  });

  it('expose exactement les matières, rayons et mesures des jetons', () => {
    expect(theme.materials).toEqual(jetons.matieres);
    expect(theme.radii).toEqual(jetons.rayons);
    expect(theme.spacing).toBe(jetons.espace);
    expect(theme.minTouchTarget).toBe(jetons.zoneAppuiMin);
    expect(theme.minTextSize).toBe(jetons.texteMin);
    expect(theme.maxContentWidth).toBe(jetons.largeurContenuMax);
  });

  it('ne laisse aucune rubrique des jetons de côté', () => {
    const used = [
      'couleurs',
      'statuts',
      'etatsSeance',
      'polices',
      'matieres',
      'rayons',
      'espace',
      'zoneAppuiMin',
      'texteMin',
      'largeurContenuMax',
    ];
    expect(Object.keys(jetons).filter((k) => k !== '$commentaire')).toEqual(used);
  });

  it.each([
    ['text', 'texte'],
    ['textSemi', 'texteSemi'],
    ['title', 'titre'],
    ['digits', 'chiffres'],
  ] as const)('police %s : la famille et la graisse des jetons (%s)', (key, jetonKey) => {
    const [family, weight] = jetons.polices[jetonKey].split(/ (?=\d+$)/);
    const expected: Record<string, string> = {
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
    };
    expect(theme.fonts[key]).toBe(`${family?.replaceAll(' ', '')}-${expected[weight ?? '']}`);
    expect(fontFiles).toContain(`./assets/fonts/${theme.fonts[key]}.ttf`);
  });
});
