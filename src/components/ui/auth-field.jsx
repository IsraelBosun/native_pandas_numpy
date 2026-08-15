import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The one labelled text field the auth screens use. Passing `secure` turns it
// into a password field with a reveal toggle — the border lives on the wrapping
// row so the eye sits inside the box rather than beside it.
export function AuthField({ label, secure = false, style, ...inputProps }) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);

  // Revealing has to drop the password content type too: iOS/Android otherwise
  // keep masking a field they believe is a password, and the toggle does nothing.
  const secureProps = secure
    ? {
        secureTextEntry: !revealed,
        textContentType: revealed ? 'none' : inputProps.textContentType,
        autoComplete: revealed ? 'off' : inputProps.autoComplete,
      }
    : null;

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }, style]}
          {...inputProps}
          {...secureProps}
        />
        {secure && (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: revealed }}>
            <Feather
              name={revealed ? 'eye-off' : 'eye'}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toggle: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: Spacing.two,
  },
});
