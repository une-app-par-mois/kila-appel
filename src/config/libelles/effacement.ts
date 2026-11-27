// Textes de la conservation et de la purge des anciennes saisons (ticket 015b, EX-24, SEC-11,
// ABS-05) : maquettes « Sauvegarde et données », « Purge des anciennes saisons » et Paramètres.
import { joinFr, plural } from './outils';

/** Ce que la purge effacera, tel que `purgeImpact` le compte. */
export type PurgeCounts = {
  groups: number;
  slots: number;
  sessions: number;
  attendances: number;
  members: number;
  rollCallDraft: boolean;
};

const seasonCount = (n: number) => plural(n, 'saison', 'saisons');

/**
 * Éléments de la confirmation de purge, accordés (ticket 020, réponses du porteur du 2026-11-27) :
 * un compte de 1 s'écrit sans chiffre avec son possessif (« son groupe », « sa séance », ou « leur »
 * pour plusieurs saisons) ; une suite d'éléments au pluriel n'a qu'un « ses » (« leurs ») en tête.
 * Les comptes nuls ne sont pas cités.
 */
const purgeItems = (c: PurgeCounts, several: boolean): string[] => {
  const items = [
    { n: c.groups, one: 'groupe', many: 'groupes', own: 'son' },
    { n: c.slots, one: 'créneau', many: 'créneaux', own: 'son' },
    { n: c.sessions, one: 'séance', many: 'séances', own: 'sa' },
    { n: c.attendances, one: 'présence', many: 'présences', own: 'sa' },
  ].filter((item) => item.n > 0);
  return items.map((item, i) => {
    if (item.n === 1) return `${several ? 'leur' : item.own} ${item.one}`;
    const runStart = i === 0 || items[i - 1]?.n === 1;
    return `${runStart ? (several ? 'leurs ' : 'ses ') : ''}${plural(item.n, item.one, item.many)}`;
  });
};

export const effacement = {
  retention: {
    section: 'Conservation',
    /**
     * « Garder les [3 ▾] dernières saisons » (maquette) ; pour 1, « Garder la [1 ▾] dernière
     * saison » (ticket 020, réponse du porteur du 2026-11-27).
     */
    keepBefore: (n: number) => (n === 1 ? 'Garder la' : 'Garder les'),
    keepAfter: (n: number) => (n === 1 ? 'dernière saison' : 'dernières saisons'),
    /** Liste plein écran du choix, et ligne lue par le lecteur d'écran. */
    choiceTitle: 'Saisons gardées',
    choice: seasonCount,
    /** Lu sans le chiffre pour 1 : « Garder la dernière saison ». */
    accessibility: (n: number) =>
      n === 1 ? 'Garder la dernière saison' : `Garder les ${n} dernières saisons`,
    none: 'Aucune saison ne dépasse cette durée.',
    over: (names: string[]) =>
      names.length === 1
        ? `1 saison dépasse cette durée : ${names[0]}.`
        : `${names.length} saisons dépassent cette durée : ${names.join(', ')}.`,
    purge: (names: string[]) =>
      names.length === 1 ? `Purger ${names[0]}…` : `Purger ${names.length} saisons…`,
    saveFailed: 'La durée de conservation n’a pas pu être enregistrée. Réessayez.',
    /** Ligne de Paramètres (maquette : « 3 saisons »). */
    settingsRow: seasonCount,
  },
  purge: {
    title: (names: string[]) =>
      names.length === 1 ? `Purger ${names[0]} ?` : `Purger ${names.length} saisons ?`,
    /**
     * Réponse du porteur du 2026-11-27 : « Seront effacés définitivement : la saison 2023-2024,
     * ses 3 groupes, 2 créneaux, 31 séances et 412 présences. » Accords : `purgeItems`.
     * « définitivement » est en gras (maquette) : le message se lit d'un bloc.
     */
    messageBefore: 'Seront effacés ',
    messageStrong: 'définitivement',
    messageAfter: (names: string[], c: PurgeCounts) => {
      const one = names.length === 1;
      const seasons = one ? `la saison ${names[0]}` : `les saisons ${joinFr(names)}`;
      const parts = purgeItems(c, !one);
      const content = parts.length === 0 ? '' : `, ${joinFr(parts)}`;
      return ` : ${seasons}${content}.`;
    },
    /** Membres effacés avec les saisons (décision du porteur du 2026-11-27), et l'appel en cours. */
    note: (c: PurgeCounts) =>
      [
        c.members === 0
          ? 'Aucun membre ne sera effacé.'
          : c.members === 1
            ? '1 membre qui ne figure plus dans aucune saison conservée sera aussi effacé.'
            : `${c.members} membres qui ne figurent plus dans aucune saison conservée seront aussi effacés.`,
        c.rollCallDraft && 'L’appel en cours sera aussi effacé.',
      ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n'),
    cancel: 'Garder',
    confirm: 'Purger',
    failed: 'La purge n’a pas abouti. Rien n’a été effacé.',
  },
  /** Tout effacer (ticket 015f, EX-23) : maquettes « Tout effacer », Sauvegarde et Paramètres. */
  eraseAll: {
    /** Ligne de Paramètres, section de Sauvegarde. */
    section: 'Tout effacer',
    intro: 'Efface toutes les données de cet appareil. Double confirmation.',
    open: 'Tout effacer…',
    title: 'Tout effacer ?',
    /** Texte de la maquette, tel quel (réponse du porteur du 2026-11-27) ; « définitivement » en gras. */
    warningBefore: 'Toutes les données de cet appareil seront effacées ',
    warningStrong: 'définitivement',
    warningAfter:
      ' : membres, contacts d’urgence, groupes, créneaux, séances, présences et réglages.',
    warningNote: 'Sans sauvegarde, elles ne pourront pas être retrouvées.',
    /** Mot à taper (majuscules et espaces autour ignorés, réponse du porteur du 2026-11-27). */
    word: 'EFFACER',
    field: 'Pour confirmer, tapez EFFACER',
    cancel: 'Garder',
    confirm: 'Tout effacer',
    failed: 'L’effacement n’a pas abouti. Rien n’a été effacé.',
  },
};
