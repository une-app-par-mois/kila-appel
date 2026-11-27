import { renderHook, waitFor } from '@testing-library/react-native';
import { useLoaded } from '@/hooks/useLoaded';

jest.mock('@/data/log', () => ({ log: jest.fn() }));

describe('useLoaded', () => {
  it('keepPrevious : valeur et « chargé » gardés pendant la nouvelle lecture (accueil, ticket 012)', async () => {
    const pending = new Promise<string>(() => {});
    const first = () => Promise.resolve('avant');
    const second = () => pending;
    const { result, rerender } = await renderHook(
      ({ load }: { load: () => Promise<string> }) => useLoaded(load, 'TEST_FAILED', {}, true),
      { initialProps: { load: first } },
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await rerender({ load: second });
    expect(result.current).toMatchObject({ value: 'avant', loaded: true });
  });

  it('sans keepPrevious : la valeur est vidée à chaque nouvelle lecture', async () => {
    const { result, rerender } = await renderHook(
      ({ load }: { load: () => Promise<string> }) => useLoaded(load, 'TEST_FAILED'),
      { initialProps: { load: () => Promise.resolve('avant') } },
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await rerender({ load: () => new Promise<string>(() => {}) });
    expect(result.current).toMatchObject({ value: null, loaded: false });
  });
});
