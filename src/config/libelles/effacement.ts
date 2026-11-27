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

export const effacement = {
  retention: {
    section: 'Conservation',
    /** « Garder les [3 ▾] dernières saisons » (maquette). */
    keepBefore: 'Garder les',
    keepAfter: 'dernières saisons',
    /** Liste plein écran du choix, et ligne lue par le lecteur d'écran. */
    choiceTitle: 'Saisons gardées',
    choice: seasonCount,
    accessibility: (n: number) => `Garder les ${n} dernières saisons`,
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
     * ses 3 groupes, 2 créneaux, 31 séances et 412 présences. » Un compte nul n'est pas cité.
     * « définitivement » est en gras (maquette) : le message se lit d'un bloc.
     */
    messageBefore: 'Seront effacés ',
    messageStrong: 'définitivement',
    messageAfter: (names: string[], c: PurgeCounts) => {
      const one = names.length === 1;
      const seasons = one ? `la saison ${names[0]}` : `les saisons ${joinFr(names)}`;
      const parts = [
        c.groups > 0 && plural(c.groups, 'groupe', 'groupes'),
        c.slots > 0 && plural(c.slots, 'créneau', 'créneaux'),
        c.sessions > 0 && plural(c.sessions, 'séance', 'séances'),
        c.attendances > 0 && plural(c.attendances, 'présence', 'présences'),
      ].filter((part): part is string => typeof part === 'string');
      const content = parts.length === 0 ? '' : `, ${one ? 'ses' : 'leurs'} ${joinFr(parts)}`;
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
