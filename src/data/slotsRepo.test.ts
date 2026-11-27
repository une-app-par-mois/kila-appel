/**
 * @jest-environment node
 */
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { slotsRepo } from '@/data/slotsRepo';

const TODAY = '2026-11-27';

describe('Dépôt des créneaux (EX-07)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  const input = (overrides = {}) => ({
    weekday: 1,
    startTime: '18:00',
    durationMin: 90,
    place: 'Dojo municipal',
    name: null,
    groupId: s.groupId,
    ...overrides,
  });
  const session = async () =>
    (
      await db.query<{ slot_id: number | null; date: string; start_time: string }>(
        'SELECT slot_id, date, start_time FROM sessions WHERE id = ?',
        [s.sessionId],
      )
    )[0];

  it('EX-07 crée un créneau : date d’effet du jour, son groupe ; liste triée par jour puis heure', async () => {
    const repo = slotsRepo(db);
    const id = await repo.create(s.seasonId, input({ name: ' Technique ' }), TODAY);
    expect(await repo.get(id)).toEqual({
      id,
      seasonId: s.seasonId,
      weekday: 1,
      startTime: '18:00',
      durationMin: 90,
      place: 'Dojo municipal',
      name: 'Technique',
      scheduleFrom: TODAY,
      groups: [{ id: s.groupId, name: 'Poussins' }],
    });
    // Le créneau du jeu fictif a lieu le mercredi (3) : le lundi passe devant.
    expect((await repo.listBySeason(s.seasonId)).map((x) => x.id)).toEqual([id, s.slotId]);
    expect(await repo.listBySeason(s.otherSeasonId)).toEqual([]);
  });

  it('EX-07 groupe d’une autre saison, archivé ou inconnu : refusé, rien n’est écrit', async () => {
    const repo = slotsRepo(db);
    const [other] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    for (const groupId of [other?.id ?? 0, 9999]) {
      await expect(repo.create(s.seasonId, input({ groupId }), TODAY)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    }
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    await expect(repo.create(s.seasonId, input(), TODAY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(repo.create(s.seasonId, input({ weekday: 9 }), TODAY)).rejects.toMatchObject({
      code: 'WEEKDAY_INVALID',
    });
    expect(await count(db, 'slots')).toBe(1);
  });

  it('EX-07 modifier le lieu, le nom, la durée ou le groupe garde la date d’effet ; séances intactes', async () => {
    const repo = slotsRepo(db);
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    const before = await session();
    await repo.update(
      s.slotId,
      input({ weekday: 3, startTime: '17:30', durationMin: 60, place: null, groupId: lundi }),
      TODAY,
    );
    expect(await repo.get(s.slotId)).toMatchObject({
      durationMin: 60,
      place: null,
      scheduleFrom: '2025-09-01',
      groups: [{ id: lundi, name: 'Benjamins lundi' }],
    });
    expect(await session()).toEqual(before);
    expect(await count(db, 'session_groups', 'group_id = ?', [s.groupId])).toBe(1);
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
  });

  it('EX-07 changer le jour ou l’heure avance la date d’effet au jour même ; séances intactes', async () => {
    const repo = slotsRepo(db);
    const before = await session();
    await repo.update(s.slotId, input({ weekday: 3, startTime: '18:00' }), TODAY);
    expect((await repo.get(s.slotId))?.scheduleFrom).toBe(TODAY);
    await repo.update(s.slotId, input({ weekday: 4, startTime: '18:00' }), '2026-12-01');
    expect((await repo.get(s.slotId))?.scheduleFrom).toBe('2026-12-01');
    expect(await session()).toEqual(before);
    // Appel interrompu gardé tel quel (décision du porteur du 2026-11-27).
    expect(
      await count(db, 'roll_call_drafts', 'slot_id = ? AND date = ?', [s.slotId, '2026-12-02']),
    ).toBe(1);
  });

  it('EX-07 la date d’effet ne recule jamais, même si l’horloge de l’appareil recule', async () => {
    const repo = slotsRepo(db);
    await repo.update(s.slotId, input({ weekday: 5 }), '2026-12-10');
    await repo.update(s.slotId, input({ weekday: 6 }), TODAY);
    expect((await repo.get(s.slotId))?.scheduleFrom).toBe('2026-12-10');
  });

  it('EX-07 supprimer un créneau garde ses séances et leurs présences (créneau vidé)', async () => {
    await slotsRepo(db).remove(s.slotId);
    expect(await count(db, 'slots')).toBe(0);
    expect(await count(db, 'slot_groups')).toBe(0);
    expect(await session()).toMatchObject({ slot_id: null, date: '2026-11-25' });
    expect(await count(db, 'attendances', 'session_id = ?', [s.sessionId])).toBe(2);
  });

  it('EX-07 créneau inconnu ou ponctuel : lu comme absent ; modifier ou supprimer est refusé', async () => {
    const repo = slotsRepo(db);
    expect(await repo.get(9999)).toBeNull();
    await expect(repo.update(9999, input(), TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repo.remove(9999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // Ponctuel (F-10, lot 2) : hors de ce dépôt, même pour la suppression.
    const { lastInsertRowId: oneOff } = await db.execute(
      "INSERT INTO slots (season_id, start_time, duration_min, schedule_from) VALUES (?, '10:00', 60, ?)",
      [s.seasonId, TODAY],
    );
    expect(await repo.get(oneOff)).toBeNull();
    await expect(repo.remove(oneOff)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await count(db, 'slots', 'id = ?', [oneOff])).toBe(1);
  });

  it('EX-07 modifier : le groupe doit être de la saison du créneau et non archivé', async () => {
    const repo = slotsRepo(db);
    const [other] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    await expect(
      repo.update(s.slotId, input({ groupId: other?.id ?? 0 }), TODAY),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await repo.get(s.slotId))?.groups).toEqual([{ id: s.groupId, name: 'Poussins' }]);
    // Son groupe archivé depuis : le créneau se modifie encore sans en changer.
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    await repo.update(s.slotId, input({ weekday: 3, startTime: '17:30', place: 'Dojo' }), TODAY);
    expect((await repo.get(s.slotId))?.place).toBe('Dojo');
  });

  it('EX-07 F-11 créneau déjà lié à plusieurs groupes : en choisir un remplace tous les liens', async () => {
    const repo = slotsRepo(db);
    const { lastInsertRowId: lundi } = await db.execute(
      "INSERT INTO groups (season_id, name, archived_at) VALUES (?, 'Benjamins lundi', ?)",
      [s.seasonId, TODAY],
    );
    await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
      s.slotId,
      lundi,
    ]);
    // Un groupe archivé déjà lié reste choisissable, quel que soit l'ordre des liens.
    await repo.update(s.slotId, input({ weekday: 3, startTime: '17:30', groupId: lundi }), TODAY);
    expect((await repo.get(s.slotId))?.groups).toEqual([{ id: lundi, name: 'Benjamins lundi' }]);
  });

  it('EX-07 ce que la suppression effacera : l’appel interrompu sur ce créneau, s’il y en a un', async () => {
    const repo = slotsRepo(db);
    expect(await repo.deletionImpact(s.slotId)).toEqual({ rollCallDraft: true });
    await db.execute('DELETE FROM roll_call_drafts');
    expect(await repo.deletionImpact(s.slotId)).toEqual({ rollCallDraft: false });
    await expect(repo.deletionImpact(9999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
