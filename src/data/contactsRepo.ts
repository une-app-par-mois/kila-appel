// Contacts d'urgence d'un membre (EX-05) et recherche rapide (EX-06). Requêtes paramétrées
// (SEC-05) ; les erreurs portent un code, jamais un nom ni un téléphone (ABS-04).
import type { Db } from '@/data/db';
import { DataError, expectChanged } from '@/data/errors';
import { membersRepo } from '@/data/membersRepo';
import { type ContactInput, validateContact } from '@/domain/validation';

/** `phone` : 10 chiffres commençant par 0 (affichage : `formatPhone`). */
export type EmergencyContact = { id: number; memberId: number; label: string; phone: string };

/** EX-06 : un membre courant trouvé, ses groupes en cours et ses contacts dans l'ordre. */
export type ContactSearchResult = {
  memberId: number;
  firstName: string;
  lastName: string;
  groups: string[];
  contacts: EmergencyContact[];
};

type ContactRow = { id: number; member_id: number; label: string | null; phone: string };

const toContact = (r: ContactRow): EmergencyContact => ({
  id: r.id,
  memberId: r.member_id,
  // Toujours renseigné par ce dépôt ; la colonne admet NULL depuis la migration 1.
  label: r.label ?? '',
  phone: r.phone,
});

const COLUMNS = 'id, member_id, label, phone';

const expectMember = async (tx: Db, memberId: number) => {
  const [member] = await tx.query<{ id: number }>('SELECT id FROM members WHERE id = ?', [
    memberId,
  ]);
  if (!member) throw new DataError('NOT_FOUND');
};
const ORDER = 'ORDER BY position, id';

export const contactsRepo = (db: Db) => ({
  /** EX-05 : contacts du membre, dans l'ordre choisi. */
  listByMember: async (memberId: number): Promise<EmergencyContact[]> =>
    (
      await db.query<ContactRow>(
        `SELECT ${COLUMNS} FROM emergency_contacts WHERE member_id = ? ${ORDER}`,
        [memberId],
      )
    ).map(toContact),

  get: async (id: number): Promise<EmergencyContact | null> => {
    const [row] = await db.query<ContactRow>(
      `SELECT ${COLUMNS} FROM emergency_contacts WHERE id = ?`,
      [id],
    );
    return row ? toContact(row) : null;
  },

  /** EX-05 : ajouté après les autres ; membre archivé compris (sa fiche reste modifiable). Inconnu : NOT_FOUND. */
  create: async (memberId: number, input: ContactInput): Promise<number> => {
    const c = validateContact(input);
    return db.transaction(async (tx) => {
      await expectMember(tx, memberId);
      const { lastInsertRowId } = await tx.execute(
        `INSERT INTO emergency_contacts (member_id, label, phone, position)
         VALUES (?1, ?2, ?3,
           (SELECT COALESCE(MAX(position) + 1, 0) FROM emergency_contacts WHERE member_id = ?1))`,
        [memberId, c.label, c.phone],
      );
      return lastInsertRowId;
    });
  },

  update: async (id: number, input: ContactInput): Promise<void> => {
    const c = validateContact(input);
    expectChanged(
      await db.execute('UPDATE emergency_contacts SET label = ?, phone = ? WHERE id = ?', [
        c.label,
        c.phone,
        id,
      ]),
    );
  },

  /** Suppression réelle (ABS-05). */
  remove: async (id: number): Promise<void> => {
    expectChanged(await db.execute('DELETE FROM emergency_contacts WHERE id = ?', [id]));
  },

  /** EX-05 : nouvel ordre, d'un bloc. `ids` doit être exactement ses contacts, sinon NOT_FOUND. */
  reorder: async (memberId: number, ids: number[]): Promise<void> => {
    await db.transaction(async (tx) => {
      await expectMember(tx, memberId);
      const rows = await tx.query<{ id: number }>(
        'SELECT id FROM emergency_contacts WHERE member_id = ?',
        [memberId],
      );
      const own = new Set(rows.map((r) => r.id));
      const exact = ids.length === own.size && new Set(ids).size === ids.length;
      if (!exact || !ids.every((id) => own.has(id))) throw new DataError('NOT_FOUND');
      for (const [position, id] of ids.entries()) {
        await tx.execute('UPDATE emergency_contacts SET position = ? WHERE id = ?', [position, id]);
      }
    });
  },

  /** EX-06 : membres courants dont le nom ou le prénom correspond ; rien pour une saisie vide. */
  search: async (query: string, today: string): Promise<ContactSearchResult[]> => {
    if (query.trim() === '') return [];
    const members = await membersRepo(db).list({ today, query });
    if (members.length === 0) return [];
    // Seulement les contacts des membres trouvés : un « ? » par membre, valeurs liées (SEC-05).
    const ids = members.map((m) => m.id);
    const byMember = new Map<number, EmergencyContact[]>();
    for (const row of await db.query<ContactRow>(
      `SELECT ${COLUMNS} FROM emergency_contacts
       WHERE member_id IN (${ids.map(() => '?').join(', ')}) ${ORDER}`,
      ids,
    )) {
      byMember.set(row.member_id, [...(byMember.get(row.member_id) ?? []), toContact(row)]);
    }
    return members.map((m) => ({
      memberId: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      groups: m.groups,
      contacts: byMember.get(m.id) ?? [],
    }));
  },
});
