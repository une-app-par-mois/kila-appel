// Écran de récupération seul (EX-22, tickets 014c et 014f) : variantes, boutons désactivés pendant
// un nouvel essai (revue de sécurité du 014c) et pendant une restauration (ticket 014f).
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { labels } from '@/config/libelles';
import type { OpenFailure } from '@/data/open';
import type { ErasedBy } from '@/hooks/useDatabase';
import type { RecoveryControls, RecoveryState } from '@/hooks/useRecovery';
import { Recovery, type RecoveryDatabase } from '@/ui/Recovery';

const r = labels.recovery;
const t = labels.restore;
const onRetry = jest.fn();
const onStartOver = jest.fn();
const onAcceptEmpty = jest.fn();
const controls = (state: RecoveryState): RecoveryControls => ({
  state,
  choose: jest.fn(async () => undefined),
  dismiss: jest.fn(),
  confirm: jest.fn(),
  cancel: jest.fn(),
});
const failed = (cause: OpenFailure, pending = false, resetFailed = false): RecoveryDatabase => ({
  status: 'failed',
  cause,
  pending,
  resetFailed,
});
const render_ = (
  database: RecoveryDatabase,
  restore = controls({ step: 'idle' }),
  cleaned = true,
) =>
  render(
    <Recovery
      database={database}
      restore={restore}
      cleaned={cleaned}
      onRetry={onRetry}
      onStartOver={onStartOver}
      onAcceptEmpty={onAcceptEmpty}
    />,
  );
const show = (cause: OpenFailure, pending = false, resetFailed = false) =>
  render_(failed(cause, pending, resetFailed));
const names = () =>
  screen.getAllByRole('button').map((b) => within(b).getByText(/./).props.children as string);
const summary = { members: 3, groups: 2, recordedSessions: 1, backupDate: '2026-10-22' };

beforeEach(() => {
  onRetry.mockClear();
  onStartOver.mockClear();
  onAcceptEmpty.mockClear();
});

