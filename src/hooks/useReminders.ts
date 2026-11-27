// Reprogrammation des relances (ticket 028b, EX-28, ADR-007) : une notification locale ne vérifie
// rien quand elle s'affiche, donc le plan est recalculé à l'ouverture, au retour au premier plan
// et après chaque écriture (notifyDataChanged, effacement compris). Seules les relances programmées
// qui ne sont plus prévues sont annulées, une par une (décision du porteur du 2026-11-27) : une
// relance encore due dont l'heure tombe maintenant n'est pas perdue. Une passe à la fois, et la
// dernière demande gagne. Rien ne part tant que la base n'est pas prête, ni pendant un effacement,
// une restauration ou un export (verrou des fichiers) : le verrou et le compte des effacements
// sont relus avant chaque écriture native, et une passe interrompue repart à la libération.
// Base effacée qui ne se rouvre pas : tout est annulé et retiré (SEC-11).
// ABS-04 : seuls des codes sont journalisés ; un échec ne bloque jamais l'appli.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import {
  cancelAllReminders,
  cancelReminder,
  createReminderChannel,
  dismissAllReminders,
  dismissStaleReminders,
  reminderPermission,
  scheduledReminderIds,
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
import { erasedCount, onDataChanged } from '@/hooks/dataChanged';
import { fileLock, useFileLock } from '@/hooks/fileLock';
import { useDatabaseState } from '@/hooks/useDatabase';

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

/** Relances à programmer ; null si le délai est invalide (échec journalisé). */
const planOf = (input: DueInput, settings: ReminderSettings): PlannedReminder[] | null => {
  try {
    return plannedReminders({ ...input, settings });
  } catch {
    log('REMINDERS_SCHEDULE_FAILED');
    return null;
  }
};

const idOf = (t: { slotId: number; date: string }) => `relance-${t.slotId}-${t.date}`;
const NONE = { planned: [] as PlannedReminder[], kept: new Set<string>() };

let currentDb: Db | null = null;
let pending = false;
let running = false;

/** Vrai tant que la passe commencée sur `db` reste valable : verrou libre, aucun effacement. */
const validFor = (db: Db): (() => boolean) => {
  const erased = erasedCount();
  return () => fileLock.holder() === null && erasedCount() === erased && currentDb === db;
};

/**
 * Relances gardées : le plan, et les séances encore dues (relance dont l'heure tombe maintenant,
 * pas encore délivrée). Relance désactivée, délai invalide, permission refusée ou canal en
 * échec : aucune. Null : passe interrompue avant de créer le canal.
 */
const keptOf = async (
  input: DueInput,
  settings: ReminderSettings,
  valid: () => boolean,
): Promise<typeof NONE | null> => {
  const planned = planOf(input, settings);
  if (planned === null || !settings.enabled || !(await reminderPermission()).granted) return NONE;
  if (planned.length > 0) {
    if (!valid()) return null;
    if (!(await createReminderChannel(labels.reminder.channel))) return NONE;
  }
  return { planned, kept: new Set([...planned, ...dueSessions(input)].map(idOf)) };
};

/**
 * Une passe : annuler les relances programmées qui ne sont plus gardées, retirer les affichées
 * qui ne sont plus dues, puis programmer le plan (un identifiant déjà programmé est remplacé).
 * Faux si elle a été interrompue (verrou, effacement, base changée).
 */
const sync = async (db: Db): Promise<boolean> => {
  const valid = validFor(db);
  const date = new Date();
  const now = { date: toIsoDate(date), time: toLocalTime(date) };
  let read: Awaited<ReturnType<typeof readInput>>;
  try {
    read = await readInput(db, now);
  } catch {
    // Rien n'est annulé sur une panne de lecture ; la prochaine demande réessaie.
    log('REMINDERS_SCHEDULE_FAILED');
    return true;
  }
  if (!valid()) return false;
  const { input, settings } = read;
  const plan = await keptOf(input, settings, valid);
  if (plan === null || !valid()) return false;
  // Une annulation en échec est rejouée à la passe suivante : la relance reste hors du plan.
  for (const id of (await scheduledReminderIds()) ?? []) {
    if (plan.kept.has(id)) continue;
    if (!valid()) return false;
    await cancelReminder(id);
  }
  if (!valid()) return false;
  await dismissStaleReminders(dueSessions(input));
  if (plan.planned.length === 0) return true;
  if (!valid()) return false;
  await scheduleReminders(plan.planned, new Date(), valid);
  return valid();
};

/** Passe les demandes en attente une par une, tant que le verrou des fichiers est libre. */
const drain = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    while (pending && currentDb !== null && fileLock.holder() === null) {
      pending = false;
      try {
        if (!(await sync(currentDb))) pending = true;
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

/** Base effacée, nouvelle base qui ne s'ouvre pas : plus aucune relance (SEC-11). */
const clearAll = async (): Promise<void> => {
  await cancelAllReminders();
  await dismissAllReminders();
};

/** Remise à zéro entre deux tests (comme `resetDatabaseForTests`). */
export const resetRemindersForTests = (): void => {
  currentDb = null;
  pending = false;
  running = false;
};

/** À monter une fois, dans le layout racine : branche la reprogrammation des relances. */
export const useReminders = (): void => {
  const database = useDatabaseState();
  const db = database.status === 'ready' ? database.db : null;
  const lost = database.status === 'erased' || database.status === 'restoreFailed';
  const lock = useFileLock();

  useEffect(() => {
    showRemindersInForeground();
  }, []);

  useEffect(() => {
    if (lost) void clearAll();
  }, [lost]);

  useEffect(() => {
    currentDb = db;
    if (!db) return;
    request();
    const offData = onDataChanged(request);
    const offApp = AppState.addEventListener('change', (status) => {
      if (status === 'active') request();
    });
    return () => {
      currentDb = null;
      offData();
      offApp.remove();
    };
  }, [db]);

  // Verrou rendu : la demande reportée part.
  useEffect(() => {
    if (lock === null) void drain();
  }, [lock]);
};
