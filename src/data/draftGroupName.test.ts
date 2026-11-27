/**
 * @jest-environment node
 */
// EX-14, ticket 014e (décision du porteur du 2026-11-27) : la restauration n'apprend de l'appel en
// cours que son existence et le nom de son groupe, jamais ses statuts ni son commentaire.
import { seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { draftGroupName } from '@/data/draftGroupName';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

describe('EX-14 draftGroupName : nom du groupe de l’appel en cours', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
  });
  afterEach(() => db.close());

  it('rend le nom du groupe, et rien d’autre', async () => {
    expect(await draftGroupName(db)).toEqual({ groupName: 'Poussins' });
  });

  it('groupe retiré de l’appel (supprimé depuis) : un appel sans nom', async () => {
    await db.execute('DELETE FROM roll_call_draft_groups');
    expect(await draftGroupName(db)).toEqual({ groupName: null });
  });

  it('aucun appel en cours : null', async () => {
    await db.execute('DELETE FROM roll_call_drafts');
    expect(await draftGroupName(db)).toBeNull();
  });

  it('plusieurs groupes : le premier, comme l’appel', async () => {
    await db.execute(
      "INSERT INTO groups (season_id, name) VALUES ((SELECT season_id FROM roll_call_drafts), 'Aînés')",
    );
    await db.execute(
      "INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, (SELECT id FROM groups WHERE name = 'Aînés'))",
    );
    expect(await draftGroupName(db)).toEqual({ groupName: 'Poussins' });
  });
});
