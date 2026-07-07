import Feather from '@expo/vector-icons/Feather';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'practice', label: 'Practice', icon: 'edit-3' },
  { name: 'stats', label: 'Stats', icon: 'bar-chart-2' },
  { name: 'reference', label: 'Reference', icon: 'book-open' },
];

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.actionMuted}
      rippleColor={colors.actionMuted}
      iconColor={{ default: colors.textSecondary, selected: colors.action }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.action, fontWeight: '700' },
      }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Label>{tab.label}</Label>
          <Icon src={<VectorIcon family={Feather} name={tab.icon} />} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
