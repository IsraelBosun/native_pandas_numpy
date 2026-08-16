import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SUPPORT_EMAIL = 'israelbosun1@gmail.com';

const TOPICS = [
  { id: 'feedback', label: 'Feedback', icon: 'message-circle' },
  { id: 'bug', label: 'Something broken', icon: 'alert-circle' },
  { id: 'content', label: 'Card is wrong', icon: 'file-text' },
  { id: 'other', label: 'Something else', icon: 'help-circle' },
];

const SUBJECTS = {
  feedback: 'Learn Pandas — feedback',
  bug: 'Learn Pandas — bug report',
  content: 'Learn Pandas — content correction',
  other: 'Learn Pandas — question',
};

// A bug report without a version is guesswork, and the user should never have
// to look these up. Appended visibly rather than hidden, so nothing is sent
// that they cannot see.
function diagnostics() {
  const version = Constants.expoConfig?.version ?? 'unknown';
  return `\n\n---\nApp ${version} · ${Platform.OS} ${Platform.Version}`;
}

// No backend in v1 (CLAUDE.md §3), so this composes a mail draft rather than
// posting anywhere. The user's own mail app sends it: nothing leaves the
// device until they hit send, and it works the same offline.
export default function ContactScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [topic, setTopic] = useState('feedback');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const canSend = message.trim().length > 0;

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function handleSend() {
    if (!canSend) return;
    setError(null);

    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(SUBJECTS[topic])}` +
      `&body=${encodeURIComponent(message.trim() + diagnostics())}`;

    const opened = await Linking.openURL(url).then(
      () => true,
      () => false
    );

    if (opened) dismiss();
    else setError(`No mail app found. You can email me directly at ${SUPPORT_EMAIL}.`);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Pressable onPress={dismiss} hitSlop={12} style={styles.close}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>

            <View style={styles.header}>
              <ThemedText type="subtitle">Get in touch</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Found a bug, spotted a wrong card, or want to suggest something? I read
                everything.
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                What's this about?
              </ThemedText>
              <View style={styles.topics}>
                {TOPICS.map((option) => {
                  const selected = option.id === topic;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setTopic(option.id)}
                      style={[
                        styles.topic,
                        {
                          borderColor: selected ? theme.action : theme.border,
                          backgroundColor: selected ? theme.actionMuted : theme.backgroundElement,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}>
                      <Feather
                        name={option.icon}
                        size={14}
                        color={selected ? theme.action : theme.textSecondary}
                      />
                      <ThemedText
                        type="small"
                        style={selected ? { color: theme.action } : undefined}
                        themeColor={selected ? undefined : 'textSecondary'}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Message
              </ThemedText>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={
                  topic === 'content'
                    ? 'Which card, and what should it say instead?'
                    : 'Tell me what happened…'
                }
                placeholderTextColor={theme.textSecondary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            <ThemedText themeColor="textSecondary" type="small">
              Opens your mail app with the message ready — your app version and device type are
              added so I can reproduce issues.
            </ThemedText>

            {error && (
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
            )}

            <View style={styles.spacer} />

            <ScalePressable haptic="medium" onPress={handleSend} disabled={!canSend}>
              <View
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.action },
                  !canSend && styles.disabled,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Compose email
                </ThemedText>
              </View>
            </ScalePressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  close: {
    alignSelf: 'flex-end',
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  input: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    minHeight: 140,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.four,
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
