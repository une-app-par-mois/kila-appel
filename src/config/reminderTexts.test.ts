/**
 * @jest-environment node
 */
// Texte des relances (ticket 027, EX-28) : maquette « Relance sur l'écran verrouillé », au
// caractère près. ABS-04, SEC-12 : le groupe seul, jamais un nom de membre.
import { seed } from '@/__fixtures__/seed';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { groupsRepo } from '@/data/groupsRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { seasonsRepo } from '@/data/seasonsRepo';
import { sessionsRepo } from '@/data/sessionsRepo';
import { settingsRepo } from '@/data/settingsRepo';
import { slotsRepo } from '@/data/slotsRepo';
import { plannedReminders, type ReminderSlot } from '@/domain/reminders';

const r = labels.reminder;
const NOW = { date: '2026-11-30', time: '08:00' };

/** Relances calculées sur des données lues par les dépôts, comme sur l'appareil (028b). */
const plannedFromRepos = async (db: Db) => {
  const season = await seasonsRepo(db).getActive();
  if (!season) throw new Error('saison active attendue');
  const groups = await groupsRepo(db).listBySeason(season.id);
  const slots = await slotsRepo(db).listBySeason(season.id);
  return plannedReminders({
    slots: slots as ReminderSlot[],
    activeGroupIds: groups.map((g) => g.id),
    season,
    sessions: await sessionsRepo(db, NOW.date).reminderSessions(season.id),
    settings: await settingsRepo(db).reminderSettings(),
    now: NOW,
  });
};

describe('EX-28 textes de la relance', () => {
  it('maquette : titre et corps, au caractère près', () => {
    expect(r.title(['Poussins mercredi'])).toBe('Appel non fait : Poussins mercredi');
    expect(r.body('14:00')).toBe('Le créneau a commencé à 14:00.');
  });

  it('F-11 plusieurs groupes : noms joints', () => {
    expect(r.title(['Benjamins', 'Poussins'])).toBe('Appel non fait : Benjamins et Poussins');
    expect(r.title(['A', 'B', 'C'])).toBe('Appel non fait : A, B et C');
  });
});

describe('SEC-12 ABS-04 aucune relance ne nomme un membre', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  // Noms reconnaissables, inventés (SEC-13).
  const MEMBERS = [
    ['Zéphyrinovitch', 'Anatolie'],
    ['Quintessenza', 'Barnabé'],
    ['Poussinard', 'Mercredine'],
  ] as const;

  it('SEC-12 jeu fictif lu par les dépôts : titres et corps sans prénom ni nom', async () => {
    const s = await seed(db);
    const { lastInsertRowId: benjamins } = await db.execute(
      'INSERT INTO groups (season_id, name) VALUES (?, ?)',
      [s.seasonId, 'Benjamins'],
    );
    await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
      s.slotId,
      benjamins,
    ]);
    // Vendredi à 23:45 : relance le lendemain à 00:15.
    const { lastInsertRowId: friday } = await db.execute(
      'INSERT INTO slots (season_id, weekday, start_time, duration_min, schedule_from) VALUES (?, 5, ?, 60, ?)',
      [s.seasonId, '23:45', '2026-09-01'],
    );
    await db.execute('INSERT INTO slot_groups (slot_id, group_id) VALUES (?, ?)', [
      friday,
      benjamins,
    ]);
    for (const [lastName, firstName] of MEMBERS) {
      const { lastInsertRowId: member } = await db.execute(
        'INSERT INTO members (last_name, first_name) VALUES (?, ?)',
        [lastName, firstName],
      );
      for (const group of [s.groupId, benjamins])
        await db.execute(
          'INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)',
          [member, group, '2026-09-01'],
        );
    }
    await settingsRepo(db).setReminderEnabled(true);

    const reminders = await plannedFromRepos(db);
    expect(reminders.length).toBe(2);

    const texts = reminders.flatMap((x) => [r.title(x.groupNames), r.body(x.startTime)]);
    expect(texts).toEqual([
      'Appel non fait : Benjamins et Poussins',
      'Le créneau a commencé à 17:30.',
      'Appel non fait : Benjamins',
      'Le créneau a commencé à 23:45.',
    ]);
    const people = await db.query<{ last_name: string; first_name: string }>(
      'SELECT last_name, first_name FROM members',
    );
    expect(people.length).toBe(5);
    const folded = texts.join('\n').toLowerCase();
    for (const { last_name, first_name } of people) {
      expect(folded).not.toContain(last_name.toLowerCase());
      expect(folded).not.toContain(first_name.toLowerCase());
    }
    // Aucun champ d'une relance ne porte un nom de membre (données passées au 028).
    const payload = JSON.stringify(reminders).toLowerCase();
    for (const { last_name, first_name } of people) {
      expect(payload).not.toContain(last_name.toLowerCase());
      expect(payload).not.toContain(first_name.toLowerCase());
    }
  });
});

describe('EX-36 EX-38 état de la séance lu par le dépôt', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  // Créneau du mercredi 17:30 du jeu fictif : relance le 2026-12-02 à 18:00 (délai de 30 min).
  const markSession = (seasonId: number, slotId: number, state: string) =>
    db.execute(
      'INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, ?, ?, ?, ?)',
      [seasonId, slotId, '2026-12-02', '17:30', state],
    );

  it.each([
    ['prepared', ['2026-12-02']],
    ['cancelled', []],
    ['unscheduled', []],
  ])('EX-36 EX-38 séance future %s : relances %p', async (state, dates) => {
    const s = await seed(db);
    await settingsRepo(db).setReminderEnabled(true);
    await markSession(s.seasonId, s.slotId, state);
    const reminders = await plannedFromRepos(db);
    expect(reminders.map((x) => x.date)).toEqual(dates);
  });
});
