import Feather from '@expo/vector-icons/Feather';
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'home', href: '/', label: 'Home', icon: 'home' },
  { name: 'practice', href: '/practice', label: 'Practice', icon: 'edit-3' },
  { name: 'stats', href: '/stats', label: 'Stats', icon: 'bar-chart-2' },
  { name: 'reference', href: '/reference', label: 'Reference', icon: 'book-open' },
];

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Feather name={icon} size={20} color={isFocused ? theme.action : theme.textSecondary} />
      <ThemedText type="small" themeColor={isFocused ? 'action' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    // 'fixed' (not 'absolute') — TabSlot's height:'100%' only resolves if
    // every ancestor up to <body> has a definite height, which isn't
    // guaranteed here, so an absolutely-positioned bar with no offset ends
    // up wherever that collapsed flow happens to land (observed: the top of
    // the page). 'fixed' anchors to the viewport regardless.
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    flexGrow: 1,
    maxWidth: MaxContentWidth,
  },
  tabButton: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
