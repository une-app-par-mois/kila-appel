// EX-28 : relances à programmer (ticket 027, ADR-007). Une notification locale ne vérifie rien
// quand elle s'affiche : on calcule d'avance celles des 7 jours à venir, et l'appareil (ticket 028)
// les reprogramme à chaque écriture. Domaine pur : l'heure est passée en paramètre (CONV-11).
// Dates et heures locales en texte, jamais d'horodatage : la conversion vient au 028.
// ABS-04, SEC-12 : seuls des identifiants, des dates, des heures et des noms de groupes entrent ici.

import { isIsoDate } from '@/domain/formats';
import {
  DAY_MIN,
  dayNumber,
  INVALID_NOW,
  type IsoDate,
  isoFromDay,
  type LocalNow,
  minutes,
  type Season,
  slotDates,
  TIME,
  type Time,
  type WeeklySlot,
} from '@/domain/occurrences';

/** EX-28 : délais proposés, en minutes (décision du 2026-11-27, ticket 027). */
export const REMINDER_DELAYS = [10, 15, 20, 30, 45, 60] as const;
export const REMINDER_DELAY_DEFAULT = 30;
/** Plafond des notifications programmées sur iOS. */
export const MAX_REMINDERS = 64;
export const INVALID_DELAY = 'Délai de relance invalide (EX-28)';

export type ReminderSettings = { enabled: boolean; delayMin: number };
export type ReminderSlot = WeeklySlot & { groups: { id: number; name: string }[] };
export type SessionState = 'recorded' | 'prepared' | 'cancelled' | 'unscheduled';
/** Séance en base ; `slotId` null : appel sans créneau (EX-39), sans effet sur les relances. */
export type ReminderSession = { slotId: number | null; date: IsoDate; state: SessionState };

export type ReminderInput = {
  slots: ReminderSlot[];
  /** Groupes non archivés de la saison active : seuls eux sont nommés. */
  activeGroupIds: number[];
  season: Season | null;
  sessions: ReminderSession[];
  settings: ReminderSettings;
  now: LocalNow;
};

export type PlannedReminder = {
  slotId: number;
  date: IsoDate;
  startTime: Time;
  fireDate: IsoDate;
  fireTime: Time;
  groupNames: string[];
};

/** ADR-007 : rien au-delà de maintenant + 7 jours. */
const HORIZON_MIN = 7 * DAY_MIN;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * EX-36, EX-38 : une séance enregistrée, annulée ou non planifiée n'a pas de relance ; une séance
 * préparée la garde. Même règle que les appels manquants (EX-17).
 */
const closed = (sessions: ReminderSession[]): Set<string> =>
  new Set(
    sessions
      .filter((s) => s.slotId !== null && s.state !== 'prepared')
      .map((s) => `${s.slotId}|${s.date}`),
  );

/**
 * EX-28 : relances à programmer, les plus proches d'abord, 64 au plus. Occurrences d'hier à
 * aujourd'hui + 7, bornées par la saison active et la date d'effet de l'horaire ; moment = début
 * + délai, gardé s'il est strictement après maintenant et au plus maintenant + 7 jours (ADR-007).
 */
export const plannedReminders = ({
  slots,
  activeGroupIds,
  season,
  sessions,
  settings,
  now,
}: ReminderInput): PlannedReminder[] => {
  if (!isIsoDate(now.date) || !TIME.test(now.time)) throw new Error(INVALID_NOW);
  // EX-29 : une relance désactivée ne programme rien, quel que soit le délai enregistré.
  if (!settings.enabled || !season) return [];
  if (!(REMINDER_DELAYS as readonly number[]).includes(settings.delayMin))
    throw new Error(INVALID_DELAY);
  const active = new Set(activeGroupIds);
  const done = closed(sessions);
  const nowMin = minutes(now.time);
  const today = dayNumber(now.date);
  const from = isoFromDay(today - 1);
  const to = isoFromDay(today + 7);
  return slots
    .flatMap((slot) => {
      const groupNames = slot.groups.filter((g) => active.has(g.id)).map((g) => g.name);
      if (groupNames.length === 0) return [];
      return slotDates(slot, season, from, to)
        .filter((date) => !done.has(`${slot.id}|${date}`))
        .map((date) => {
          // Minutes depuis aujourd'hui 00:00 ; négatif pour la veille.
          const fire =
            (dayNumber(date) - today) * DAY_MIN + minutes(slot.startTime) + settings.delayMin;
          const dayOffset = Math.floor(fire / DAY_MIN);
          const inDay = fire - dayOffset * DAY_MIN;
          return {
            fire,
            reminder: {
              slotId: slot.id,
              date,
              startTime: slot.startTime,
              fireDate: isoFromDay(today + dayOffset),
              fireTime: `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`,
              groupNames,
            },
          };
        });
    })
    .filter(({ fire }) => fire > nowMin && fire <= nowMin + HORIZON_MIN)
    .sort((a, b) => a.fire - b.fire || a.reminder.slotId - b.reminder.slotId)
    .slice(0, MAX_REMINDERS)
    .map(({ reminder }) => reminder);
};
