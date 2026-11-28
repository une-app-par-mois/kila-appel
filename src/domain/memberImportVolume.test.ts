// EX-30, NF-08 : aperçu d'un import de 2 000 lignes contre 10 000 membres, en temps linéaire.
// Limite large (machines de CI lentes) ; données fictives fabriquées (SEC-13).
import { numbered, OPTIONS } from '@/__fixtures__/importRows';
import { type ExistingMember, previewImport } from '@/domain/memberImport';

const LIMIT_MS = 2000;

const existingMembers: ExistingMember[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  lastName: `Nom${i}`,
  firstName: `Prénom${i}`,
  birthDate: i % 2 === 0 ? '2015-03-14' : null,
  archivedAt: null,
}));
// Une ligne sur dix est un membre déjà dans l'appli ; les autres sont nouvelles.
const data = Array.from({ length: 2_000 }, (_, i) =>
  i % 10 === 0
    ? [`nom${i}`, `prénom${i}`, '14/03/2015', '', 'Poussins mercredi']
    : [`Neuf${i}`, 'Alix', '', '', 'Adultes jeudi'],
);

describe('NF-08 volume de l’import', () => {
  it('EX-30 2 000 lignes contre 10 000 membres : aperçu juste et rapide', () => {
    const rows = numbered(['nom', 'prenom', 'date_naissance', 'telephone', 'groupe'], ...data);
    const start = performance.now();
    const result = previewImport(rows, { ...OPTIONS, existingMembers });
    const duration = performance.now() - start;
    if (!result.ok) throw new Error(result.reason);
    expect(result.preview.counts).toEqual({
      rows: 2000,
      toImport: 1800,
      invalid: 0,
      duplicates: 200,
    });
    expect(duration).toBeLessThan(LIMIT_MS);
  });
});
