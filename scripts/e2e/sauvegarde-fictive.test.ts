/**
 * @jest-environment node
 */
// Ticket 016 : la sauvegarde fictive que `scripts/e2e.sh` dépose dans Téléchargements doit être
// acceptée par l'appli (EX-20, SEC-10) et résumée comme le parcours Maestro l'attend. Produite à
// l'exécution (SEC-13 : aucun .db dans le dépôt), données fictives seulement.
import { nodeFiles, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { E2E_BACKUP, writeE2eBackup } from '@/__fixtures__/e2eBackup';
import { verifyBackup } from '@/data/backupCheck';
import { openNodeDb } from '@/data/nodeDb';

jest.mock('@/data/log', () => ({ log: jest.fn() }));

describe('016 EX-20 sauvegarde fictive des parcours de bout en bout', () => {
  let dir: ReturnType<typeof tempDir>;
  beforeEach(() => {
    dir = tempDir();
  });
  afterEach(() => dir.remove());

  const verify = async (today: string) => {
    const path = dir.path('fictive.db');
    await writeE2eBackup(path, today);
    return verifyBackup(path, dir.path('verif.db'), { files: nodeFiles, open: openNode, today });
  };

  it('passe verifyBackup, avec le résumé attendu par le parcours', async () => {
    const result = await verify('2026-11-27');
    expect(result.ok && result.backup.summary).toEqual({
      members: 5,
      groups: 2,
      recordedSessions: E2E_BACKUP.sessions.length,
      backupDate: '2026-11-27',
    });
  });

  it('en début de saison, les séances restent dans la saison et passent encore', async () => {
    const result = await verify('2026-09-02');
    expect(result.ok && result.backup.summary.recordedSessions).toBe(3);
  });

  // En juillet et en août, la saison de Bienvenue commence en septembre : la sauvegarde doit rester
  // valable (saison qui contient aujourd'hui, séances jamais à venir).
  it.each(['2026-07-15', '2026-08-31'])('le %s, la sauvegarde s’écrit et passe', async (today) => {
    const result = await verify(today);
    expect(result.ok && result.backup.summary.recordedSessions).toBe(3);
  });

  it('les séances tombent dans les 30 derniers jours, sans aucune à venir', async () => {
    const path = dir.path('fictive.db');
    await writeE2eBackup(path, '2026-11-27');
    const db = openNodeDb(path);
    const rows = await db.query<{ date: string }>('SELECT date FROM sessions ORDER BY date');
    await db.close();
    expect(rows.map((r) => r.date)).toEqual(['2026-11-13', '2026-11-17', '2026-11-20']);
  });

  it('refuse d’écrire sur un fichier qui existe déjà', async () => {
    const path = dir.path('fictive.db');
    await writeE2eBackup(path, '2026-11-27');
    await expect(writeE2eBackup(path, '2026-11-27')).rejects.toThrow();
  });
});
