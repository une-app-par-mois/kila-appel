// Import CSV des membres pour les écrans (ticket 034, F-07, EX-30 ; zone sensible : données de
// mineurs lues puis écrites). `choose` : sélecteur et lecture sous le verrou commun 'import' (rendu
// avant l'aperçu), copie du sélecteur effacée par la lecture (SEC-10), décodage, analyse, aperçu
// gardé en mémoire (importSession). `confirm` : écriture d'un bloc sous le même verrou. SEC-12,
// ABS-04 : le journal ne reçoit que des codes ; `error.message` n'est jamais journalisé ni rendu
// (une erreur native peut citer le nom du fichier).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { expoImportPicker, readFileBytes } from '@/data/expoFiles';
import { log } from '@/data/log';
import { type ImportResult, importContext, importMembers } from '@/data/memberImportRepo';
import { decodeCsv, MAX_CSV_BYTES } from '@/domain/csvDecode';
import { parseCsv } from '@/domain/csvParse';
import { toIsoDate } from '@/domain/formats';
import { type ImportPreview, keepImportColumns, previewImport } from '@/domain/memberImport';
import { erasedCount, notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { importSession, useImportSession } from '@/hooks/importSession';
import { useDatabase } from '@/hooks/useDatabase';

/** Refus du fichier : lecture (031), en-tête (032) ; `line` seulement pour MALFORMED. */
export type ImportRejection =
  | {
      reason:
        | 'EMPTY'
        | 'NOT_TEXT'
        | 'TOO_LARGE'
        | 'UNSUPPORTED_ENCODING'
        | 'TOO_MANY_ROWS'
        | 'MISSING_COLUMNS';
    }
  | { reason: 'MALFORMED'; line: number };

export type ImportState =
  | { step: 'idle' }
  | { step: 'reading' }
  /** Aperçu prêt (dans `preview`). */
  | { step: 'ready' }
  | ({ step: 'rejected' } & ImportRejection)
  /** Lecture ou écriture impossible : rien n'a été modifié. */
  | { step: 'failed' }
  /** Une autre opération sur les fichiers tient le verrou : l'aperçu est gardé. */
  | { step: 'busy' }
  | { step: 'writing' }
  /** Membres ou groupes changés depuis l'aperçu : rien d'écrit, recommencer. */
  | { step: 'stale' }
  | { step: 'done'; result: ImportResult };

type Picked = { bytes: Uint8Array } | { reason: 'TOO_LARGE' } | null;

const reject = (rejection: ImportRejection, show: (next: ImportState) => void) => {
  log(`IMPORT_REJECTED_${rejection.reason}`);
  show({ step: 'rejected', ...rejection });
};

/**
 * `os` : dossier du sélecteur (Android ou iOS). `owner` : l'écran de choix, dont le démontage
 * vide la session (abandon du parcours) ; l'écran d'aperçu ne la vide pas.
 */
export const useMemberImport = (
  os: string = Platform.OS,
  { owner = false }: { owner?: boolean } = {},
) => {
  const db = useDatabase();
  const session = useImportSession();
  const [state, setState] = useState<ImportState>({ step: 'idle' });
  const mounted = useRef(false);
  // Garde de l'écran : une lecture ou une écriture à la fois (double appui sans effet).
  const running = useRef(false);
  const show = useCallback((next: ImportState) => {
    if (mounted.current) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (owner) importSession.clear();
    };
  }, [owner]);

  const choose = useCallback(async () => {
    if (!db || running.current) return;
    running.current = true;
    let from = -1;
    // Écran démonté, ou abandon (clear) depuis le début de la lecture : plus rien à montrer.
    const live = () => mounted.current && from === importSession.generation();
    const showLive = (next: ImportState) => {
      if (live()) setState(next);
    };
    try {
      const picker = expoImportPicker(os, MAX_CSV_BYTES);
      // Verrou du sélecteur à la fin de la lecture, jamais pendant l'aperçu (ticket 033).
      const locked = await fileLock.run('import', async (): Promise<Picked> => {
        importSession.clear();
        from = importSession.generation();
        // Copies restées d'un arrêt brutal, vidées sous le verrou (comme la restauration).
        await picker.clearPicked().catch(() => log('IMPORT_COPY_CLEAR_FAILED'));
        const choice = await picker.pick();
        if (choice === null || 'reason' in choice) return choice;
        showLive({ step: 'reading' });
        return readFileBytes(choice.path, MAX_CSV_BYTES, os);
      });
      if (!locked.ran) return;
      const picked = locked.value;
      if (picked === null) return showLive({ step: 'idle' });
      // TOO_LARGE du sélecteur ou de la lecture : déjà journalisé par l'adaptateur.
      if ('reason' in picked) return showLive({ step: 'rejected', reason: 'TOO_LARGE' });
      const decoded = decodeCsv(picked.bytes);
      if ('reason' in decoded) return reject(decoded, showLive);
      const parsed = parseCsv(decoded.text);
      if ('reason' in parsed) return reject(parsed, showLive);
      // ABS-03 : seules les colonnes reconnues restent en mémoire ; l'aperçu se calcule dessus.
      const rows = keepImportColumns(parsed.rows);
      const erased = erasedCount();
      const context = await importContext(db);
      const preview = previewImport(rows, { ...context, today: toIsoDate(new Date()) });
      if (!preview.ok) return reject(preview, showLive);
      // Écran fermé ou abandon pendant la lecture : l'aperçu n'est pas gardé.
      if (!live()) return;
      if (importSession.set({ rows, preview: preview.preview }, erased, from))
        showLive({ step: 'ready' });
    } catch {
      log('IMPORT_READ_FAILED');
      showLive({ step: 'failed' });
    } finally {
      running.current = false;
    }
  }, [db, os]);

  /** `shown` : l'aperçu affiché ; s'il n'est plus celui de la session, rien n'est écrit. */
  const confirm = useCallback(
    async (shown: ImportPreview | null, kept: readonly number[]) => {
      if (!db || running.current) return;
      const current = importSession.get();
      if (current === null || current.preview !== shown) {
        log('IMPORT_NO_SESSION');
        return show({ step: 'stale' });
      }
      running.current = true;
      show({ step: 'writing' });
      try {
        const today = toIsoDate(new Date());
        const locked = await fileLock.run('import', () =>
          importMembers(db, { ...current, kept, today }),
        );
        if (!locked.ran) return show({ step: 'busy' });
        importSession.clear();
        const outcome = locked.value;
        if (!outcome.ok) {
          log('IMPORT_STALE');
          return show({ step: 'stale' });
        }
        const { added, duplicatesEnrolled, unarchived } = outcome.result;
        if (added > 0 || duplicatesEnrolled > 0 || unarchived > 0) notifyDataChanged();
        log('IMPORT_DONE');
        show({ step: 'done', result: outcome.result });
      } catch {
        // Transaction annulée : la session reste, l'encadrant peut réessayer.
        log('IMPORT_WRITE_FAILED');
        show({ step: 'failed' });
      } finally {
        running.current = false;
      }
    },
    [db, show],
  );

  const abandon = useCallback(() => {
    importSession.clear();
    show({ step: 'idle' });
  }, [show]);

  return { state, preview: session?.preview ?? null, choose, confirm, abandon };
};
