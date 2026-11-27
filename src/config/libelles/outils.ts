// Aides communes aux fichiers de libellés (CONV-03).

/** « a », « a et b », « a, b et c ». */
export const joinFr = (parts: string[]): string =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;

/** « 1 groupe », « 3 groupes ». */
export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
