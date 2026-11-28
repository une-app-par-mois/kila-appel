// Textes des écrans d'export (maquettes « Statistiques », « Export CSV des présences », « États
// vides » ; ticket 037, EX-31, SEC-09). Repris par le rapport PDF (ticket 041). Les textes du
// fichier CSV restent dans `stats.csv` (ticket 036).

/** Espace insécable (U+00A0), comme dans « 87 % » (`attendanceRate.ts`). */
const NBSP = String.fromCharCode(0xa0);

/** « 2 418 » : milliers séparés par une espace insécable. */
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export const exportScreens = {
  attendanceExport: {
    /** Bouton de l'onglet Statistiques (un tiers de la rangée de la maquette). */
    open: 'Exporter (CSV)',
    title: 'Exporter les présences',
    group: 'Groupe',
    allGroups: 'Tous les groupes',
    /** Groupe archivé dans la liste (décision du porteur du 2026-11-28). */
    archivedGroup: (name: string) => `${name} · Archivé`,
    from: 'Du',
    to: 'Au',
    placeholder: 'JJ/MM/AAAA',
    /**
     * SEC-09 : avertissement de la maquette, au caractère près, jamais réduit. « en clair » est en
     * gras ; le texte se lit d'un bloc.
     */
    warningBefore: 'Le fichier contient les noms des membres et leurs présences, ',
    warningStrong: 'en clair',
    warningAfter: '. Partagez-le seulement avec qui doit le recevoir.',
    /** « Exporter (2 418 lignes) ». */
    export: (n: number) => `Exporter (${thousands(n)} ${n > 1 ? 'lignes' : 'ligne'})`,
    /** Pendant l'écriture et la feuille de partage (maquette, décision du 2026-11-28). */
    exporting: 'Export en cours…',
    failed: 'Le fichier n’a pas pu être exporté. Réessayez.',
    /** Maquette « États vides » : aucune présence sur la période. */
    empty: 'Aucune présence sur cette période : rien à exporter.',
    /** Plus de 50 000 lignes (décision du porteur du 2026-11-28). */
    tooMany: 'Trop de lignes : réduisez la période ou choisissez un groupe',
  },
} as const;
