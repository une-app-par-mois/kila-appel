// Erreurs des dépôts : un code, jamais une donnée (ABS-04), comme InputError pour les saisies.
export type DataErrorCode = 'NOT_FOUND' | 'SESSIONS_OUTSIDE_SEASON' | 'DB_NOT_READY';

export class DataError extends Error {
  constructor(readonly code: DataErrorCode) {
    super(`Données : ${code}`);
    this.name = 'DataError';
  }
}

/** Une modification qui ne touche aucune ligne vise un élément introuvable. */
export const expectChanged = ({ changes }: { changes: number }): void => {
  if (changes === 0) throw new DataError('NOT_FOUND');
};

/** Une ligne lue doit exister. */
export const expectFound = <T>(row: T | undefined): T => {
  if (row === undefined) throw new DataError('NOT_FOUND');
  return row;
};
