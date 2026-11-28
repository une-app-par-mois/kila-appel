// Contenu du CSV des présences (F-08, EX-31) : une ligne par séance et par membre. Domaine pur :
// les textes viennent de `src/config/libelles/` en paramètre ; SEC-07 dans `csvWrite.ts`.
import { toCsv } from '@/domain/csvWrite';
import { toDisplayDate } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';

/** Une présence d'une séance enregistrée, telle que le dépôt la lit. */
export type ExportRow = {
  date: string;
  startTime: string;
  /** Faux si la séance n'a pas (ou plus) de créneau (EX-39, EX-07). */
  hasSlot: boolean;
  slotName: string | null;
  /** Groupes pour lesquels la présence compte (RM-03), déjà triés ; vide : aucun. */
  groups: readonly string[];
  lastName: string;
  firstName: string;
  status: AttendanceStatus;
};

export type AttendanceCsvLabels = {
  /** « Date;Créneau;Groupe;Nom;Prénom;Statut ». */
  header: readonly string[];
  noSlot: string;
  noGroup: string;
  statuses: Readonly<Record<AttendanceStatus, string>>;
  /** Lundi en premier. */
  weekdays: readonly string[];
};

/** Nom du créneau ; sans nom, jour de la date de la séance et son heure ; sans créneau, « Sans créneau ». */
const slotLabel = (row: ExportRow, labels: AttendanceCsvLabels): string => {
  if (!row.hasSlot) return labels.noSlot;
  const name = row.slotName?.trim();
  if (name) return name;
  return `${labels.weekdays[weekdayOfDate(row.date) - 1] ?? ''} ${row.startTime}`;
};

/** EX-31 : texte du fichier (BOM, en-tête, une ligne par présence, CRLF). */
export const attendanceCsv = (rows: readonly ExportRow[], labels: AttendanceCsvLabels): string =>
  toCsv(
    labels.header,
    rows.map((row) => [
      toDisplayDate(row.date),
      slotLabel(row, labels),
      row.groups.length > 0 ? row.groups.join(', ') : labels.noGroup,
      row.lastName,
      row.firstName,
      labels.statuses[row.status],
    ]),
  );
