import { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';

import DashboardScreen from './index';
import TillsScreen from './tills';
import HistoryScreen from './history';
import SettingsScreen from './settings';
import ReportsScreen from './reports';

const TABS = [
  { key: 'index',    label: 'Dashboard', icon: 'view-dashboard-outline', title: 'Dashboard' },
  { key: 'tills',   label: 'Tills',     icon: 'cash-register',           title: 'Tills'     },
  { key: 'history', label: 'History',   icon: 'history',                 title: 'History'   },
  { key: 'reports', label: 'Reports',   icon: 'chart-bar',               title: 'Reports'   },
  { key: 'settings',label: 'Settings',  icon: 'cog-outline',             title: 'Settings'  },
] as const;

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToTab = (index: number) => {
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header — padded for status bar on all devices */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
          paddingTop: insets.top + 12,
        }
      ]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          {TABS[activeIndex].title}
        </Text>
      </View>

      {/* Swipeable Pages */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={e => setActiveIndex(e.nativeEvent.position)}
      >
        <View key="0" style={{ flex: 1 }}><DashboardScreen /></View>
        <View key="1" style={{ flex: 1 }}><TillsScreen /></View>
        <View key="2" style={{ flex: 1 }}><HistoryScreen /></View>
        <View key="3" style={{ flex: 1 }}><ReportsScreen /></View>
        <View key="4" style={{ flex: 1 }}><SettingsScreen /></View>
      </PagerView>

      {/* Bottom Tab Bar — padded above system nav buttons (3-button or gesture bar) */}
      <View style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: insets.bottom,
          height: 64 + insets.bottom,
        }
      ]}>
        {TABS.map((tab, index) => {
          const isActive = activeIndex === index;
          const color = isActive ? theme.colors.primary : theme.colors.onSurfaceVariant;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => goToTab(index)}
              activeOpacity={0.7}
            >
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />
              )}
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={color}
              />
              <Text style={[styles.tabLabel, { color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // paddingTop is set dynamically via insets.top in the component
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    // height and paddingBottom are set dynamically via insets.bottom
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 3,
  },
});
