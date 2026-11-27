// Rappels de sauvegarde (ticket 014d, EX-21) : invitation unique après le premier appel enregistré,
// bandeau de l'accueil après 30 jours sans sauvegarde. Sans aucune sauvegarde, les 30 jours partent
// de la plus ancienne séance enregistrée (réponse du porteur du 2026-11-27).
import { useMemo } from 'react';
import type { Db } from '@/data/db';
import { sessionsRepo } from '@/data/sessionsRepo';
import { settingsRepo } from '@/data/settingsRepo';
import { daysSince } from '@/domain/formats';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

/** EX-21 : jours sans sauvegarde à partir desquels l'accueil montre le bandeau. */
export const BACKUP_BANNER_DAYS = 30;

/** EX-21 : l'invitation n'a jamais été montrée et aucune sauvegarde n'a été faite. */
export const needsBackupInvite = async (db: Db): Promise<boolean> => {
  const settings = settingsRepo(db);
  const [seen, lastBackup] = await Promise.all([
    settings.backupInviteSeen(),
    settings.lastBackupDate(),
  ]);
  return !seen && lastBackup === null;
};

/**
 * EX-21 : jours sans sauvegarde à afficher dans le bandeau, ou null (pas de bandeau, ou date pas
 * encore lue). Une date future (horloge de l'appareil reculée) ne montre rien.
 */
export const useBackupBanner = (today: string) => {
  const db = useDatabase();
  const load = useMemo(
    () =>
      db
        ? async () =>
            (await settingsRepo(db).lastBackupDate()) ??
            (await sessionsRepo(db, today).firstRecordedDate())
        : null,
    [db, today],
  );
  // Relue au changement de jour sans que le bandeau clignote.
  const { value: since, loadFailed } = useLoaded(load, 'BACKUP_BANNER_LOAD_FAILED', {}, true);
  const days = since === null ? null : daysSince(since, today);
  return { days: days !== null && days >= BACKUP_BANNER_DAYS ? days : null, loadFailed };
};
