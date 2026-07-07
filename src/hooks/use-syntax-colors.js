import { SyntaxColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function useSyntaxColors() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const palette = SyntaxColors[scheme === 'dark' ? 'dark' : 'light'];

  return {
    ...palette,
    identifier: theme.text,
    punct: theme.textSecondary,
    whitespace: theme.text,
  };
}
