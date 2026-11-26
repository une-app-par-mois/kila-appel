// Section Groupes de la fiche d'un membre (maquette, EX-04) : groupes en cours ou à venir de la
// saison active ; « Retirer » à une date, ou « Annuler » une inscription qui n'a pas commencé ;
// « Ajouter à un groupe » inscrit aujourd'hui (décisions du porteur du 2026-11-26). Un membre
// archivé ne se retire ni ne s'inscrit.
import { useState } from 'react';
import { labels } from '@/config/libelles';
import type { MemberEnrollment } from '@/data/enrollmentsRepo';
import { previousDay, toDisplayDate } from '@/domain/formats';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';
import { WithdrawDialog } from '@/ui/WithdrawDialog';

type Props = {
  memberName: string;
  archived: boolean;
  today: string;
  groups: MemberEnrollment[];
  /** Groupes de la saison active où il n'est ni inscrit ni attendu. */
  addable: { id: number; name: string }[];
  busy: boolean;
  onAdd: (groupId: number) => void;
  onWithdraw: (enrollmentId: number, endDate: string) => Promise<void>;
  onCancel: (enrollmentId: number) => void;
};

export const MemberGroups = ({
  memberName,
  archived,
  today,
  groups,
  addable,
  busy,
  onAdd,
  onWithdraw,
  onCancel,
}: Props) => {
  const [withdrawing, setWithdrawing] = useState<MemberEnrollment | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [cancelling, setCancelling] = useState<MemberEnrollment | null>(null);
  return (
    <>
      <Section title={labels.memberGroups.title} />
      <Card>
        {groups.length === 0 && <ListRow title={labels.memberGroups.none} />}
        {groups.map((e) => (
          <ListRow
            key={e.enrollmentId}
            title={e.groupName}
            subtitle={
              e.startDate > today
                ? labels.group.from(toDisplayDate(e.startDate))
                : labels.memberGroups.period(
                    toDisplayDate(e.startDate),
                    e.endDate === null ? null : toDisplayDate(previousDay(e.endDate)),
                  )
            }
            right={
              archived ? undefined : e.startDate > today ? (
                <Button
                  label={labels.memberGroups.cancel}
                  accessibilityLabel={labels.rowAccessibility(
                    labels.memberGroups.cancel,
                    e.groupName,
                  )}
                  variant="compact"
                  onPress={() => setCancelling(e)}
                />
              ) : e.endDate === null ? (
                <Button
                  label={labels.memberGroups.withdraw}
                  accessibilityLabel={labels.rowAccessibility(
                    labels.memberGroups.withdraw,
                    e.groupName,
                  )}
                  variant="compact"
                  onPress={() => setWithdrawing(e)}
                />
              ) : undefined
            }
          />
        ))}
      </Card>
      {!archived && addable.length > 0 && (
        <Button
          label={labels.memberGroups.add}
          variant="secondary"
          disabled={busy}
          onPress={() => setChoosing(true)}
        />
      )}
      <ChoiceList
        visible={choosing}
        title={labels.memberGroups.add}
        value={null}
        options={addable.map((g) => ({ value: g.id, label: g.name }))}
        onChange={onAdd}
        onClose={() => setChoosing(false)}
      />
      {withdrawing !== null && (
        <WithdrawDialog
          visible
          title={labels.withdrawal.title(memberName, withdrawing.groupName)}
          initialDate={today}
          onConfirm={async (endDate) => {
            await onWithdraw(withdrawing.enrollmentId, endDate);
            setWithdrawing(null);
          }}
          onCancel={() => setWithdrawing(null)}
        />
      )}
      {cancelling !== null && (
        <ConfirmDialog
          visible
          title={labels.cancellation.title(memberName, cancelling.groupName)}
          message={labels.cancellation.message}
          cancelLabel={labels.common.keep}
          confirmLabel={labels.cancellation.confirm}
          onCancel={() => setCancelling(null)}
          onConfirm={() => {
            setCancelling(null);
            onCancel(cancelling.enrollmentId);
          }}
        />
      )}
    </>
  );
};