describe('EX-22 Recovery (ticket 014c)', () => {
  it('pendant un nouvel essai, les trois boutons de la variante abîmée sont désactivés', async () => {
    await show('damaged', true);
    const retry = screen.getByRole('button', { name: r.retry });
    const startOver = screen.getByRole('button', { name: r.startOver });
    expect(retry).toBeDisabled();
    expect(startOver).toBeDisabled();
    expect(screen.getByRole('button', { name: r.restore })).toBeDisabled();
    await fireEvent.press(retry);
    await fireEvent.press(startOver);
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.queryByText(r.confirmMessage)).toBeNull();
  });

  it.each<OpenFailure>(['settings', 'unavailable'])(
    'cause %s : variante « réglage refusé », « Réessayer » désactivé pendant l’essai',
    async (cause) => {
      await show(cause, true);
      expect(screen.getByText(r.settings)).toBeTruthy();
      expect(screen.getByRole('button', { name: r.retry })).toBeDisabled();
      expect(screen.queryByRole('button', { name: r.startOver })).toBeNull();
      expect(screen.queryByRole('button', { name: r.restore })).toBeNull();
    },
  );

  it('cause unavailable : « Réessayer » rouvre, rien d’autre', async () => {
    await show('unavailable');
    await fireEvent.press(screen.getByRole('button', { name: r.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('effacement en échec : message seulement s’il a échoué', async () => {
    await show('damaged', false, true);
    expect(screen.getByText(r.resetFailed)).toBeTruthy();
    await screen.unmount();
    await show('damaged');
    expect(screen.queryByText(r.resetFailed)).toBeNull();
  });
});

describe('EX-22 Recovery, restaurer une sauvegarde (ticket 014f)', () => {
  it('variante abîmée : « Restaurer une sauvegarde », puis « Réessayer » et « Repartir de zéro »', async () => {
    const restore = controls({ step: 'idle' });
    await render_(failed('damaged'), restore);
    expect(names()).toEqual([r.restore, r.retry, r.startOver]);
    await fireEvent.press(screen.getByRole('button', { name: r.restore }));
    expect(restore.choose).toHaveBeenCalledTimes(1);
  });

  it('nettoyage du démarrage en cours : seul « Restaurer une sauvegarde » est désactivé', async () => {
    await render_(failed('damaged'), controls({ step: 'idle' }), false);
    expect(screen.getByRole('button', { name: r.restore })).toBeDisabled();
    expect(screen.getByRole('button', { name: r.retry })).toBeEnabled();
  });

  it.each<RecoveryState>([{ step: 'picking' }, { step: 'verifying' }])(
    'séquence en cours (%o) : tous les boutons désactivés',
    async (state) => {
      await render_(failed('damaged'), controls(state));
      for (const name of [r.restore, r.retry, r.startOver])
        expect(screen.getByRole('button', { name })).toBeDisabled();
    },
  );

  it('pendant la vérification : « Vérification du fichier… »', async () => {
    await render_(failed('damaged'), controls({ step: 'verifying' }));
    expect(screen.getByText(t.verifying)).toBeTruthy();
  });

  it.each<[RecoveryState, string]>([
    [{ step: 'rejected', reason: 'NEWER_VERSION' }, t.newerVersion],
    [{ step: 'rejected', reason: 'INVALID_DATA' }, t.damaged],
    [{ step: 'failed' }, t.failed],
  ])('refus ou échec (%o) : message, rien n’a été modifié, boutons actifs', async (state, text) => {
    await render_(failed('damaged'), controls(state));
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText(t.nothingChanged)).toBeTruthy();
    expect(screen.getByRole('button', { name: r.restore })).toBeEnabled();
  });

  it('confirmation : résumé avec l’effacement annoncé, Annuler et Remplacer', async () => {
    const restore = controls({ step: 'confirm', summary, draft: null, erase: true });
    await render_(failed('damaged'), restore);
    expect(screen.getByText(r.restoreErase)).toBeTruthy();
    expect(screen.getByText(t.backupOf('22/10/2026'))).toBeTruthy();
    expect(names()).toEqual([t.cancel, t.confirm]);
    await fireEvent.press(screen.getByRole('button', { name: t.confirm }));
    expect(restore.confirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: t.cancel }));
    expect(restore.cancel).toHaveBeenCalledTimes(1);
  });

  it('pendant la recopie : Annuler et Remplacer désactivés', async () => {
    const restore = controls({ step: 'restoring', summary, draft: null, erase: true });
    await render_(failed('damaged', true), restore);
    expect(screen.getByRole('button', { name: t.cancel })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.confirm })).toBeDisabled();
  });

  it('recopie en échec : message, « Choisir un fichier… » puis « Repartir de zéro » sans confirmation', async () => {
    const restore = controls({ step: 'idle' });
    await render_({ status: 'restoreFailed', pending: false }, restore);
    expect(screen.getByText(r.restoreFailed)).toBeTruthy();
    expect(screen.getByRole('header', { name: r.restoreFailedTitle })).toBeTruthy();
    expect(names()).toEqual([t.choose, r.startOver]);
    await fireEvent.press(screen.getByRole('button', { name: t.choose }));
    expect(restore.choose).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: r.startOver }));
    expect(onAcceptEmpty).toHaveBeenCalledTimes(1);
    expect(restore.dismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(r.confirmMessage)).toBeNull();
  });

  it('recopie en échec, nouvelle confirmation : sans la phrase des données abîmées', async () => {
    await render_(
      { status: 'restoreFailed', pending: false },
      controls({ step: 'confirm', summary, draft: null, erase: false }),
    );
    expect(screen.queryByText(r.restoreErase)).toBeNull();
    expect(screen.getByRole('button', { name: t.confirm })).toBeEnabled();
  });

  it('recopie en échec, nouvelle recopie en cours : boutons désactivés', async () => {
    await render_({ status: 'restoreFailed', pending: true });
    expect(screen.getByRole('button', { name: t.choose })).toBeDisabled();
    expect(screen.getByRole('button', { name: r.startOver })).toBeDisabled();
  });

  it('« Réessayer » efface d’abord la carte du refus', async () => {
    const restore = controls({ step: 'rejected', reason: 'NOT_SQLITE' });
    await render_(failed('damaged'), restore);
    await fireEvent.press(screen.getByRole('button', { name: r.retry }));
    expect(restore.dismiss).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each<[ErasedBy, string]>([
    ['restore', r.restoreFailedTitle],
    ['startOver', r.title],
  ])(
    'base effacée, base neuve pas ouverte (%s) : message, titre, « Réessayer » seul',
    async (after, title) => {
      await render_({ status: 'erased', after, pending: false });
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
      expect(screen.getByText(r.erasedOpenFailed)).toBeTruthy();
      expect(screen.queryByText(/Rien n’a été effacé/)).toBeNull();
      expect(names()).toEqual([r.retry]);
      await fireEvent.press(screen.getByRole('button', { name: r.retry }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    },
  );

  it('base effacée, nouvel essai en cours : « Réessayer » désactivé', async () => {
    await render_({ status: 'erased', after: 'restore', pending: true });
    expect(screen.getByRole('button', { name: r.retry })).toBeDisabled();
  });
});
