// Rapport PDF (ticket 040b ; EX-32, SEC-08, SEC-10, SEC-12, ABS-04 ; zone sensible : données de
// mineurs qui sortent en clair, WebView, copies en clair dans le cache). Modèle : useAttendanceExport.
// Sous le verrou 'report', de la lecture à la fermeture de la feuille de partage : `cache/Print/` et
// `cache/exports/` vidés au début ; rapport (039) et grille (039b) lus avec la même période et le
// même filtre ; HTML ; plafond ; PDF (040a) ; déplacement ; partage `application/pdf`. Le
// sous-dossier et `cache/Print/` sont effacés à la fin, réussite ou échec (Android laisse un
// fichier partiel après un rendu en échec). Journal : codes `REPORT_*` seulement.
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import type { Db } from '@/data/db';
import { clearPrint, moveReport, shareFile } from '@/data/expoExports';
import { expoStorage } from '@/data/expoFiles';
import { printPdf } from '@/data/expoPrint';
import { log } from '@/data/log';
import { reportGridRepo } from '@/data/reportGridRepo';
import { reportRepo } from '@/data/reportRepo';
import { reportGrids } from '@/domain/reportGrid';
import { type ReportOrientation, reportHtml } from '@/domain/reportHtml';
import type { StatsPeriod } from '@/domain/statsPeriod';
import { fileLock } from '@/hooks/fileLock';
import { useDatabase } from '@/hooks/useDatabase';
import { useLocalNow } from '@/hooks/useLocalNow';

/**
 * EX-32 : plafond du HTML du rapport, en caractères (`length`), mesuré avant le rendu (décision du
 * porteur du 2026-11-28). Valeur **provisoire**, à ajuster après la mesure sur l'A55.
 */
export const MAX_REPORT_CHARS = 1_000_000;

/** EX-32 : vrai si le HTML dépasse le plafond. */
export const tooLarge = (length: number): boolean => length > MAX_REPORT_CHARS;

/** Issue d'un rapport non partagé : `empty` sans séance, `tooLarge` au-delà du plafond. */
export type ReportFailure = 'failed' | 'tooLarge' | 'empty';

/**
 * Orientation de la synthèse et du PDF (décision du porteur du 2026-11-28) : iOS tout en paysage
 * d'office (taille de page unique probable, à revoir au jalon 7) ; Android, pages mélangées par
 * `@page` (synthèse en portrait, grille en paysage), à vérifier sur l'émulateur.
 */
const orientation = (): ReportOrientation => (Platform.OS === 'ios' ? 'landscape' : 'portrait');

/** Lance `clear` ; une erreur, même levée tout de suite, est journalisée sans arrêter le cycle. */
const attempt = (clear: () => Promise<void>, code: string) =>
  Promise.resolve()
    .then(clear)
    .catch(() => log(code));

/** Appelé sous le verrou 'report'. Rend `null` si le PDF a été partagé, sinon la cause. */
const reportOnce = async (
  db: Db,
  period: StatsPeriod,
  groupId: number | null,
  today: string,
): Promise<ReportFailure | null> => {
  const exportsDir = expoStorage('exports');
  // SEC-10 : copies d'un rapport ou d'un export interrompu ; un échec n'empêche pas le rapport.
  await attempt(clearPrint, 'REPORT_CLEAR_FAILED');
  await attempt(() => exportsDir.clear(), 'REPORT_CLEAR_FAILED');
  let dir: string | null = null;
  try {
    // Lectures sans transaction commune (décision prévue par la pré-analyse) ; la grille reçoit
    // exactement la période et le filtre du rapport.
    const report = await reportRepo(db).report(period, groupId, today);
    if (report === null) {
      log('REPORT_FAILED');
      return 'failed';
    }
    if (report.sessions === 0) {
      log('REPORT_EMPTY');
      return 'empty';
    }
    const grid = await reportGridRepo(db).grid(period, groupId);
    const pages = reportGrids(report, grid, rapport.report);
    const page = orientation();
    const html = reportHtml(report, rapport.report, rapportPalette, pages, page);
    if (tooLarge(html.length)) {
      log('REPORT_REJECTED_TOO_LARGE');
      return 'tooLarge';
    }
    const printed = await printPdf(html, page);
    dir = await exportsDir.newDir();
    const path = await moveReport(printed, dir, { from: report.from, to: report.to });
    await shareFile(path, 'pdf');
    log('REPORT_SHARED');
    return null;
  } catch {
    log('REPORT_FAILED');
    return 'failed';
  } finally {
    // SEC-08, SEC-10 : rien ne reste, ni le PDF rendu (ou partiel) ni sa copie partagée.
    await attempt(clearPrint, 'REPORT_CLEANUP_FAILED');
    const shared = dir;
    if (shared !== null) await attempt(() => exportsDir.removeDir(shared), 'REPORT_CLEANUP_FAILED');
  }
};

/**
 * EX-32 : produit le rapport de la période (tous les groupes, `groupId` nul, ou un seul) et ouvre
 * la feuille de partage. `failure` après un rapport non partagé, effacé au nouvel essai ou par
 * `clearFailure`. Un seul rapport à la fois, jamais pendant un export, une restauration, une
 * purge, le nettoyage du démarrage ou Tout effacer.
 */
export const useReport = () => {
  const db = useDatabase();
  const { date } = useLocalNow();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ReportFailure | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);

  const generate = useCallback(
    async (period: StatsPeriod, groupId: number | null) => {
      if (!db) return;
      const done = await fileLock.run('report', async () => {
        setBusy(true);
        setFailure(null);
        try {
          return await reportOnce(db, period, groupId, date);
        } finally {
          setBusy(false);
        }
      });
      if (done.ran) setFailure(done.value);
    },
    [db, date],
  );

  return { generate, busy, failure, clearFailure };
};
