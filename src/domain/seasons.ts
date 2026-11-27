// Saison créée à la première ouverture (P1, ticket 012b) : du 1er septembre au 31 août (décision
// du porteur du 2026-11-27), nommée « 2026-2027 » ; avant septembre, celle commencée l'an d'avant.

/** `today` au format AAAA-MM-JJ, déjà vérifié par l'appelant. */
export const firstSeason = (today: string) => {
  const year = Number(today.slice(0, 4));
  const start = Number(today.slice(5, 7)) >= 9 ? year : year - 1;
  return {
    name: `${start}-${start + 1}`,
    startDate: `${start}-09-01`,
    endDate: `${start + 1}-08-31`,
  };
};
