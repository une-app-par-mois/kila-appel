// SEC-08 (ticket 039) : échappement et gabarit balisé du HTML du rapport PDF.
import { escapeHtml, html, isSafeHtml, joinHtml, safeHtmlText } from '@/domain/safeHtml';

describe('SEC-08 échappement du HTML', () => {
  it('SEC-08 escapeHtml remplace & < > " et apostrophe, rien d’autre', () => {
    expect(escapeHtml(`<a href="x">Tom & O'Brien</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; O&#39;Brien&lt;/a&gt;',
    );
    expect(escapeHtml('Zoé · 87 %')).toBe('Zoé · 87 %');
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('SEC-08 gabarit : chaque valeur interpolée est échappée, nombres compris', () => {
    const name = '</style><script>alert(1)</script>';
    expect(safeHtmlText(html`<td>${name}</td><td>${42}</td>`)).toBe(
      '<td>&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;</td><td>42</td>',
    );
  });

  it('SEC-08 gabarit : un fragment déjà sûr est gardé tel quel, une liste est jointe', () => {
    const rows = ['<b>', 'Léa'].map((v) => html`<li>${v}</li>`);
    const list = html`<ul>${rows}</ul>`;
    expect(isSafeHtml(list)).toBe(true);
    expect(safeHtmlText(list)).toBe('<ul><li>&lt;b&gt;</li><li>Léa</li></ul>');
    expect(safeHtmlText(joinHtml(rows))).toBe('<li>&lt;b&gt;</li><li>Léa</li>');
  });

  it('SEC-08 gabarit : un objet qui imite un fragment sûr est refusé', () => {
    const fake = { html: '<script>' } as unknown as ReturnType<typeof html>;
    expect(isSafeHtml(fake)).toBe(false);
    expect(() => html`${fake}`).toThrow('SEC-08');
  });

  it('SEC-08 gabarit : null, undefined, booléen, objet et nombre non fini refusés', () => {
    for (const value of [null, undefined, true, {}, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => html`<p>${value as unknown as string}</p>`).toThrow('SEC-08');
    }
  });

  it('SEC-08 un fragment sûr est figé', () => {
    const fragment = html`<p>${'x'}</p>`;
    expect(Object.isFrozen(fragment)).toBe(true);
  });
});
