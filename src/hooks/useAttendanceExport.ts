// Export CSV des présences pour l'écran « Exporter les présences » (ticket 037, F-08, EX-31 ; zone
// sensible : données de mineurs qui sortent en clair). Modèle : useBackupExport. Les fichiers et le
// partage sont passés en paramètre (expo dans l'appli, node:fs dans les tests) : le même cycle est
// testé et livré. SEC-10 : sous-dossier neuf de `cache/exports/`, effacé dès la fermeture de la
// feuille de partage, réussite ou échec ; dossier vidé au début de chaque export, sous le verrou.
// ABS-04, SEC-12 : le journal ne reçoit que des codes `CSV_*`.
import { useCallback, useMemo, useState } from 'react';
import { labels } from '@/config/libelles';
import { attendanceExportRepo, type ExportGroup } from '@/data/attendanceExportRepo';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { log } from '@/data/log';
import { seasonsRepo } from '@/data/seasonsRepo';
import { attendanceCsv } from '@/domain/attendanceCsv';
import { toIsoDate } from '@/domain/formats';
import { type PeriodChoice, resolvePeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { fileLock } from '@/hooks/fileLock';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';
import { useLocalNow } from '@/hooks/useLocalNow';

/**
 * EX-31 : plafond de lignes d'un export (décision du porteur du 2026-11-28) ; au-delà, l'export est
 * refusé (mémoire de l'appareil, reporté du lot J3-2).
 */
export const MAX_EXPORT_ROWS = 50_000;

/** EX-31 : vrai si l'export dépasse le plafond. */
export const tooManyRows = (count: number): boolean => count > MAX_EXPORT_ROWS;

/** Ce dont l'export a besoin : dossier dédié, écriture d'un fichier neuf, partage `text/csv`. */
export type CsvExportDeps = {
  files: Pick<BackupStorage, 'clear' | 'newDir' | 'removeDir'>;
  write(path: string, content: string): Promise<void>;
  share(path: string): Promise<void>;
};

/** Aperçu : période résolue, groupes proposés, groupe retenu (`null` : tous) et nombre de lignes. */
export type ExportPreview = {
  period: StatsPeriod;
  groups: ExportGroup[];
  groupId: number | null;
  count: number;
};

// Textes du fichier : ceux du 036, `labels.weekdays` passé tel quel (lundi en premier).
const CSV_LABELS = { ...labels.stats.csv, statuses: labels.statuses, weekdays: labels.weekdays };

/**
 * EX-31 : groupes de la période et nombre de lignes. `choice` nul : période par défaut, comme
 * l'onglet. `enabled` faux (dates à corriger) : rien n'est lu. Un groupe absent de la liste (autre
 * saison, supprimé) revient à « Tous les groupes ».
 */
export const useExportPreview = (
  choice: PeriodChoice | null,
  groupId: number | null,
  enabled: boolean,
) => {
  const db = useDatabase();
  const { date } = useLocalNow();
  const kind = choice?.kind ?? null;
  const from = choice?.kind === 'custom' ? choice.from : null;
  const to = choice?.kind === 'custom' ? choice.to : null;
  const load = useMemo(() => {
    if (!db || !enabled) return null;
    // Choix aplati : un nouvel objet au même contenu ne relance pas la lecture.
    const wanted: PeriodChoice | null =
      kind === 'custom' ? { kind, from: from ?? '', to: to ?? '' } : kind && { kind };
    return async (): Promise<ExportPreview> => {
      const repo = attendanceExportRepo(db);
      const period = resolvePeriod(wanted, await seasonsRepo(db).getActive(), date);
      const groups = await repo.groups(period);
      const kept = groups.some((g) => g.groupId === groupId) ? groupId : null;
      return { period, groups, groupId: kept, count: await repo.count(period, kept) };
    };
  }, [db, enabled, date, kind, from, to, groupId]);
  // Vue précédente gardée pendant une relecture : le compteur ne clignote pas à chaque frappe.
  const { value, loadFailed } = useLoaded(load, 'CSV_PREVIEW_LOAD_FAILED', {}, true);
  return { preview: enabled ? value : null, loadFailed };
};

/** Appelé sous le verrou 'csv'. Rend faux si aucun fichier n'a été partagé. */
const exportOnce = async (
  db: Db,
  deps: CsvExportDeps,
  period: StatsPeriod,
  groupId: number | null,
): Promise<boolean> => {
  // Copies restées d'un arrêt brutal ; un échec, même levé tout de suite, n'empêche pas l'export.
  await Promise.resolve()
    .then(() => deps.files.clear())
    .catch(() => log('CSV_CLEAR_FAILED'));
  let dir: string | null = null;
  try {
    const rows = await attendanceExportRepo(db).rows(period, groupId);
    // Plafond revérifié sur les lignes lues : les données ont pu changer depuis l'aperçu.
    if (tooManyRows(rows.length)) throw new Error('Trop de lignes');
    dir = await deps.files.newDir();
    const path = `${dir}/kila-presences-${toIsoDate(new Date())}.csv`;
    await deps.write(path, attendanceCsv(rows, CSV_LABELS));
    await deps.share(path);
    log('CSV_SHARED');
    return true;
  } catch {
    log('CSV_EXPORT_FAILED');
    return false;
  } finally {
    if (dir !== null) await deps.files.removeDir(dir).catch(() => log('CSV_CLEANUP_FAILED'));
  }
};

/**
 * EX-31 : écrit le fichier et ouvre la feuille de partage. Aucun message de réussite (un partage
 * annulé ne se détecte pas) ; `failed` après une erreur, effacé au nouvel essai. Un seul export à
 * la fois, jamais pendant une sauvegarde, une restauration, une purge ou Tout effacer.
 */
export const useAttendanceExport = (deps: CsvExportDeps) => {
  const db = useDatabase();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const exportNow = useCallback(
    async (period: StatsPeriod, groupId: number | null) => {
      if (!db) return;
      const done = await fileLock.run('csv', async () => {
        setBusy(true);
        setFailed(false);
        try {
          return await exportOnce(db, deps, period, groupId);
        } finally {
          setBusy(false);
        }
      });
      if (done.ran && !done.value) setFailed(true);
    },
    [db, deps],
  );

  return { exportNow, busy, failed };
};
