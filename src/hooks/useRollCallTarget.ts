// Quel appel ouvre l'écran (EX-09, EX-17, EX-39) : `?creneau=&date=` (séance d'un créneau) ou
// `?groupe=&date=` (appel sans créneau, à l'heure d'ouverture : décision du porteur du 2026-11-27).
// Ce qui ne peut pas s'enregistrer est refusé dès l'ouverture, pas après l'appel.
import { useEffect, useRef, useState } from 'react';
import { isIsoDate, toIsoDate, toLocalTime } from '@/domain/formats';
import { isSlotDate } from '@/domain/occurrences';
import { useGroups } from '@/hooks/useGroups';
import { useRollCall } from '@/hooks/useRollCall';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlot } from '@/hooks/useSlots';

export type RollCallTarget = {
  slotId: number | null;
  group: { id: number; name: string };
  date: string;
  startTime: string;
  place: string | null;
};

/** Raison pour laquelle l'appel ne peut pas se faire (clé de `labels.errors`). */
export type TargetProblem =
  | 'NOT_FOUND'
  | 'NOT_A_SLOT_SESSION'
  | 'DATE_IN_FUTURE'
  | 'DATE_OUTSIDE_SEASON'
  | 'ALREADY_RECORDED';

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
  const [recorded, setRecorded] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  // Groupe actif : celui du créneau (un groupe archivé refuserait l'enregistrement) ou le choisi.
  const active = (gid: number) => groups?.find((g) => g.id === gid);
  const group = slot ? slot.groups.find((g) => active(g.id)) : active(groupId);

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

  const target: RollCallTarget | null =
    !problem && !pending && group
      ? {
          slotId: slot ? slot.id : null,
          group: { id: group.id, name: group.name },
          date,
          startTime: slot ? slot.startTime : openedAt,
          place: slot ? slot.place : null,
        }
      : null;
  return {
    target,
    /** Nom du groupe dès qu'il est connu (titre de l'écran, même en cas de refus). */
    groupName: group?.name ?? null,
    problem,
    loadFailed: slotFailed || seasonsFailed || groupsFailed || checkFailed,
  };
};
