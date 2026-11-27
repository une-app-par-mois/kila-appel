// Réglage de la relance pour les écrans (ticket 029, EX-28, EX-29). La préférence (027) et la
// permission du système sont lues ensemble ; la permission est relue au retour au premier plan
// (l'encadrant revient des réglages du téléphone) et après chaque modification (dataChanged).
// Elle n'est demandée que par `confirmPermission`, depuis l'écran « Autoriser les notifications ? ».
// Écrire la préférence émet `notifyDataChanged` : la programmation suit (028b).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { DataError } from '@/data/errors';
import {
  type PermissionState,
  reminderPermissionState,
  requestReminderPermission,
} from '@/data/expoNotifications';
import { settingsRepo } from '@/data/settingsRepo';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

export type ReminderView = { enabled: boolean; delayMin: number; permission: PermissionState };
/** Ligne « Relance » de Paramètres. */
export type ReminderStatus = 'enabled' | 'disabled' | 'denied';

/**
 * EX-29, parcours décidé par le porteur le 2026-11-27 : l'interrupteur montre l'état effectif.
 * Permission jamais demandée : éteint, sans bandeau. Refusée : allumé (préférence active) avec le
 * bandeau. Lecture en échec : l'interrupteur suit la préférence, sans bandeau.
 */
export const effectiveReminder = ({ enabled, permission }: ReminderView) => ({
  switchOn: enabled && permission !== 'undetermined',
  denied: enabled && (permission === 'denied' || permission === 'blocked'),
});

export const reminderStatus = (view: ReminderView): ReminderStatus => {
  const { switchOn, denied } = effectiveReminder(view);
  if (denied) return 'denied';
  return switchOn ? 'enabled' : 'disabled';
};

/** Écritures de la préférence ; chacune émet `notifyDataChanged`. */
export const useReminderActions = () => {
  const db = useDatabase();
  const setEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (!db) throw new DataError('DB_NOT_READY');
      await settingsRepo(db).setReminderEnabled(enabled);
      notifyDataChanged();
    },
    [db],
  );
  /**
   * Interrupteur activé. Rend « askFirst » quand l'écran « Autoriser les notifications ? » doit
   * précéder la demande ; sinon la relance est activée (accordée, ou refusée sans nouvelle
   * demande possible : le bandeau s'affiche).
   */
  const turnOn = useCallback(async (): Promise<'enabled' | 'askFirst'> => {
    const permission = await reminderPermissionState();
    if (permission !== 'granted' && permission !== 'blocked') return 'askFirst';
    await setEnabled(true);
    return 'enabled';
  }, [setEnabled]);
  /** « Continuer » : demande du système ; accordée ou non, la préférence passe à active. */
  const confirmPermission = useCallback(async (): Promise<void> => {
    await requestReminderPermission();
    await setEnabled(true);
  }, [setEnabled]);
  const turnOff = useCallback(() => setEnabled(false), [setEnabled]);
  const setDelay = useCallback(
    async (delayMin: number): Promise<void> => {
      if (!db) throw new DataError('DB_NOT_READY');
      await settingsRepo(db).setReminderDelay(delayMin);
      notifyDataChanged();
    },
    [db],
  );
  return { turnOn, turnOff, confirmPermission, setDelay };
};

/** Nombre de retours au premier plan : change la lecture, qui relit la permission. */
const useForegroundCount = (): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setCount((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);
  return count;
};

export const useReminderSettings = () => {
  const db = useDatabase();
  const foreground = useForegroundCount();
  // biome-ignore lint/correctness/useExhaustiveDependencies: relue à chaque retour au premier plan.
  const load = useMemo(
    () =>
      db
        ? async (): Promise<ReminderView> => ({
            ...(await settingsRepo(db).reminderSettings()),
            permission: await reminderPermissionState(),
          })
        : null,
    [db, foreground],
  );
  // Valeur gardée pendant la relecture : le bandeau disparaît sans que l'écran se vide.
  const { value, loadFailed } = useLoaded(load, 'REMINDER_SETTINGS_LOAD_FAILED', {}, true);
  return { view: value, loadFailed, ...useReminderActions() };
};
