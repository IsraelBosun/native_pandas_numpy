import { SyntaxColors } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

export function useSyntaxColors() {
  const scheme = useThemeName();
  const theme = useTheme();
  const palette = SyntaxColors[scheme === 'dark' ? 'dark' : 'light'];

  return {
    ...palette,
    identifier: theme.text,
    punct: theme.textSecondary,
    whitespace: theme.text,
  };
}
