// Durée et horaire d'un créneau (EX-07) : domaine pur. La plage (1 min à 24 h) est vérifiée par
// validateSlot ; l'affichage de la durée est dans les libellés (« 1 h 30 »).

/** « 90 », « 45 min », « 2 h », « 1 h 30 », « 1h30 » → minutes ; `null` si illisible. */
export const parseDuration = (text: string): number | null => {
  const value = text.trim().toLowerCase();
  const minutes = /^(\d{1,4})(\s*min)?$/.exec(value);
  if (minutes) return Number(minutes[1]);
  const hours = /^(\d{1,2})\s*h(?:\s*(\d{1,2}))?$/.exec(value);
  if (!hours) return null;
  const m = Number(hours[2] ?? 0);
  return m < 60 ? Number(hours[1]) * 60 + m : null;
};

/** Heure de fin HH:MM ; après minuit, l'heure du lendemain (« 23:30 » + 60 → « 00:30 »). */
export const endTime = (start: string, durationMin: number): string => {
  const total = (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + durationMin) % 1440;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/** « 9:00 », « 9h00 », « 18 h 30 » → « HH:MM » ; autre saisie rendue telle quelle (validée ensuite). */
export const normalizeTime = (text: string): string => {
  const value = text.trim();
  const time = /^(\d{1,2})\s*[:hH]\s*(\d{2})$/.exec(value);
  return time ? `${(time[1] ?? '').padStart(2, '0')}:${time[2]}` : value;
};
