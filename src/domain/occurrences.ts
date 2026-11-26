// Séances calculées à la volée (ADR-004) : un créneau hebdomadaire et une période donnent des
// dates ; aucune séance n'est créée d'avance (EX-08). Domaine pur : l'heure est passée en
// paramètre (CONV-11), en date et heure locales. Le calcul porte sur des dates de calendrier,
// jamais sur des horodatages : un changement d'heure ne décale aucune séance.
// Hors périmètre : créneaux ponctuels (F-10), séances préparées ou annulées (F-13).

export type IsoDate = string; // AAAA-MM-JJ (RM-04)
export type Time = string; // HH:MM

export type WeeklySlot = {
  id: number;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lundi … 7 = dimanche
  startTime: Time;
  durationMin: number;
  createdOn: IsoDate;
};
export type Season = { startDate: IsoDate; endDate: IsoDate };
export type LocalNow = { date: IsoDate; time: Time };
export type Occurrence = { slotId: number; date: IsoDate; startTime: Time };
export type RecordedSession = { slotId: number; date: IsoDate };

const DAY_MS = 86_400_000;
const DAY_MIN = 1440;

/** Numéro de jour depuis le 1970-01-01 (calendrier, sans fuseau). */
const dayNumber = (date: IsoDate): number =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) /
  DAY_MS;
const isoFromDay = (day: number): IsoDate => new Date(day * DAY_MS).toISOString().slice(0, 10);
// Le 1970-01-01 était un jeudi (4).
const weekdayOf = (day: number): number => ((((day + 3) % 7) + 7) % 7) + 1;
const minutes = (time: Time): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
// Dates ISO : l'ordre alphabétique est l'ordre chronologique.
const later = (a: IsoDate, b: IsoDate): IsoDate => (b.localeCompare(a) > 0 ? b : a);
const earlier = (a: IsoDate, b: IsoDate): IsoDate => (b.localeCompare(a) < 0 ? b : a);

/** EX-08 : dates du créneau entre `from` et `to` inclus, dans la saison, jamais avant sa création. */
export const slotDates = (
  slot: WeeklySlot,
  season: Season,
  from: IsoDate,
  to: IsoDate,
): IsoDate[] => {
  const first = dayNumber(later(later(from, season.startDate), slot.createdOn));
  const last = dayNumber(earlier(to, season.endDate));
  const dates: IsoDate[] = [];
  const offset = (slot.weekday - weekdayOf(first) + 7) % 7;
  for (let day = first + offset; day <= last; day += 7) dates.push(isoFromDay(day));
  return dates;
};

type Timed = Occurrence & { start: number; end: number };

/** Occurrences des créneaux entre deux dates, avec début et fin en minutes absolues. */
const timedOccurrences = (slots: WeeklySlot[], season: Season, from: IsoDate, to: IsoDate) =>
  slots.flatMap((slot) =>
    slotDates(slot, season, from, to).map((date): Timed => {
      const start = dayNumber(date) * DAY_MIN + minutes(slot.startTime);
      return {
        slotId: slot.id,
        date,
        startTime: slot.startTime,
        start,
        end: start + slot.durationMin,
      };
    }),
  );

const byTime = (a: Occurrence, b: Occurrence) =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.slotId - b.slotId;
const plain = ({ slotId, date, startTime }: Timed): Occurrence => ({ slotId, date, startTime });
const nowMinutes = (now: LocalNow) => dayNumber(now.date) * DAY_MIN + minutes(now.time);

/**
 * EX-09 : séance en cours ; sinon la plus proche de maintenant (fin passée ou début à venir),
 * celles du jour d'abord. À égalité, une séance finie passe avant une séance à venir.
 */
export const proposedSession = (
  slots: WeeklySlot[],
  season: Season,
  now: LocalNow,
): Occurrence | null => {
  const t = nowMinutes(now);
  const today = dayNumber(now.date);
  // Une semaine de part et d'autre contient toujours une occurrence de chaque créneau actif.
  const all = timedOccurrences(slots, season, isoFromDay(today - 7), isoFromDay(today + 7));
  const current = all.filter((o) => o.start <= t && t < o.end).sort((a, b) => b.start - a.start)[0];
  if (current) return plain(current);
  const distance = (o: Timed) => (t < o.start ? o.start - t : t - o.end);
  const isPast = (o: Timed) => (o.end <= t ? 0 : 1);
  const sameDay = all.filter((o) => o.date === now.date);
  const best = (sameDay.length > 0 ? sameDay : all).sort(
    (a, b) => distance(a) - distance(b) || isPast(a) - isPast(b) || byTime(a, b),
  )[0];
  return best ? plain(best) : null;
};

/** EX-17 : séances finies (début + durée atteints) sans séance enregistrée pour ce créneau (RM-05). */
export const missingRollCalls = (
  slots: WeeklySlot[],
  season: Season,
  recorded: RecordedSession[],
  now: LocalNow,
): Occurrence[] => {
  const t = nowMinutes(now);
  const done = new Set(recorded.map((r) => `${r.slotId}|${r.date}`));
  return timedOccurrences(slots, season, season.startDate, now.date)
    .filter((o) => o.end <= t && !done.has(`${o.slotId}|${o.date}`))
    .map(plain)
    .sort(byTime);
};
