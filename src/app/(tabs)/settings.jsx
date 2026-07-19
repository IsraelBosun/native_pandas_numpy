import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/hooks/use-theme-preference';
import { getNotificationsEnabled, resetOnboarding } from '@/lib/cards';
import { disableDailyReminder, enableDailyReminder } from '@/lib/notifications';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: 'smartphone' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Settings</ThemedText>

          <Section title="Appearance">
            <ThemePicker />
          </Section>

          <Section title="Notifications">
            <NotificationsToggle />
          </Section>

          <Section title="Help">
            <ReplayOnboardingRow />
          </Section>

          <Section title="Account" subtitle="Coming soon">
            <SettingsRow icon="log-in" label="Log in" description="Sync progress across devices" disabled />
          </Section>

          <Section title="Community" subtitle="Coming soon">
            <SettingsRow
              icon="award"
              label="Opt in to leaderboard"
              description="Compare your XP with other learners"
              disabled
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ThemePicker() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.segmented}>
      {THEME_OPTIONS.map((option) => {
        const selected = option.value === preference;
        return (
          <ScalePressable
            key={option.value}
            haptic="light"
            scaleTo={0.96}
            style={styles.segmentWrap}
            onPress={() => setPreference(option.value)}>
            <View
              style={[
                styles.segment,
                {
                  borderColor: selected ? theme.action : theme.border,
                  backgroundColor: selected ? theme.action : theme.backgroundElement,
                },
              ]}>
              <Feather name={option.icon} size={16} color={selected ? '#FFFFFF' : theme.textSecondary} />
              <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                {option.label}
              </ThemedText>
            </View>
          </ScalePressable>
        );
      })}
    </View>
  );
}

function NotificationsToggle() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState(null);

  useEffect(() => {
    getNotificationsEnabled().then((value) => {
      setEnabled(value);
      setLoading(false);
    });
  }, []);

  async function handleToggle(next) {
    setEnabled(next);
    setHint(null);

    if (next) {
      const granted = await enableDailyReminder();
      if (!granted) {
        setEnabled(false);
        setHint(
          Platform.OS === 'web'
            ? "Reminders aren't available in the web preview."
            : 'Permission denied — enable notifications for this app in system settings.'
        );
      }
    } else {
      await disableDailyReminder();
    }
  }

  return (
    <View>
      <SettingsRow
        icon="bell"
        label="Daily reminder"
        description="A nudge at 6pm if you haven't studied yet"
        control={
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={loading}
            trackColor={{ false: theme.backgroundSelected, true: theme.action }}
            thumbColor="#FFFFFF"
          />
        }
      />
      {hint && (
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

function ReplayOnboardingRow() {
  const theme = useTheme();
  const router = useRouter();

  async function handlePress() {
    await resetOnboarding();
    router.push('/onboarding');
  }

  return (
    <SettingsRow
      icon="refresh-cw"
      label="Replay onboarding"
      description="See the intro screens again"
      onPress={handlePress}
      control={<Feather name="chevron-right" size={18} color={theme.textSecondary} />}
    />
  );
}

function SettingsRow({ icon, label, description, control, disabled, onPress }) {
  const theme = useTheme();

  const row = (
    <ThemedView
      type="backgroundElement"
      style={[styles.row, { borderColor: theme.border }, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconChip, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name={icon} size={16} color={theme.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          {description && (
            <ThemedText themeColor="textSecondary" type="small">
              {description}
            </ThemedText>
          )}
        </View>
      </View>
      {control ?? (disabled && <SoonBadge />)}
    </ThemedView>
  );

  if (!onPress) return row;

  return (
    <ScalePressable onPress={onPress} haptic="light" scaleTo={0.98}>
      {row}
    </ScalePressable>
  );
}

function SoonBadge() {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { borderColor: theme.border }]}>
      <ThemedText themeColor="textSecondary" type="small">
        Soon
      </ThemedText>
    </View>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="label" themeColor="textSecondary">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText themeColor="textSecondary" type="small">
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionBody: {
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentWrap: {
    flex: 1,
  },
  segment: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  rowText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  hint: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
