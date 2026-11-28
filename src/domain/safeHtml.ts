// SEC-08 (ticket 039) : HTML du rapport PDF construit par un gabarit balisé. Règle structurelle :
// le texte littéral du gabarit est écrit dans le code ; toute valeur interpolée est échappée par
// `escapeHtml`, sauf un fragment `SafeHtml` déjà produit par ce gabarit. Un objet qui imite un
// fragment est refusé : seuls ceux créés ici sont reconnus (registre privé).

/** Fragment HTML produit par `html` (jamais construit à la main). */
export type SafeHtml = { readonly html: string };

/** Valeurs acceptées dans le gabarit ; tout le reste lève une erreur. */
export type HtmlValue = string | number | SafeHtml | readonly SafeHtml[];

const trusted = new WeakSet<object>();

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** SEC-08 : la seule fonction d'échappement du rapport (`&`, `<`, `>`, `"`, `'`). */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);

const fragment = (text: string): SafeHtml => {
  const value = Object.freeze({ html: text });
  trusted.add(value);
  return value;
};

/** Vrai pour un fragment créé par `html` ou `joinHtml`. */
export const isSafeHtml = (value: unknown): value is SafeHtml =>
  typeof value === 'object' && value !== null && trusted.has(value);

const render = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);
  if (typeof value === 'number' && Number.isFinite(value)) return escapeHtml(String(value));
  if (isSafeHtml(value)) return value.html;
  if (Array.isArray(value)) return value.map(render).join('');
  // Ni la valeur ni son type dans le message (ABS-04).
  throw new Error('Valeur refusée dans le HTML du rapport (SEC-08)');
};

/** Gabarit balisé : html`<td>${nom}</td>` échappe `nom`. */
export const html = (strings: TemplateStringsArray, ...values: readonly HtmlValue[]): SafeHtml => {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? '');
  });
  return fragment(out);
};

/** Fragments mis bout à bout. */
export const joinHtml = (parts: readonly SafeHtml[]): SafeHtml => fragment(render(parts));

/** Texte d'un fragment, pour l'assembler en document (`reportHtml`) ou le tester. */
export const safeHtmlText = (value: SafeHtml): string => render(value);
