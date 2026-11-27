// Sauvegarde (maquette « Sauvegarde et données », ticket 014b, EX-19, EX-21) : avertissement
// complet au-dessus du bouton (SEC-09, ABS-06 : jamais réduit), export par le partage du système,
// date de la dernière sauvegarde ; section Restaurer, qui ouvre l'écran Restauration (ticket 014e,
// EX-20). Section Conservation (ticket 015b, EX-24, SEC-11) : « Garder les [3 ▾] dernières
// saisons », saisons au-delà, purge après une confirmation chiffrée, sous le verrou commun. Section
// Tout effacer (ticket 015f, EX-23) : première confirmation, qui ouvre l'écran Tout effacer.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels, type PurgeCounts } from '@/config/libelles';
import { theme } from '@/config/theme';
import { expoBackupDeps } from '@/data/expoFiles';
import { log } from '@/data/log';
import { useFileLock } from '@/hooks/fileLock';
import { toLastBackup, useBackupExport, useLastBackup } from '@/hooks/useBackupExport';
import { useErase } from '@/hooks/useErase';
import { useLocalNow } from '@/hooks/useLocalNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Icon } from '@/ui/Icon';
import { Screen, Section } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';

const t = labels.backup;
const r = labels.restore;
const k = labels.retention;
const p = labels.purge;
const e = labels.eraseAll;
const RETENTION_CHOICES = [1, 2, 3].map((n) => ({ value: n, label: k.choice(n) }));

/** Confirmation ouverte : saisons visées, et ce que la purge effacera. */
type Pending = { ids: number[]; names: string[]; counts: PurgeCounts };

/** EX-24 : durée de conservation, saisons au-delà, purge confirmée (sans purge automatique). */
const Retention = ({ locked }: { locked: boolean }) => {
  const { retention, candidates, loadFailed, purging, setRetention, impact, purgeNow } = useErase();
  const [choosing, setChoosing] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (retention === null || candidates === null) {
    return loadFailed ? <Text style={styles.error}>{labels.common.loadFailed}</Text> : null;
  }
  const names = candidates.map((season) => season.name);
  const choose = async (n: number) => {
    setError((await setRetention(n)) ? null : k.saveFailed);
  };
  const ask = async () => {
    setError(null);
    const ids = candidates.map((season) => season.id);
    try {
      setPending({ ids, names, counts: await impact(ids) });
    } catch {
      log('PURGE_IMPACT_FAILED');
      setError(p.failed);
    }
  };
  const confirm = async () => {
    const target = pending;
    if (target === null) return;
    const done = await purgeNow(target.ids);
    // Après la purge, retour à Sauvegarde : la confirmation se ferme sur l'écran rechargé.
    setPending(null);
    if (!done) setError(p.failed);
  };
  return (
    <Card>
      <View style={styles.keep}>
        <Text style={styles.keepText}>{k.keepBefore(retention)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={k.accessibility(retention)}
          onPress={() => setChoosing(true)}
          disabled={locked}
          style={styles.choice}
        >
          <Text style={styles.choiceValue}>{retention}</Text>
          <Icon name="choices" />
        </Pressable>
        <Text style={styles.keepText}>{k.keepAfter(retention)}</Text>
      </View>
      <Text style={styles.note}>{names.length === 0 ? k.none : k.over(names)}</Text>
      {names.length > 0 && (
        <View style={styles.action}>
          <Button
            label={k.purge(names)}
            variant="secondary"
            onPress={() => void ask()}
            disabled={locked}
          />
        </View>
      )}
      {error !== null && <Text style={styles.error}>{error}</Text>}
      <ChoiceList
        visible={choosing}
        title={k.choiceTitle}
        value={retention}
        options={RETENTION_CHOICES}
        onChange={(n) => void choose(n)}
        onClose={() => setChoosing(false)}
      />
      <ConfirmDialog
        visible={pending !== null}
        title={p.title(pending?.names ?? [])}
        message={
          pending === null ? null : (
            <>
              {p.messageBefore}
              <Text style={styles.strong}>{p.messageStrong}</Text>
              {p.messageAfter(pending.names, pending.counts)}
            </>
          )
        }
        note={pending === null ? undefined : p.note(pending.counts)}
        cancelLabel={p.cancel}
        confirmLabel={p.confirm}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
        busy={purging}
      />
    </Card>
  );
};

export default function Backup() {
  const router = useRouter();
  const { exportNow, busy, failed } = useBackupExport(expoBackupDeps);
  const { lastBackup, loaded, loadFailed } = useLastBackup();
  // Export et restauration ne tournent jamais en même temps (verrou commun, revue du 014e).
  const locked = useFileLock() !== null;
  // Horloge partagée (ticket 012) : « aujourd'hui » devient « hier » après minuit, page ouverte.
  const now = useLocalNow();
  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/parametres'))}
      error={loadFailed ? labels.common.loadFailed : undefined}
    >
      <Card warning>
        <Text style={styles.title}>{t.warningTitle}</Text>
        <Text style={styles.text}>
          {t.warningBefore}
          <Text style={styles.strong}>{t.warningStrong}</Text>
          {t.warningAfter}
        </Text>
      </Card>
      <Button label={t.export} onPress={() => void exportNow()} disabled={busy || locked} />
      {failed && <Text style={styles.error}>{t.exportFailed}</Text>}
      {loaded && <Text style={styles.note}>{t.last(toLastBackup(lastBackup, now.date))}</Text>}
      <Section title={r.section} />
      <Card>
        <Text style={styles.intro}>
          {r.introBefore}
          <Text style={styles.strong}>{r.introStrong}</Text>
          {r.introAfter}
        </Text>
        <Button
          label={r.choose}
          variant="secondary"
          onPress={() => router.push('/restauration')}
          disabled={busy || locked}
        />
      </Card>
      <Section title={k.section} />
      <Retention locked={busy || locked} />
      <Section title={e.section} />
      <Card>
        <Text style={styles.intro}>{e.intro}</Text>
        <Button
          label={e.open}
          variant="destructiveSecondary"
          onPress={() => router.push('/tout-effacer')}
          disabled={busy || locked}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keep: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing * 2 },
  choice: {
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing,
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
  },
  keepText: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  choiceValue: { fontFamily: theme.fonts.digits, fontSize: 16, color: theme.colors.texte },
  action: { marginTop: theme.spacing * 2 },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texte,
    marginTop: theme.spacing,
  },
  strong: { fontFamily: theme.fonts.title },
  intro: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texte,
    marginBottom: theme.spacing * 2.5,
  },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.marge,
    marginTop: theme.spacing * 2,
  },
});
