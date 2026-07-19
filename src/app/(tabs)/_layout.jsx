import Feather from '@expo/vector-icons/Feather';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { Colors, fontFamilyForWeight } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'practice', label: 'Practice', icon: 'edit-3' },
  { name: 'stats', label: 'Stats', icon: 'bar-chart-2' },
  { name: 'reference', label: 'Reference', icon: 'book-open' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

export default function TabsLayout() {
  const colors = Colors[useThemeName()];

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.actionMuted}
      rippleColor={colors.actionMuted}
      iconColor={{ default: colors.textSecondary, selected: colors.action }}
      labelStyle={{
        default: { color: colors.textSecondary, fontFamily: fontFamilyForWeight(500) },
        selected: { color: colors.action, fontFamily: fontFamilyForWeight(700) },
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
