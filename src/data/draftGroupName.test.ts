/**
 * @jest-environment node
 */
// EX-14, ticket 014e (décision du porteur du 2026-11-27) : la restauration n'apprend de l'appel en
// cours que son existence et le nom de son groupe, jamais ses statuts ni son commentaire.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { seed } from '@/__fixtures__/seed';
import { TEST_FILE, walkSources } from '@/__fixtures__/sourceFiles';
import type { Db } from '@/data/db';
import { draftGroupName } from '@/data/draftGroupName';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const root = join(__dirname, '../..');
const SELF = 'src/data/draftGroupName.ts';

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

  it('EX-14 seul src/hooks/useRestore.ts l’importe (hors tests)', () => {
    const importing = walkSources(join(root, 'src'))
      .map((path) => relative(root, path))
      .filter((file) => !TEST_FILE.test(file) && file !== SELF)
      .filter((file) => /draftGroupName/.test(readFileSync(join(root, file), 'utf8')));
    expect(importing).toEqual(['src/hooks/useRestore.ts']);
  });

  it('EX-14 n’exporte que draftGroupName et DraftGroup', () => {
    const tree = ts.createSourceFile(
      SELF,
      readFileSync(join(root, SELF), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const exported = tree.statements.flatMap((statement) => {
      if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return ['*'];
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return [];
      if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.map((d) => d.name.getText());
      }
      const named = statement as ts.Statement & { name?: ts.Identifier };
      return [named.name?.text ?? '*'];
    });
    expect(exported.sort()).toEqual(['DraftGroup', 'draftGroupName']);
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
