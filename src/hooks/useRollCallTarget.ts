// Quel appel ouvre l'écran (EX-09, EX-17, EX-39) : `?creneau=&date=` (séance d'un créneau) ou
// `?groupe=&date=` (appel sans créneau, à l'heure d'ouverture : décision du porteur du 2026-11-27).
// Ce qui ne peut pas s'enregistrer est refusé dès l'ouverture, pas après l'appel. Un brouillon
// (EX-14) de cet appel est repris ; celui d'un autre appel bloque (décision du 2026-11-27).
import { useEffect, useRef, useState } from 'react';
import { type RollCallDraft, sameCall } from '@/data/draftsRepo';
import { isIsoDate, toIsoDate, toLocalTime } from '@/domain/formats';
import { isSlotDate } from '@/domain/occurrences';
import { useGroups } from '@/hooks/useGroups';
import { useDraft, useRollCall } from '@/hooks/useRollCall';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlot } from '@/hooks/useSlots';

export type RollCallTarget = {
  slotId: number | null;
  group: { id: number; name: string };
  date: string;
  startTime: string;
  place: string | null;
  /** Ouverture de l'appel (HH:MM) : celle du brouillon repris, sinon de l'écran. */
  startedAt: string;
  /** Brouillon de cet appel, à reprendre ; `null` s'il n'y en a pas. */
  draft: RollCallDraft | null;
};

/** Raison pour laquelle l'appel ne peut pas se faire (clé de `labels.errors`). */
export type TargetProblem =
  | 'NOT_FOUND'
  | 'NOT_A_SLOT_SESSION'
  | 'DATE_IN_FUTURE'
  | 'DATE_OUTSIDE_SEASON'
  | 'ALREADY_RECORDED'
  | 'DRAFT_IN_PROGRESS';

const id = (text: string | undefined) => (/^\d+$/.test(text ?? '') ? Number(text) : 0);

export const useRollCallTarget = (params: { creneau?: string; groupe?: string; date?: string }) => {
  const slotId = id(params.creneau);
  const groupId = id(params.groupe);
  const date = isIsoDate(params.date ?? '') ? (params.date ?? '') : '';
  const today = toIsoDate(new Date());
  // Heure d'un appel sans créneau : celle de l'ouverture de l'écran, figée ensuite.
  const [openedAt] = useState(() => toLocalTime(new Date()));
  const { slot, loaded: slotLoaded, loadFailed: slotFailed } = useSlot(slotId);
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const season = seasons?.find((s) => s.isActive) ?? null;
  const seasonId = slotId > 0 ? (slot?.seasonId ?? null) : (season?.id ?? null);
  const { groups, loadFailed: groupsFailed } = useGroups(seasonId);
  const { isRecorded } = useRollCall();
  const { draft, loaded: draftLoaded, loadFailed: draftFailed } = useDraft();
  const [recorded, setRecorded] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  // Groupe actif : celui du créneau (un groupe archivé refuserait l'enregistrement) ou le choisi.
  // Créneau à plusieurs groupes : celui du brouillon de cette séance s'il y est encore actif.
  const active = (gid: number) => groups?.find((g) => g.id === gid);
  const draftGroup =
    slot && draft?.slotId === slot.id && draft.date === date && draft.groupId !== null
      ? slot.groups.find((g) => g.id === draft.groupId && active(g.id))
      : undefined;
  const group = slot ? (draftGroup ?? slot.groups.find((g) => active(g.id))) : active(groupId);

  const call = group && { slotId: slot ? slot.id : null, groupId: group.id, date };
  const ownDraft = draft && call && sameCall(draft, call) ? draft : null;

  let problem: TargetProblem | undefined;
  let pending = false;
  if (!date || (slotId === 0 && groupId === 0)) problem = 'NOT_FOUND';
  else if (slotId > 0) {
    if (slotLoaded && slot === null) problem = 'NOT_FOUND';
    // L'enregistrement exige la saison active : refusé ici plutôt qu'après l'appel.
    else if (slot && seasons !== null && slot.seasonId !== season?.id) problem = 'NOT_FOUND';
    else if (slot && !isSlotDate(slot, date, today)) problem = 'NOT_A_SLOT_SESSION';
    else if (slot && groups !== null && !group) problem = 'NOT_FOUND';
    else if (recorded) problem = 'ALREADY_RECORDED';
    else pending = !slot || seasons === null || groups === null || recorded === null;
  } else if (seasons !== null && season === null) problem = 'NOT_FOUND';
  else if (groups !== null && !group) problem = 'NOT_FOUND';
  else if (date > today) problem = 'DATE_IN_FUTURE';
  else if (season && (date < season.startDate || date > season.endDate))
    problem = 'DATE_OUTSIDE_SEASON';
  else pending = groups === null;
  if (!problem && draft && call && !ownDraft) problem = 'DRAFT_IN_PROGRESS';
  if (!problem && !draftLoaded) pending = true;

  // RM-05 : vérifié une fois par séance (créneau, date) ; après l'enregistrement, les rechargements
  // ne le refont pas, sinon « déjà enregistrée » remplacerait « Appel enregistré ».
  const checkId = slot && date && isSlotDate(slot, date, today) ? slot.id : null;
  const checked = useRef<string | null>(null);
  useEffect(() => {
    const key = `${checkId}|${date}`;
    if (checkId === null || checked.current === key) return;
    checked.current = key;
    setRecorded(null);
    isRecorded(checkId, date).then(setRecorded, () => setCheckFailed(true));
  }, [checkId, date, isRecorded]);

  const startedAt = ownDraft ? ownDraft.startedAt : openedAt;
  const target: RollCallTarget | null =
    !problem && !pending && group
      ? {
          slotId: slot ? slot.id : null,
          group: { id: group.id, name: group.name },
          date,
          startTime: slot ? slot.startTime : startedAt,
          place: slot ? slot.place : null,
          startedAt,
          draft: ownDraft,
        }
      : null;
  return {
    target,
    /** Nom du groupe dès qu'il est connu (titre de l'écran, même en cas de refus). */
    groupName: group?.name ?? null,
    problem,
    /** Le brouillon d'un autre appel, quand il bloque celui-ci (« Reprendre l'appel »). */
    blockingDraft: problem === 'DRAFT_IN_PROGRESS' ? draft : null,
    loadFailed: slotFailed || seasonsFailed || groupsFailed || checkFailed || draftFailed,
  };
};
