// Export de la sauvegarde pour l'écran Sauvegarde (ticket 014b, EX-19, EX-21 ; zone sensible).
// Les fichiers, le partage et l'ouverture brute d'une copie sont passés en paramètre (expo dans
// l'appli, node:fs et node:sqlite dans les tests) : le même cycle est testé et livré.
// ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LastBackup } from '@/config/libelles';
import { exportBackup } from '@/data/backup';
import { verifyBackup } from '@/data/backupCheck';
import type { BackupDeps } from '@/data/expoFiles';
import { log } from '@/data/log';
import { settingsRepo } from '@/data/settingsRepo';
import { daysSince, toDisplayDate, toIsoDate } from '@/domain/formats';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

/** Date stockée de la dernière sauvegarde → ce que l'écran en dit, vu de `today`. */
export const toLastBackup = (date: string | null, today: string): LastBackup =>
  date === null ? null : { days: daysSince(date, today), date: toDisplayDate(date) };

/** EX-21 : date de la dernière sauvegarde (AAAA-MM-JJ) ; `loaded` distingue « aucune ». */
export const useLastBackup = () => {
  const db = useDatabase();
  const load = useMemo(() => (db ? () => settingsRepo(db).lastBackupDate() : null), [db]);
  const { value, loaded, loadFailed } = useLoaded(load, 'LAST_BACKUP_LOAD_FAILED');
  return { lastBackup: value, loaded, loadFailed };
};

/**
 * EX-19 : copie datée dans un sous-dossier neuf du dossier dédié, vérifiée, partagée ; la date
 * est notée quand la feuille de partage se ferme sans erreur (un partage annulé ne se détecte
 * pas : décision du porteur du 2026-11-27). Le sous-dossier est effacé dès la fin, réussite ou
 * échec ; le dossier dédié est vidé à chaque ouverture de l'écran.
 */
export const useBackupExport = (deps: BackupDeps) => {
  const db = useDatabase();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const cleared = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    // Copies restées d'un arrêt brutal de l'appli pendant un partage.
    cleared.current = deps.files.clear().catch(() => log('BACKUP_CLEAR_FAILED'));
  }, [deps]);

  const exportNow = useCallback(async () => {
    if (!db || running.current) return;
    running.current = true;
    setBusy(true);
    setFailed(false);
    let dir: string | null = null;
    try {
      await cleared.current;
      const today = toIsoDate(new Date());
      dir = await deps.files.newDir();
      const path = `${dir}/kila-sauvegarde-${today}.db`;
      await exportBackup(db, path, today);
      // La copie produite doit pouvoir être restaurée : vérifiée sur une seconde copie.
      const check = await verifyBackup(path, `${dir}/verification.db`, { ...deps, today });
      if (!check.ok) throw new Error('Sauvegarde refusée par la vérification');
      await deps.share(path);
      log('BACKUP_SHARED');
      await settingsRepo(db).setLastBackupDate(today);
      notifyDataChanged();
    } catch {
      log('BACKUP_EXPORT_FAILED');
      setFailed(true);
    } finally {
      if (dir !== null) {
        await deps.files.removeDir(dir).catch(() => log('BACKUP_CLEANUP_FAILED'));
      }
      running.current = false;
      setBusy(false);
    }
  }, [db, deps]);

  return { exportNow, busy, failed };
};
