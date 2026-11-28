// Adaptateur expo-print (ticket 040a, EX-32 ; zone sensible : WebView, copie en clair dans le
// cache). Seul importeur du module (src/staticChecksPrint.test.ts, ABS-01) : `printToFileAsync` seul,
// argument écrit en entier aux clés `html`, `width`, `height`, jamais `uri` (SEC-08, ticket 038).
// Le HTML est un `ReportHtml`, que seul `reportHtml` produit (valeurs échappées, CSP en tête). Le
// chemin rendu est contrôlé par `printedPath` (src/data/expoExports.ts, seul à toucher aux
// fichiers) : enfant direct de `cache/Print/`, vidé au démarrage, après Tout effacer et à chaque
// rapport (SEC-10).
import { printToFileAsync } from 'expo-print';
import { printedPath } from '@/data/expoExports';
import type { ReportHtml } from '@/domain/reportHtml';

/** Orientation de la page A4, en points (1/72 de pouce), liste fermée. */
const A4 = {
  portrait: { width: 595, height: 842 },
  landscape: { width: 842, height: 595 },
} as const;
export type PageOrientation = keyof typeof A4;

// Erreur du module natif remplacée : elle peut citer le chemin du fichier (ABS-04).
const unprintable = () => new Error('Rendu du PDF impossible');

/**
 * EX-32 : rend le HTML du rapport en PDF A4 dans `cache/Print/` et rend le chemin du fichier.
 * Chemin hors de `cache/Print/` : refus sans le chemin (le fichier reste au vidage du dossier).
 * Rendu en échec : un fichier partiel peut rester dans `cache/Print/` (Android le crée avant le
 * rendu) ; le cycle du rapport (040b) vide le dossier dans son `finally`.
 */
export const printPdf = async (html: ReportHtml, orientation: PageOrientation): Promise<string> => {
  const { width, height } = A4[orientation];
  let uri: unknown;
  try {
    ({ uri } = await printToFileAsync({ html, width, height }));
  } catch {
    throw unprintable();
  }
  // iOS (`ExpoPrintToFile.swift`, 58.0.9) peut résoudre sans `uri` au lieu de rejeter.
  if (typeof uri !== 'string') throw unprintable();
  return printedPath(uri);
};
