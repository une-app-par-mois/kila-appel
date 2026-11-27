/**
 * @jest-environment node
 */
// NF-08 : liste des alertes sur le jeu de volume (500 membres, 3 saisons), en une seule requête.
import { seedAlertsVolume, VOLUME_MEMBERS } from '@/__fixtures__/alertsSeed';
import { alertsRepo } from '@/data/alertsRepo';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

// Limite large : la mesure documente l'ordre de grandeur, elle ne doit pas rendre le test fragile.
const MAX_MS = 2000;

describe('alertsRepo : volume (NF-08)', () => {
  let db: Db;
  beforeAll(async () => {
    db = await prepareDatabase(openNodeDb());
    await seedAlertsVolume(db);
  }, 60_000);
  afterAll(async () => {
    await db.close();
  });

  it('NF-08 500 membres, 3 saisons : une requête, la saison active seule, durée mesurée', async () => {
    const query = jest.spyOn(db, 'query');
    const started = performance.now();
    const alerts = await alertsRepo(db).list('2026-11-27', 3);
    const durationMs = performance.now() - started;
    expect(query).toHaveBeenCalledTimes(1);
    expect(alerts).toHaveLength(VOLUME_MEMBERS / 5);
    expect(alerts.every((a) => a.streak === 3 && a.start === '2026-11-13')).toBe(true);
    // Trace de la mesure pour le compte rendu (aucune donnée personnelle, ABS-04).
    process.stdout.write(
      `NF-08 alertes sur ${VOLUME_MEMBERS} membres : ${Math.round(durationMs)} ms\n`,
    );
    expect(durationMs).toBeLessThan(MAX_MS);
    query.mockRestore();
  });
});
