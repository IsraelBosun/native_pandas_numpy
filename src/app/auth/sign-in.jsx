import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

// One screen for both modes — the fields are identical and a user who taps the
// wrong entry point shouldn't have to navigate anywhere to fix it.
const COPY = {
  signIn: {
    heading: 'Welcome back',
    body: 'Log in to pull your streak, cards and achievements onto this device.',
    action: 'Log in',
    switchPrompt: "Don't have an account?",
    switchAction: 'Create one',
  },
  signUp: {
    heading: 'Save your progress',
    body: 'An account backs up your reviews so a new phone (or a reinstall) picks up exactly where you left off.',
    action: 'Create account',
    switchPrompt: 'Already have an account?',
    switchAction: 'Log in',
  },
};

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();

  const [mode, setMode] = useState('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const copy = COPY[mode];
  const canSubmit = email.trim().length > 0 && password.length > 0 && !auth.busy;

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setNotice(null);

    const result =
      mode === 'signUp' ? await auth.signUp(email, password) : await auth.signIn(email, password);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice(`Check ${email.trim()} for a confirmation link, then log in.`);
      setMode('signIn');
      setPassword('');
      return;
    }
    dismiss();
  }

  async function handleForgotPassword() {
    if (email.trim().length === 0) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    const result = await auth.sendPasswordReset(email);
    setNotice(result.error ? null : `Password reset link sent to ${email.trim()}.`);
    if (result.error) setError(result.error);
  }

  function switchMode() {
    setMode(mode === 'signUp' ? 'signIn' : 'signUp');
    setError(null);
    setNotice(null);
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
              <ThemedText type="subtitle">{copy.heading}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {copy.body}
              </ThemedText>
            </View>

            <View style={styles.fields}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signUp' ? 'At least 6 characters' : 'Your password'}
                secureTextEntry
                textContentType="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />
            </View>

            {error && (
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
            )}
            {notice && (
              <ThemedText type="small" themeColor="success">
                {notice}
              </ThemedText>
            )}

            {mode === 'signUp' && (
              <View style={[styles.reassurance, { borderColor: theme.border }]}>
                <Feather name="hard-drive" size={14} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" type="small" style={styles.flex}>
                  Everything you've already studied on this device is kept and merged into your
                  account.
                </ThemedText>
              </View>
            )}

            <View style={styles.spacer} />

            <ScalePressable haptic="medium" onPress={handleSubmit} disabled={!canSubmit}>
              <View
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.action },
                  !canSubmit && styles.disabled,
                ]}>
                {auth.busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    {copy.action}
                  </ThemedText>
                )}
              </View>
            </ScalePressable>

            {mode === 'signIn' && (
              <Pressable onPress={handleForgotPassword} hitSlop={8} style={styles.textButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Forgot your password?
                </ThemedText>
              </Pressable>
            )}

            <Pressable onPress={switchMode} hitSlop={8} style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {copy.switchPrompt}{' '}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.action }}>
                {copy.switchAction}
              </ThemedText>
            </Pressable>

            <Pressable onPress={dismiss} hitSlop={8} style={styles.textButton}>
              <ThemedText type="small" themeColor="textSecondary">
                Keep studying without an account
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, ...inputProps }) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
        {...inputProps}
      />
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
  fields: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  reassurance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
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
  textButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
