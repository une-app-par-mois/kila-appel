// Thème de l'appli : dérivé de design/jetons.json, source unique de la charte (CONV-16).
// Aucune valeur recopiée : modifier un jeton modifie le thème (contrastes : scripts/contrastes.mjs).
import jetons from '../../design/jetons.json';

/** Polices embarquées par l'extension expo-font ; le nom de fichier est le nom PostScript. */
export const fonts = {
  text: 'IBMPlexSans-Regular',
  textSemi: 'IBMPlexSans-SemiBold',
  title: 'IBMPlexSans-Bold',
  digits: 'IBMPlexMono-Medium',
} as const;

export const fontFiles = Object.values(fonts).map((name) => `./assets/fonts/${name}.ttf`);

export const theme = {
  colors: jetons.couleurs,
  statuses: jetons.statuts,
  sessionStates: jetons.etatsSeance,
  fonts,
  materials: jetons.matieres,
  radii: jetons.rayons,
  spacing: jetons.espace,
  minTouchTarget: jetons.zoneAppuiMin,
  minTextSize: jetons.texteMin,
  maxContentWidth: jetons.largeurContenuMax,
} as const;
