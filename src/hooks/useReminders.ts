// Reprogrammation des relances (ticket 028b, EX-28, ADR-007) : une notification locale ne vérifie
// rien quand elle s'affiche, donc tout est annulé puis reprogrammé à l'ouverture, au retour au
// premier plan et après chaque écriture (notifyDataChanged, effacement compris). Une seule à la
// fois, et la dernière demande gagne : les demandes reçues pendant un passage n'en font qu'un
// autre. Rien ne part tant que la base n'est pas prête, ni pendant un effacement, une restauration
// ou un export (verrou des fichiers) : la demande attend sa libération.
// ABS-04 : seuls des codes sont journalisés ; un échec ne bloque jamais l'appli.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import {
  cancelAllReminders,
  createReminderChannel,
  dismissStaleReminders,
  reminderPermission,
  scheduleReminders,
  showRemindersInForeground,
} from '@/data/expoNotifications';
import { groupsRepo } from '@/data/groupsRepo';
import { log } from '@/data/log';
import { seasonsRepo } from '@/data/seasonsRepo';
import { sessionsRepo } from '@/data/sessionsRepo';
import { settingsRepo } from '@/data/settingsRepo';
import { slotsRepo } from '@/data/slotsRepo';
import { toIsoDate, toLocalTime } from '@/domain/formats';
import type { LocalNow } from '@/domain/occurrences';
import {
  type DueInput,
  dueSessions,
  type PlannedReminder,
  plannedReminders,
  type ReminderSettings,
  type ReminderSlot,
} from '@/domain/reminders';
import { onDataChanged } from '@/hooks/dataChanged';
import { fileLock, useFileLock } from '@/hooks/fileLock';
import { useDatabase } from '@/hooks/useDatabase';

/** Créneaux, groupes non archivés, saison active, séances et réglages, lus d'un coup. */
const readInput = async (
  db: Db,
  now: LocalNow,
): Promise<{ input: DueInput; settings: ReminderSettings }> => {
  const settings = await settingsRepo(db).reminderSettings();
  const season = await seasonsRepo(db).getActive();
  if (!season)
    return { input: { slots: [], activeGroupIds: [], season, sessions: [], now }, settings };
  const slots = (await slotsRepo(db).listBySeason(season.id)) as ReminderSlot[];
  const groups = await groupsRepo(db).listBySeason(season.id);
  const sessions = await sessionsRepo(db, now.date).reminderSessions(season.id);
  const activeGroupIds = groups.map((g) => g.id);
  return { input: { slots, activeGroupIds, season, sessions, now }, settings };
};

/** Relances à programmer ; un délai invalide n'en programme aucune (échec journalisé). */
const planOf = (input: DueInput, settings: ReminderSettings): PlannedReminder[] => {
  try {
    return plannedReminders({ ...input, settings });
  } catch {
    log('REMINDERS_SCHEDULE_FAILED');
    return [];
  }
};

let currentDb: Db | null = null;
let pending = false;
let running = false;

/**
 * Un passage : tout annuler, retirer les relances affichées qui ne sont plus dues, puis
 * programmer seulement relance activée, permission accordée et canal créé.
 */
const sync = async (db: Db): Promise<void> => {
  const date = new Date();
  const now = { date: toIsoDate(date), time: toLocalTime(date) };
  let read: Awaited<ReturnType<typeof readInput>>;
  try {
    read = await readInput(db, now);
  } catch {
    log('REMINDERS_SCHEDULE_FAILED');
    return;
  }
  // Effacement ou restauration commencé pendant la lecture : on repasse après.
  if (fileLock.holder() !== null) {
    pending = true;
    return;
  }
  const { input, settings } = read;
  const planned = planOf(input, settings);
  await cancelAllReminders();
  await dismissStaleReminders(dueSessions(input));
  if (planned.length === 0 || !(await reminderPermission()).granted) return;
  if (!(await createReminderChannel(labels.reminder.channel))) return;
  await scheduleReminders(planned, new Date());
};

/** Passe les demandes en attente une par une, tant que le verrou des fichiers est libre. */
const drain = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    while (pending && currentDb !== null && fileLock.holder() === null) {
      pending = false;
      try {
        await sync(currentDb);
      } catch {
        log('REMINDERS_SCHEDULE_FAILED');
      }
    }
  } finally {
    running = false;
  }
};

const request = (): void => {
  pending = true;
  void drain();
};

/** À monter une fois, dans le layout racine : branche la reprogrammation des relances. */
export const useReminders = (): void => {
  const db = useDatabase();
  const lock = useFileLock();

  useEffect(() => {
    showRemindersInForeground();
  }, []);

  useEffect(() => {
    currentDb = db;
    if (!db) return;
    request();
    const offData = onDataChanged(request);
    const offApp = AppState.addEventListener('change', (status) => {
      if (status === 'active') request();
    });
    return () => {
      offData();
      offApp.remove();
    };
  }, [db]);

  // Verrou rendu : la demande reportée part.
  useEffect(() => {
    if (lock === null) void drain();
  }, [lock]);
};
