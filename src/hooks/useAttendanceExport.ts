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
import { groupsRepo } from '@/data/groupsRepo';
import { log } from '@/data/log';
import { seasonsRepo } from '@/data/seasonsRepo';
import { attendanceCsv } from '@/domain/attendanceCsv';
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
  /** Choix (période, groupe, jour) pour lequel l'aperçu a été lu : un aperçu périmé n'exporte rien. */
  key: string;
  period: StatsPeriod;
  groups: ExportGroup[];
  groupId: number | null;
  count: number;
};

// Textes du fichier : ceux du 036, `labels.weekdays` passé tel quel (lundi en premier).
const CSV_LABELS = { ...labels.stats.csv, statuses: labels.statuses, weekdays: labels.weekdays };

/** Échec d'un export : `tooMany` au-delà du plafond, `failed` pour tout le reste. */
export type ExportFailure = 'failed' | 'tooMany';

/**
 * Groupe choisi absent de la liste de la période : ajouté en fin de liste s'il existe encore (0
 * ligne, jamais d'export élargi en silence, changée après contradiction) ; supprimé : `null`.
 */
const keepGroup = async (db: Db, groups: ExportGroup[], groupId: number | null) => {
  if (groupId === null || groups.some((g) => g.groupId === groupId)) return { groups, groupId };
  const group = await groupsRepo(db).get(groupId);
  if (group === null) return { groups, groupId: null };
  const kept = { groupId, name: group.name, archived: group.archivedAt !== null };
  return { groups: [...groups, kept], groupId };
};

/**
 * EX-31 : groupes de la période et nombre de lignes. `choice` nul : période par défaut, comme
 * l'onglet. `enabled` faux (dates à corriger) : rien n'est lu. `ready` : l'aperçu correspond au
 * choix affiché et sa lecture a réussi ; seul un aperçu prêt peut être exporté.
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
  const key = JSON.stringify([kind, from, to, groupId, date]);
  const load = useMemo(() => {
    if (!db || !enabled) return null;
    // Choix aplati : un nouvel objet au même contenu ne relance pas la lecture.
    const wanted: PeriodChoice | null =
      kind === 'custom' ? { kind, from: from ?? '', to: to ?? '' } : kind && { kind };
    return async (): Promise<ExportPreview> => {
      const repo = attendanceExportRepo(db);
      const period = resolvePeriod(wanted, await seasonsRepo(db).getActive(), date);
      const kept = await keepGroup(db, await repo.groups(period), groupId);
      return { key, period, ...kept, count: await repo.count(period, kept.groupId) };
    };
  }, [db, enabled, date, kind, from, to, groupId, key]);
  // Vue précédente gardée pendant une relecture : le compteur ne clignote pas à chaque frappe.
  const { value, loadFailed } = useLoaded(load, 'CSV_PREVIEW_LOAD_FAILED', {}, true);
  const ready = enabled && !loadFailed && value?.key === key;
  return { preview: enabled ? value : null, ready, loadFailed };
};

/** `kila-presences-2026-09-01-au-2026-11-27.csv` (« _ » refusé par `EXPORT_NAME`, ticket 033). */
export const exportFileName = ({ from, to }: StatsPeriod) => `kila-presences-${from}-au-${to}.csv`;

/** Appelé sous le verrou 'csv'. Rend `null` si le fichier a été partagé, sinon la cause. */
const exportOnce = async (
  db: Db,
  deps: CsvExportDeps,
  period: StatsPeriod,
  groupId: number | null,
): Promise<ExportFailure | null> => {
  // Copies restées d'un arrêt brutal ; un échec, même levé tout de suite, n'empêche pas l'export.
  await Promise.resolve()
    .then(() => deps.files.clear())
    .catch(() => log('CSV_CLEAR_FAILED'));
  let dir: string | null = null;
  try {
    const repo = attendanceExportRepo(db);
    // Plafond recompté sous le verrou (les données ont pu changer depuis l'aperçu), puis revérifié
    // sur les lignes lues, en second filet.
    const rows = tooManyRows(await repo.count(period, groupId))
      ? null
      : await repo.rows(period, groupId);
    if (rows === null || tooManyRows(rows.length)) {
      log('CSV_REJECTED_TOO_MANY');
      return 'tooMany';
    }
    dir = await deps.files.newDir();
    const path = `${dir}/${exportFileName(period)}`;
    await deps.write(path, attendanceCsv(rows, CSV_LABELS));
    await deps.share(path);
    log('CSV_SHARED');
    return null;
  } catch {
    log('CSV_EXPORT_FAILED');
    return 'failed';
  } finally {
    if (dir !== null) await deps.files.removeDir(dir).catch(() => log('CSV_CLEANUP_FAILED'));
  }
};

/**
 * EX-31 : écrit le fichier et ouvre la feuille de partage. Aucun message de réussite (un partage
 * annulé ne se détecte pas) ; `failure` après un échec, effacé au nouvel essai ou par
 * `clearFailure` (choix changé). Un seul export à
 * la fois, jamais pendant une sauvegarde, une restauration, une purge ou Tout effacer.
 */
export const useAttendanceExport = (deps: CsvExportDeps) => {
  const db = useDatabase();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ExportFailure | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);

  const exportNow = useCallback(
    async (period: StatsPeriod, groupId: number | null) => {
      if (!db) return;
      const done = await fileLock.run('csv', async () => {
        setBusy(true);
        setFailure(null);
        try {
          return await exportOnce(db, deps, period, groupId);
        } finally {
          setBusy(false);
        }
      });
      if (done.ran) setFailure(done.value);
    },
    [db, deps],
  );

  return { exportNow, busy, failure, clearFailure };
};
