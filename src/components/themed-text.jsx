import { StyleSheet, Text } from 'react-native';

import { fontFamilyForWeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Custom TTFs (JetBrains Mono) don't support synthetic bold, so every type
// picks its own loaded font family instead of relying on `fontWeight`.
const FAMILY_BY_TYPE = {
  default: fontFamilyForWeight(500),
  title: fontFamilyForWeight(600),
  subtitle: fontFamilyForWeight(600),
  small: fontFamilyForWeight(500),
  smallBold: fontFamilyForWeight(700),
  link: fontFamilyForWeight(400),
  linkPrimary: fontFamilyForWeight(400),
  code: fontFamilyForWeight(500),
  label: fontFamilyForWeight(700),
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: FAMILY_BY_TYPE[type] ?? FAMILY_BY_TYPE.default },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'label' && styles.label,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
