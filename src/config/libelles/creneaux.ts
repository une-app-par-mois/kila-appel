// Libellés des créneaux hebdomadaires (EX-07, CONV-03).
import { plural } from './outils';

const pad = (n: number) => String(n).padStart(2, '0');

export const creneaux = {
  slots: {
    title: 'Créneaux',
    create: 'Nouveau créneau',
    empty:
      'Aucun créneau. Déclarez quand vos groupes se réunissent pour que l’appli propose l’appel au bon moment.',
    noActiveSeason:
      'Aucune saison active. Activez ou créez une saison pour y déclarer vos créneaux.',
    toSeasons: 'Voir les saisons',
    /** « Mercredi 14:00 – 15:30 ». */
    row: (day: string, start: string, end: string) => `${day} ${start} – ${end}`,
    /** « Poussins mercredi · Gymnase Jean-Moulin ». */
    details: (parts: string[]) => parts.join(' · '),
    count: (n: number) => (n === 0 ? 'Aucun créneau' : plural(n, 'créneau', 'créneaux')),
  },
  weekdays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  weekdaysShort: ['L', 'M', 'Me', 'J', 'V', 'S', 'D'],
  /** « 1 h 30 », « 2 h », « 45 min ». */
  duration: (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${pad(m)}`;
  },
  slotForm: {
    createTitle: 'Nouveau créneau',
    /** « Mercredi 14:00 ». */
    editTitle: (day: string, start: string) => `${day} ${start}`,
    weekday: 'Jour',
    start: 'Début',
    timePlaceholder: 'HH:MM',
    duration: 'Durée',
    durationPlaceholder: '1 h 30',
    group: 'Groupe',
    noGroup: 'Choisir un groupe',
    place: 'Lieu',
    name: 'Nom',
    optional: 'facultatif',
    namePlaceholder: 'Par exemple « Technique »',
    create: 'Enregistrer le créneau',
    delete: 'Supprimer le créneau',
  },
  slotDeletion: {
    title: 'Supprimer ce créneau ?',
    message: (withDraft: boolean) =>
      withDraft
        ? 'Le créneau sera supprimé. L’appel interrompu sur ce créneau sera effacé.'
        : 'Le créneau sera supprimé.',
    note: 'Les séances déjà enregistrées sont conservées.',
    confirm: 'Supprimer',
  },
} as const;
