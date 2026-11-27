// Écran de récupération seul (EX-22, ticket 014c) : variantes et boutons désactivés pendant un
// nouvel essai (revue de sécurité du 014c).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { labels } from '@/config/libelles';
import type { OpenFailure } from '@/data/open';
import { Recovery } from '@/ui/Recovery';

const r = labels.recovery;
const onRetry = jest.fn();
const onStartOver = jest.fn();
const show = (cause: OpenFailure, pending = false, resetFailed = false) =>
  render(
    <Recovery
      cause={cause}
      pending={pending}
      resetFailed={resetFailed}
      onRetry={onRetry}
      onStartOver={onStartOver}
    />,
  );

describe('EX-22 Recovery (ticket 014c)', () => {
  beforeEach(() => {
    onRetry.mockClear();
    onStartOver.mockClear();
  });

  it('pendant un nouvel essai, « Réessayer » et « Repartir de zéro » sont désactivés', async () => {
    await show('damaged', true);
    const retry = screen.getByRole('button', { name: r.retry });
    const startOver = screen.getByRole('button', { name: r.startOver });
    expect(retry).toBeDisabled();
    expect(startOver).toBeDisabled();
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
