import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getHistory } from '../../src/db/queries';
import { CountSessionWithItems } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { isToday } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2; // 16px padding each side + gap between

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

function StatCard({ label, value, icon, iconColor, bgColor }: StatCardProps) {
  const theme = useTheme();
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <Card.Content style={styles.statContent}>
        <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
        </View>
        <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { currencySymbol } = useSettingsStore();
  const [sessions, setSessions] = useState<CountSessionWithItems[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setSessions);
    }, [])
  );

  const todaySessions = sessions.filter(s => isToday(new Date(s.timestamp)));
  const totalCounted = todaySessions.reduce((acc, s) => acc + s.actualTotal, 0);
  const overages = todaySessions.filter(s => s.difference > 0).length;
  const shortages = todaySessions.filter(s => s.difference < 0).length;
  const balanced = todaySessions.filter(s => s.difference === 0).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
      <Surface style={[styles.heroBanner, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.heroTextBlock}>
          <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
            {greeting} 👋
          </Text>
          <Text variant="headlineMedium" style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>
            Today's Overview
          </Text>
          <Text variant="displaySmall" style={[styles.heroAmount, { color: theme.colors.primary }]}>
            {currencySymbol}{totalCounted.toFixed(2)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
            Total counted across {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="cash-multiple"
          size={72}
          color={theme.colors.primary}
          style={{ opacity: 0.25, position: 'absolute', right: 16, top: 20 }}
        />
      </Surface>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Balanced"
          value={`${balanced}`}
          icon="check-circle-outline"
          iconColor={theme.colors.primary}
          bgColor={theme.colors.primaryContainer}
        />
        <StatCard
          label="Overages"
          value={`${overages}`}
          icon="trending-up"
          iconColor={theme.colors.secondary}
          bgColor={theme.colors.secondaryContainer}
        />
        <StatCard
          label="Shortages"
          value={`${shortages}`}
          icon="trending-down"
          iconColor={theme.colors.error}
          bgColor={`${theme.colors.error}22`}
        />
        <StatCard
          label="Sessions"
          value={`${todaySessions.length}`}
          icon="clipboard-list-outline"
          iconColor={theme.colors.tertiary}
          bgColor={`${theme.colors.tertiary}22`}
        />
      </View>

      {/* Recent Counts */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Recent Counts
        </Text>
      </View>

      {todaySessions.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="cash-register" size={40} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
              No counts recorded today.{'\n'}Head to Tills to get started!
            </Text>
          </Card.Content>
        </Card>
      ) : (
        todaySessions.slice(0, 5).map(session => {
          const diff = session.difference;
          const diffColor = diff === 0 ? theme.colors.primary : diff > 0 ? theme.colors.secondary : theme.colors.error;
          const diffIcon = diff === 0 ? 'check-circle' : diff > 0 ? 'arrow-up-circle' : 'arrow-down-circle';
          return (
            <Card key={session.id} style={[styles.recentCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Card.Content style={styles.recentContent}>
                <View style={[styles.recentIconWrap, { backgroundColor: `${diffColor}18` }]}>
                  <MaterialCommunityIcons name={diffIcon as any} size={22} color={diffColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {session.tillName || 'Unknown Till'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {currencySymbol}{session.actualTotal.toFixed(2)}
                  </Text>
                  <Text variant="labelSmall" style={{ color: diffColor, fontWeight: '600' }}>
                    {diff > 0 ? '+' : ''}{currencySymbol}{diff.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  heroTextBlock: { zIndex: 1 },
  heroTitle: { fontWeight: '700', marginTop: 4, marginBottom: 4 },
  heroAmount: { fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
    marginBottom: 8,
  },
  statCard: { width: CARD_WIDTH, borderRadius: 16 },
  statContent: { alignItems: 'center', paddingVertical: 16 },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontWeight: '800', letterSpacing: -0.5 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: { fontWeight: '700' },
  recentCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
