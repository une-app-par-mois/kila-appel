// Adaptateur expo-notifications de la relance (ticket 028a, EX-28, ADR-007). Seul fichier qui
// importe ce module, en imports nommés d'une liste fermée (src/staticChecksNotifications.test.ts) :
// aucune fonction de jeton push, de sujet, de tâche de fond, de pastille ni d'alarme exacte (ABS-01,
// SEC-03). Notifications locales seulement, à date fixe. Permission demandée à l'activation (029).
// ABS-04, SEC-12 : le titre nomme le groupe (maquette), les données se limitent à `slotId` et
// `date`, et une erreur n'est journalisée que par un code et un identifiant.
import {
  AndroidImportance,
  addNotificationResponseReceivedListener,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  dismissNotificationAsync,
  getAllScheduledNotificationsAsync,
  getLastNotificationResponse,
  getPermissionsAsync,
  getPresentedNotificationsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { labels } from '@/config/libelles';
import { toLocalDate } from '@/data/localDates';
import { log } from '@/data/log';
import { isIsoDate } from '@/domain/formats';
import type { IsoDate } from '@/domain/occurrences';
import type { PlannedReminder } from '@/domain/reminders';
import { isId } from '@/domain/validation';

// Conversion des dates locales, testée avec l'adaptateur (expoNotifications.test.ts).
export { firstOccurrence, toLocalDate } from '@/data/localDates';

/** Canal Android des relances ; créé par `createReminderChannel` avant de programmer (028b). */
export const REMINDER_CHANNEL = 'relances';
/** Séance visée par une relance : seules données portées par la notification (SEC-12). */
export type ReminderTarget = { slotId: number; date: IsoDate };
export type ReminderPermission = { granted: boolean; canAskAgain: boolean };

type Response = Parameters<Parameters<typeof addNotificationResponseReceivedListener>[0]>[0];
type Presented = Awaited<ReturnType<typeof getPresentedNotificationsAsync>>[number];

const MINUTE_MS = 60_000;
// iOS refuse un déclencheur déjà passé au moment de l'appel natif : marge de sécurité.
const MIN_LEAD_MS = 5_000;

/**
 * EX-28 : programme chaque relance à sa date fixe et rend le nombre programmé. Un déclencheur
 * passé ou à la minute courante est écarté : le calcul et la programmation n'ont pas lieu à la
 * même minute. L'horloge est relue juste avant chaque appel natif : un déclencheur à moins de 5 s
 * est écarté aussi. Une relance en échec est journalisée et n'empêche pas les autres.
 * `keepGoing` est relu avant chaque relance : faux, la boucle s'arrête (028b).
 */
export const scheduleReminders = async (
  planned: PlannedReminder[],
  now: Date,
  keepGoing: () => boolean = () => true,
): Promise<number> => {
  const currentMinute = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS;
  let count = 0;
  for (const reminder of planned) {
    // 028b : passe interrompue (verrou des fichiers, effacement) : plus aucun appel natif.
    if (!keepGoing()) break;
    const { slotId, date } = reminder;
    const fire = toLocalDate(reminder.fireDate, reminder.fireTime);
    if (fire === null) {
      log('REMINDER_DATE_INVALID', { slotId });
      continue;
    }
    if (fire.getTime() <= currentMinute || fire.getTime() - Date.now() < MIN_LEAD_MS) continue;
    try {
      await scheduleNotificationAsync({
        identifier: `relance-${slotId}-${date}`,
        content: {
          title: labels.reminder.title(reminder.groupNames),
          body: labels.reminder.body(reminder.startTime),
          data: { slotId, date },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: fire,
          channelId: REMINDER_CHANNEL,
        },
      });
      count += 1;
    } catch {
      log('REMINDER_SCHEDULE_FAILED', { slotId });
    }
  }
  return count;
};

/** ADR-007 : annule toutes les relances programmées ; faux en cas d'échec (journalisé). */
export const cancelAllReminders = async (): Promise<boolean> => {
  try {
    await cancelAllScheduledNotificationsAsync();
    return true;
  } catch {
    log('REMINDER_CANCEL_FAILED');
    return false;
  }
};

/** CONV-14 : cible lue dans les données d'une notification, validée ; sinon null. */
const targetOf = (notification: Presented): ReminderTarget | null => {
  const data = notification.request.content.data ?? {};
  const { slotId, date } = data as { slotId?: unknown; date?: unknown };
  if (typeof slotId !== 'number' || !isId(slotId)) return null;
  if (typeof date !== 'string' || !isIsoDate(date)) return null;
  return { slotId, date };
};

/** Retire les notifications affichées choisies par `stale` ; chaque échec est journalisé. */
const dismissPresented = async (stale: (n: Presented) => boolean): Promise<void> => {
  let presented: Presented[];
  try {
    presented = await getPresentedNotificationsAsync();
  } catch {
    log('REMINDER_DISMISS_FAILED');
    return;
  }
  for (const notification of presented.filter(stale)) {
    try {
      await dismissNotificationAsync(notification.request.identifier);
    } catch {
      log('REMINDER_DISMISS_FAILED');
    }
  }
};

/**
 * Retire les relances affichées dont la séance ne figure plus dans `due` ; une notification
 * sans cible lisible n'est pas touchée.
 */
export const dismissStaleReminders = async (due: ReminderTarget[]): Promise<void> => {
  const keep = new Set(due.map((t) => `${t.slotId}|${t.date}`));
  await dismissPresented((n) => {
    const t = targetOf(n);
    return t !== null && !keep.has(`${t.slotId}|${t.date}`);
  });
};

/** Tout effacer (SEC-11) : retire toutes les notifications affichées de l'appli. */
export const dismissAllReminders = (): Promise<void> => dismissPresented(() => true);

/** EX-29 : permission lue, jamais demandée ici ; un échec vaut « non accordée ». */
export const reminderPermission = async (): Promise<ReminderPermission> => {
  try {
    const { granted, canAskAgain } = await getPermissionsAsync();
    return { granted, canAskAgain };
  } catch {
    log('REMINDER_PERMISSION_FAILED');
    return { granted: false, canAskAgain: false };
  }
};

/**
 * EX-29 (ticket 029) : état affiché par le réglage. « blocked » : refusée sans nouvelle demande
 * possible ; « unknown » : lecture en échec (journalisée), le réglage suit alors la préférence.
 */
export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked' | 'unknown';

/** EX-29 : permission lue, jamais demandée ici. */
export const reminderPermissionState = async (): Promise<PermissionState> => {
  try {
    const { granted, canAskAgain, status } = await getPermissionsAsync();
    if (granted) return 'granted';
    if (status === 'undetermined') return 'undetermined';
    return canAskAgain ? 'denied' : 'blocked';
  } catch {
    log('REMINDER_PERMISSION_FAILED');
    return 'unknown';
  }
};

/** Réponse à la demande : un échec (exception) se distingue d'un refus (revue du 029). */
export type PermissionRequest = 'granted' | 'denied' | 'failed';

/**
 * EX-29 : demande du système, seulement à l'activation de la relance (après l'écran « Autoriser
 * les notifications ? »). iOS : alerte et son, sans pastille. Ne lève jamais d'erreur : un échec
 * rend « failed » (journalisé), jamais « accordée ».
 */
export const requestReminderPermission = async (): Promise<PermissionRequest> => {
  try {
    const { granted } = await requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return granted ? 'granted' : 'denied';
  } catch {
    log('REMINDER_PERMISSION_REQUEST_FAILED');
    return 'failed';
  }
};

/**
 * Canal Android des relances (sans effet sur iOS), sans pastille comme sur iOS. À créer seulement
 * relance activée et permission accordée (028b). Faux en cas d'échec (journalisé).
 */
export const createReminderChannel = async (name: string): Promise<boolean> => {
  try {
    await setNotificationChannelAsync(REMINDER_CHANNEL, {
      name,
      importance: AndroidImportance.HIGH,
      showBadge: false,
    });
    return true;
  } catch {
    log('REMINDER_CHANNEL_FAILED');
    return false;
  }
};

/**
 * SEC-12 (revue du 028c) : seule une relance programmée par l'appli compte. Une appli tierce peut
 * lancer l'activité avec une fausse notification push : déclencheur `push` refusé, et identifiant
 * exigé tel que `scheduleReminders` l'écrit.
 */
const targetOfResponse = (response: Response): ReminderTarget | null => {
  const { request } = response.notification;
  // CONV-14 : donnée du module natif, lue sans se fier à son type.
  const trigger = request.trigger as unknown as { type?: unknown } | null | undefined;
  if (trigger?.type === 'push') return null;
  const target = targetOf(response.notification);
  if (target === null || request.identifier !== `relance-${target.slotId}-${target.date}`)
    return null;
  return target;
};

/** Appli ouverte par une relance : sa cible validée, ou null. */
export const lastReminderTarget = (): ReminderTarget | null => {
  try {
    const response = getLastNotificationResponse();
    return response === null ? null : targetOfResponse(response);
  } catch {
    log('REMINDER_RESPONSE_FAILED');
    return null;
  }
};

/** Appui sur une relance : `onTarget` reçoit sa cible validée (null si hors format). */
export const onReminderTarget = (
  onTarget: (target: ReminderTarget | null) => void,
): (() => void) => {
  try {
    const subscription = addNotificationResponseReceivedListener((response) =>
      onTarget(targetOfResponse(response)),
    );
    return () => subscription.remove();
  } catch {
    log('REMINDER_LISTEN_FAILED');
    return () => undefined;
  }
};

/**
 * Appli au premier plan (ticket 028b, décision du porteur du 2026-11-27) : une relance s'affiche
 * en bannière, dans la liste et avec le son, sans pastille. La notification reçue n'est ni lue ni
 * journalisée (ABS-04) ; un échec est journalisé par un code.
 */
export const showRemindersInForeground = (): void => {
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    log('REMINDER_HANDLER_FAILED');
  }
};

/**
 * Identifiants des relances programmées (`relance-…` seulement), pour n'annuler que celles qui ne
 * sont plus prévues (028b, décision du porteur du 2026-11-27) ; null en cas d'échec (journalisé).
 */
export const scheduledReminderIds = async (): Promise<string[] | null> => {
  try {
    const requests = await getAllScheduledNotificationsAsync();
    return requests.map((r) => r.identifier).filter((id) => id.startsWith('relance-'));
  } catch {
    log('REMINDER_LIST_FAILED');
    return null;
  }
};

/** Annule une relance programmée ; faux en cas d'échec (journalisé par un code). */
export const cancelReminder = async (identifier: string): Promise<boolean> => {
  try {
    await cancelScheduledNotificationAsync(identifier);
    return true;
  } catch {
    log('REMINDER_CANCEL_FAILED');
    return false;
  }
};
