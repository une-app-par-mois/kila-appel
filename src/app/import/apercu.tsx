// Import CSV : aperçu (maquette « Import CSV : aperçu », ticket 035, F-07, EX-30). Compteur, puis
// les sections Doublons (bascule « Ignorer »), Ligne invalide et Groupe introuvable (décision du
// porteur du 2026-11-28), cachées si vides ; rien n'est écrit avant le bouton. Le bouton suit les
// bascules : « Importer N membres », sinon « Inscrire M membres à leur groupe » (doublons de
// l'appli ignorés avec un groupe trouvé), désactivé à N = 0 et M = 0. Quitter l'écran (bouton,
// geste, retour Android) abandonne la session, sauf pendant l'écriture, où le retour est bloqué.
// ABS-04 : seuls des compteurs passent à l'écran de résultat.
import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate } from '@/domain/formats';
import type { DuplicateLine, ImportPreview } from '@/domain/memberImport';
import { type ImportState, useMemberImport } from '@/hooks/useMemberImport';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { FilterChip } from '@/ui/FilterChip';
import { Screen, Section } from '@/ui/Screen';

const t = labels.memberImport;

const mention = (d: DuplicateLine) => {
  if (d.source === 'file') return t.inFile;
  return d.archived ? t.inAppArchived : t.inApp;
};

/** Message sous l'aperçu après un appui sur le bouton, ou null. */
const messageOf = (state: ImportState): string | null => {
  if (state.step === 'stale') return t.stale;
  if (state.step === 'busy') return t.busy;
  return state.step === 'failed' ? t.writeFailed : null;
};

const Row = ({ title, detail }: { title: string; detail: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowTitle}>{title}</Text>
    <Text style={styles.rowDetail}>{detail}</Text>
  </View>
);

type DuplicatesProps = {
  duplicates: DuplicateLine[];
  ignored: (line: number) => boolean;
  onToggle: (line: number) => void;
};

const Duplicates = ({ duplicates, ignored, onToggle }: DuplicatesProps) => (
  <>
    <Section title={t.duplicatesSection(duplicates.length)} />
    <Card>
      {duplicates.map((d) => {
        const date = d.member.birthDate === null ? null : toDisplayDate(d.member.birthDate);
        const kept = !ignored(d.line);
        return (
          <View key={d.line} style={styles.duplicate}>
            <View style={styles.duplicateText}>
              <Text style={styles.rowTitle}>
                {labels.memberForm.fullName(d.member.firstName, d.member.lastName)}
              </Text>
              <Text style={[styles.rowDetail, styles.mono]}>
                {t.duplicateDetail(date, mention(d))}
              </Text>
              {kept && d.unknownGroup !== null && (
                <Text style={styles.rowDetail}>{t.keptWithoutGroup(d.unknownGroup)}</Text>
              )}
            </View>
            <FilterChip
              role="checkbox"
              label={t.ignore}
              selected={!kept}
              onPress={() => onToggle(d.line)}
            />
          </View>
        );
      })}
      {duplicates.some((d) => d.source === 'app') && (
        <Text style={styles.rowDetail}>{t.duplicatesNote}</Text>
      )}
    </Card>
  </>
);

const Lines = ({ preview }: { preview: ImportPreview }) => (
  <>
    {preview.invalid.length > 0 && (
      <>
        <Section title={t.invalidSection(preview.invalid.length)} />
        <Card>
          {preview.invalid.map((i) => (
            <Row key={i.line} title={t.line(i.line)} detail={t.invalidReason(i.field, i.code)} />
          ))}
        </Card>
      </>
    )}
    {preview.unknownGroups.length > 0 && (
      <>
        <Section title={t.unknownGroupSection(preview.unknownGroups.length)} />
        <Card>
          {preview.unknownGroups.map((u) => (
            <Row key={u.line} title={t.line(u.line)} detail={t.unknownGroup(u.group)} />
          ))}
        </Card>
      </>
    )}
  </>
);

const Counter = ({ counts }: { counts: ImportPreview['counts'] }) => (
  <Card>
    <View style={styles.counter}>
      <Text style={styles.count}>{t.counts.rows(counts.rows)}</Text>
      <Text style={styles.count}>{t.counts.toImport(counts.toImport)}</Text>
      <Text style={[styles.count, counts.invalid > 0 && styles.red]}>
        {t.counts.invalid(counts.invalid)}
      </Text>
      <Text style={styles.count}>{t.counts.duplicates(counts.duplicates)}</Text>
    </View>
  </Card>
);

export default function ImportPreviewScreen() {
  const router = useRouter();
  const { state, preview, confirm, abandon } = useMemberImport();
  const { seasons } = useSeasons();
  // Lignes des doublons gardés (bascule « Ignorer » décochée) ; par défaut, tous ignorés.
  const [kept, setKept] = useState<number[]>([]);
  const writing = state.step === 'writing';
  usePreventRemove(writing);
  // Écran quitté (bouton, geste, retour Android) : la session est abandonnée. Pendant l'écriture,
  // le retour est bloqué ; après, la session est déjà vidée par `confirm`.
  useEffect(() => abandon, [abandon]);
  useEffect(() => {
    if (state.step !== 'done') return;
    const params = Object.fromEntries(
      Object.entries(state.result).map(([key, value]) => [key, String(value)]),
    );
    router.replace({ pathname: '/import/resultat', params });
  }, [state, router]);

  const message = messageOf(state);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/import'));
  const done = state.step === 'done';
  if (preview === null) {
    return (
      <Screen title={t.previewTitle} onBack={writing ? undefined : back}>
        {!done && <Text style={styles.message}>{message ?? t.stale}</Text>}
      </Screen>
    );
  }
  const toggle = (line: number) =>
    setKept((lines) => (lines.includes(line) ? lines.filter((l) => l !== line) : [...lines, line]));
  const n = preview.counts.toImport + kept.length;
  const m = preview.duplicates.filter(
    (d) => d.source === 'app' && !kept.includes(d.line) && d.member.groupId !== null,
  ).length;
  const noSeason = seasons !== null && !seasons.some((s) => s.isActive);

  return (
    <Screen title={t.previewTitle} onBack={writing ? undefined : back}>
      <Counter counts={preview.counts} />
      {noSeason && <Text style={styles.message}>{t.noSeason}</Text>}
      {preview.duplicates.length > 0 && (
        <Duplicates
          duplicates={preview.duplicates}
          ignored={(line) => !kept.includes(line)}
          onToggle={toggle}
        />
      )}
      <Lines preview={preview} />
      {message !== null && (
        <Card warning>
          <Text style={styles.message}>{message}</Text>
        </Card>
      )}
      <Button
        label={n > 0 || m === 0 ? t.importN(n) : t.enrollM(m)}
        disabled={writing || (n === 0 && m === 0)}
        onPress={() => void confirm(preview, kept)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  count: { fontFamily: theme.fonts.digits, fontSize: 14, color: theme.colors.texte },
  red: { color: theme.colors.marge },
  row: { paddingVertical: theme.spacing * 1.5 },
  rowTitle: { fontFamily: theme.fonts.textSemi, fontSize: 16, color: theme.colors.texte },
  rowDetail: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  mono: { fontFamily: theme.fonts.digits },
  duplicate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
    paddingVertical: theme.spacing * 1.5,
  },
  duplicateText: { flex: 1 },
  message: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginVertical: theme.spacing * 2,
  },
});
