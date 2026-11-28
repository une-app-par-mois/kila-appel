/**
 * @jest-environment node
 */
// SEC-08 (ticket 039) : échappement et gabarit balisé du HTML du rapport PDF ; contrôle statique
// (défense en profondeur) : `html` n'est appelé que comme gabarit balisé dans tout src/.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { scriptKind, walkSources } from '@/__fixtures__/sourceFiles';
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

/** Appels interdits : `html(…)`, `html.call(…)`, `html.apply(…)`, et `as TemplateStringsArray`. */
const forbiddenUses = (file: string, text: string): string[] => {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const target = ts.isPropertyAccessExpression(callee) ? callee.expression : callee;
      if (ts.isIdentifier(target) && target.text === 'html') found.push(node.getText(source));
    }
    if (
      (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
      node.type.getText(source) === 'TemplateStringsArray'
    )
      found.push(node.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

describe('SEC-08 contrôle statique du gabarit', () => {
  const root = join(__dirname, '..', '..');

  it('SEC-08 le contrôle voit un appel direct, un appel par call et un faux gabarit', () => {
    const sample = [
      "html(['<b>'] as unknown as TemplateStringsArray);",
      'html.call(null, x);',
      'const t = <TemplateStringsArray>y;',
      'html`<p>x</p>`;',
    ].join('\n');
    expect(forbiddenUses('exemple.ts', sample)).toHaveLength(4);
  });

  it('SEC-08 dans src/, html n’est appelé que comme gabarit balisé', () => {
    const offenders = walkSources(join(root, 'src')).flatMap((file) =>
      forbiddenUses(file, readFileSync(file, 'utf8')).map(
        (use) => `${relative(root, file)} : ${use}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
