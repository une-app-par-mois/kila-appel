// Séances calculées à la volée (ADR-004) : un créneau hebdomadaire et une période donnent des
// dates ; aucune séance n'est créée d'avance (EX-08). Domaine pur : l'heure est passée en
// paramètre (CONV-11), en date et heure locales. Le calcul porte sur des dates de calendrier,
// jamais sur des horodatages : un changement d'heure ne décale aucune séance.
// Hors périmètre : créneaux ponctuels (F-10), séances préparées ou annulées (F-13).

import { isIsoDate } from '@/domain/formats';

export type IsoDate = string; // AAAA-MM-JJ (RM-04)
export type Time = string; // HH:MM

export type WeeklySlot = {
  id: number;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lundi … 7 = dimanche
  startTime: Time;
  durationMin: number;
  scheduleFrom: IsoDate; // date d'effet de l'horaire actuel (EX-07, EX-08)
};
export type Season = { startDate: IsoDate; endDate: IsoDate };
export type LocalNow = { date: IsoDate; time: Time };
export type Occurrence = { slotId: number; date: IsoDate; startTime: Time };
export type RecordedSession = { slotId: number; date: IsoDate };

const DAY_MS = 86_400_000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const INVALID_NOW = 'Date ou heure invalide (RM-04)';

/** `now` vient de l'appelant : vérifié (RM-04). Les créneaux viennent de la base, déjà vérifiés. */
const checkNow = (now: LocalNow): void => {
  if (!isIsoDate(now.date) || !TIME.test(now.time)) throw new Error(INVALID_NOW);
};
const DAY_MIN = 1440;

/** Numéro de jour depuis le 1970-01-01 (calendrier, sans fuseau). */
const dayNumber = (date: IsoDate): number =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) /
  DAY_MS;
const isoFromDay = (day: number): IsoDate => new Date(day * DAY_MS).toISOString().slice(0, 10);
// Le 1970-01-01 était un jeudi (4).
const weekdayOf = (day: number): number => ((((day + 3) % 7) + 7) % 7) + 1;

/** Jour de la semaine d'une date, 1 = lundi … 7 = dimanche (en-tête de l'appel). */
export const weekdayOfDate = (date: IsoDate): number => weekdayOf(dayNumber(date));

/** EX-17 : `date` est un jour du créneau, depuis sa date d'effet, jamais future (décision du 2026-11-27). */
export const isSlotDate = (
  slot: { weekday: number; scheduleFrom: IsoDate },
  date: IsoDate,
  today: IsoDate,
): boolean => date <= today && date >= slot.scheduleFrom && weekdayOfDate(date) === slot.weekday;
const minutes = (time: Time): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
// Dates ISO : l'ordre alphabétique est l'ordre chronologique.
const later = (a: IsoDate, b: IsoDate): IsoDate => (b.localeCompare(a) > 0 ? b : a);
const earlier = (a: IsoDate, b: IsoDate): IsoDate => (b.localeCompare(a) < 0 ? b : a);

/** EX-08 : dates du créneau entre `from` et `to` inclus, dans la saison, jamais avant la date d'effet de son horaire. */
export const slotDates = (
  slot: WeeklySlot,
  season: Season,
  from: IsoDate,
  to: IsoDate,
): IsoDate[] => {
  const first = dayNumber(later(later(from, season.startDate), slot.scheduleFrom));
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
 * EX-09 : séance en cours ; sinon la plus proche de maintenant (fin passée ou début à venir plus
 * tard dans la journée, jamais un jour futur), celles du jour d'abord (qui commencent ou finissent
 * aujourd'hui). À égalité, une séance finie passe avant une séance à venir.
 */
export const proposedSession = (
  slots: WeeklySlot[],
  season: Season,
  now: LocalNow,
): Occurrence | null => {
  checkNow(now);
  const t = nowMinutes(now);
  const today = dayNumber(now.date);
  // La semaine passée contient toujours une occurrence de chaque créneau actif. Jamais une date
  // future : l'appel d'une séance à venir un autre jour ne s'enregistre pas (décision du 2026-11-27).
  const all = timedOccurrences(slots, season, isoFromDay(today - 7), now.date);
  const current = all
    .filter((o) => o.start <= t && t < o.end)
    .sort((a, b) => b.start - a.start || a.slotId - b.slotId)[0];
  if (current) return plain(current);
  const distance = (o: Timed) => (t < o.start ? o.start - t : t - o.end);
  const isPast = (o: Timed) => (o.end <= t ? 0 : 1);
  // « Du jour » : commence ou finit aujourd'hui (une séance finie juste après minuit en fait partie).
  const sameDay = all.filter((o) => o.date === now.date || Math.floor(o.end / DAY_MIN) === today);
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
  checkNow(now);
  const t = nowMinutes(now);
  const done = new Set(recorded.map((r) => `${r.slotId}|${r.date}`));
  return timedOccurrences(slots, season, season.startDate, now.date)
    .filter((o) => o.end <= t && !done.has(`${o.slotId}|${o.date}`))
    .map(plain)
    .sort(byTime);
};
