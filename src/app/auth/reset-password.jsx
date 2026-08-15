import Feather from '@expo/vector-icons/Feather';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthField } from '@/components/ui/auth-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { parseRecoveryLink } from '@/lib/recovery-link';

const MIN_PASSWORD = 6;

// Landing screen for the password-recovery deep link. expo-router routes the
// nativepandas://auth/reset-password link here; we read the tokens off the URL
// fragment, install the recovery session, then let the user set a new password.
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const url = Linking.useURL();

  // verifying → ready → done, or error if the link is bad/expired.
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!url) return;
    const parsed = parseRecoveryLink(url);
    if (!parsed) return;
    if (parsed.type === 'error') {
      setError(parsed.message);
      setStatus('error');
      return;
    }
    auth.beginRecovery({ accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }).then(
      (result) => {
        if (result.error) {
          setError(result.error);
          setStatus('error');
        } else {
          setStatus('ready');
        }
      }
    );
    // auth is stable from context; re-running only on url change is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // If a session is already live (recovery installed, or the user was signed
  // in when they opened this), let them proceed even before/without a link.
  useEffect(() => {
    if (status === 'verifying' && auth.signedIn) setStatus('ready');
  }, [auth.signedIn, status]);

  const canSubmit =
    status === 'ready' && password.length > 0 && confirm.length > 0 && !auth.busy;

  async function handleSubmit() {
    if (password.length < MIN_PASSWORD) {
      setError(`Passwords need to be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setError(null);
    const result = await auth.completePasswordReset(password);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus('done');
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
            {status === 'verifying' && (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.action} />
                <ThemedText themeColor="textSecondary" type="small">
                  Verifying your reset link…
                </ThemedText>
              </View>
            )}

            {status === 'error' && (
              <View style={styles.centered}>
                <Feather name="alert-triangle" size={32} color={theme.danger} />
                <ThemedText type="subtitle" style={styles.centerText}>
                  Link didn't work
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
                  {error ?? 'This reset link is no longer valid.'}
                </ThemedText>
                <ScalePressable haptic="medium" onPress={() => router.replace('/auth/sign-in')}>
                  <View style={[styles.primaryButton, { backgroundColor: theme.action }]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      Back to log in
                    </ThemedText>
                  </View>
                </ScalePressable>
              </View>
            )}

            {status === 'done' && (
              <View style={styles.centered}>
                <Feather name="check-circle" size={32} color={theme.success} />
                <ThemedText type="subtitle" style={styles.centerText}>
                  Password updated
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
                  You're logged in and your progress is synced.
                </ThemedText>
                <ScalePressable haptic="medium" onPress={() => router.replace('/')}>
                  <View style={[styles.primaryButton, { backgroundColor: theme.action }]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      Start studying
                    </ThemedText>
                  </View>
                </ScalePressable>
              </View>
            )}

            {status === 'ready' && (
              <>
                <View style={styles.header}>
                  <ThemedText type="subtitle">Set a new password</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Choose a new password for {auth.email ?? 'your account'}.
                  </ThemedText>
                </View>

                <View style={styles.fields}>
                  <AuthField
                    label="New password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder={`At least ${MIN_PASSWORD} characters`}
                    secure
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                  <AuthField
                    label="Confirm password"
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Re-enter it"
                    secure
                    textContentType="newPassword"
                    autoComplete="new-password"
                    onSubmitEditing={handleSubmit}
                    returnKeyType="go"
                  />
                </View>

                {error && (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
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
                        Update password
                      </ThemedText>
                    )}
                  </View>
                </ScalePressable>
              </>
            )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  fields: {
    gap: Spacing.three,
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
    paddingHorizontal: Spacing.five,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
