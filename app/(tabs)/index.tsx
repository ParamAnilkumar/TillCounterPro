import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, useTheme, Surface, Menu, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getHistory, getTills } from '../../src/db/queries';
import { CountSessionWithItems, Till } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { isToday, isYesterday, isSameWeek, subWeeks, isSameMonth, subMonths, isSameYear, subYears, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths } from 'date-fns';
import { BarChart } from 'react-native-gifted-charts';

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
  const [tills, setTills] = useState<Till[]>([]);
  
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [timeFilter, setTimeFilter] = useState('today');

  const [tillFilterMenuVisible, setTillFilterMenuVisible] = useState(false);
  const [tillFilter, setTillFilter] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setSessions);
      getTills().then(t => setTills(t.filter(x => x.name !== 'Combined Counts')));
    }, [])
  );

  const [heatmapMonthOffset, setHeatmapMonthOffset] = useState(0);

  const now = new Date();
  const filteredSessions = sessions.filter(s => {
    if (tillFilter !== 'all' && s.tillId !== tillFilter) return false;

    const d = new Date(s.timestamp);
    switch (timeFilter) {
      case 'today': return isToday(d);
      case 'yesterday': return isYesterday(d);
      case 'this_week': return isSameWeek(d, now, { weekStartsOn: 1 });
      case 'last_week': return isSameWeek(d, subWeeks(now, 1), { weekStartsOn: 1 });
      case 'this_month': return isSameMonth(d, now);
      case 'last_month': return isSameMonth(d, subMonths(now, 1));
      case 'this_year': return isSameYear(d, now);
      case 'last_year': return isSameYear(d, subYears(now, 1));
      default: return true;
    }
  });

  const totalCounted = filteredSessions.reduce((acc, s) => acc + s.actualTotal, 0);
  const overages = filteredSessions.filter(s => s.difference > 0).length;
  const shortages = filteredSessions.filter(s => s.difference < 0).length;
  const balanced = filteredSessions.filter(s => s.difference === 0).length;

  const sortedSessionsForChart = [...filteredSessions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const chartDataMap = new Map<string, number>();
  sortedSessionsForChart.forEach(s => {
    const dateStr = format(new Date(s.timestamp), 'MMM d');
    chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + s.actualTotal);
  });
  const chartData = Array.from(chartDataMap, ([label, value]) => ({ label, value }));

  const diffChartDataMap = new Map<string, number>();
  sortedSessionsForChart.forEach(s => {
    const dateStr = format(new Date(s.timestamp), 'MMM d');
    diffChartDataMap.set(dateStr, (diffChartDataMap.get(dateStr) || 0) + s.difference);
  });
  const diffChartData = Array.from(diffChartDataMap, ([label, value]) => ({
    label,
    value: Math.abs(value),
    originalValue: value,
    frontColor: value > 0 ? '#10B981' : (value < 0 ? theme.colors.error : theme.colors.outline),
  }));

  const tillBreakdownMap = new Map<string, number>();
  filteredSessions.forEach(s => {
    const tillName = s.tillName || 'Unknown Till';
    tillBreakdownMap.set(tillName, (tillBreakdownMap.get(tillName) || 0) + s.actualTotal);
  });
  const tillBreakdownChartData = Array.from(tillBreakdownMap, ([label, value]) => ({ label, value }));

  const heatmapTargetMonth = addMonths(now, heatmapMonthOffset);
  const monthStart = startOfMonth(heatmapTargetMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyDiffMap = new Map<string, number>();
  sessions.forEach(s => {
    if (tillFilter !== 'all' && s.tillId !== tillFilter) return;
    const dateStr = format(new Date(s.timestamp), 'yyyy-MM-dd');
    dailyDiffMap.set(dateStr, (dailyDiffMap.get(dateStr) || 0) + s.difference);
  });

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
      {/* Top Bar with Filter */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 8 }}>
        <Menu
          visible={tillFilterMenuVisible}
          onDismiss={() => setTillFilterMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined" 
              onPress={() => setTillFilterMenuVisible(true)}
              textColor={theme.colors.onSurface}
              contentStyle={{ flexDirection: 'row-reverse' }}
              icon="chevron-down"
              compact
            >
              {tillFilter === 'all' ? 'All Tills' : tills.find(t => t.id === tillFilter)?.name || 'Unknown'}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setTillFilter('all'); setTillFilterMenuVisible(false); }} title="All Tills" />
          {tills.map(t => (
            <Menu.Item key={t.id} onPress={() => { setTillFilter(t.id); setTillFilterMenuVisible(false); }} title={t.name} />
          ))}
        </Menu>

        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined" 
              onPress={() => setFilterMenuVisible(true)}
              textColor={theme.colors.onSurface}
              contentStyle={{ flexDirection: 'row-reverse' }}
              icon="chevron-down"
              compact
            >
              {timeFilter === 'today' && "Today"}
              {timeFilter === 'yesterday' && "Yesterday"}
              {timeFilter === 'this_week' && "This Week"}
              {timeFilter === 'last_week' && "Last Week"}
              {timeFilter === 'this_month' && "This Month"}
              {timeFilter === 'last_month' && "Last Month"}
              {timeFilter === 'this_year' && "This Year"}
              {timeFilter === 'last_year' && "Last Year"}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setTimeFilter('today'); setFilterMenuVisible(false); }} title="Today" />
          <Menu.Item onPress={() => { setTimeFilter('yesterday'); setFilterMenuVisible(false); }} title="Yesterday" />
          <Menu.Item onPress={() => { setTimeFilter('this_week'); setFilterMenuVisible(false); }} title="This Week" />
          <Menu.Item onPress={() => { setTimeFilter('last_week'); setFilterMenuVisible(false); }} title="Last Week" />
          <Menu.Item onPress={() => { setTimeFilter('this_month'); setFilterMenuVisible(false); }} title="This Month" />
          <Menu.Item onPress={() => { setTimeFilter('last_month'); setFilterMenuVisible(false); }} title="Last Month" />
          <Menu.Item onPress={() => { setTimeFilter('this_year'); setFilterMenuVisible(false); }} title="This Year" />
          <Menu.Item onPress={() => { setTimeFilter('last_year'); setFilterMenuVisible(false); }} title="Last Year" />
        </Menu>
      </View>

      {/* Hero Banner */}
      <Surface style={[styles.heroBanner, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.heroTextBlock}>
          <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
            {greeting} 👋
          </Text>
          <Text variant="titleLarge" style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>
            Overview
          </Text>
          <Text variant="displaySmall" style={[styles.heroAmount, { color: theme.colors.primary }]}>
            {currencySymbol}{totalCounted.toFixed(2)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
            Total counted across {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
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
          value={`${filteredSessions.length}`}
          icon="clipboard-list-outline"
          iconColor={theme.colors.tertiary}
          bgColor={`${theme.colors.tertiary}22`}
        />
      </View>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginBottom: 16 }]}>
            Cash Trend
          </Text>
          <Card style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, paddingRight: 24, overflow: 'hidden' }} elevation={1}>
            <BarChart
              data={chartData}
              width={SCREEN_WIDTH - 110}
              height={180}
              barWidth={22}
              spacing={Math.max(20, (SCREEN_WIDTH - 130 - (22 * chartData.length)) / Math.max(chartData.length, 1))}
              initialSpacing={20}
              yAxisLabelWidth={40}
              barBorderRadius={4}
              frontColor={theme.colors.primary}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              rulesColor={theme.colors.outline}
              rulesType="dashed"
              yAxisColor={theme.colors.outline}
              xAxisColor={theme.colors.outline}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'transparent',
                pointerColor: theme.colors.primary,
                radius: 6,
                pointerLabelWidth: 80,
                pointerLabelHeight: 40,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any) => {
                  const item = items[0];
                  return (
                    <View style={styles.tooltip}>
                      <Text style={{color: '#fff', fontSize: 10}}>{item.label}</Text>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>{currencySymbol}{item.value.toFixed(2)}</Text>
                    </View>
                  );
                },
              }}
            />
          </Card>
        </View>
      )}

      {/* Diff Chart Section */}
      {diffChartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginBottom: 16 }]}>
            Over/Short Trend
          </Text>
          <Card style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, paddingRight: 24, overflow: 'hidden' }} elevation={1}>
            <BarChart
              data={diffChartData}
              width={SCREEN_WIDTH - 110}
              height={180}
              barWidth={22}
              spacing={Math.max(20, (SCREEN_WIDTH - 130 - (22 * diffChartData.length)) / Math.max(diffChartData.length, 1))}
              initialSpacing={20}
              yAxisLabelWidth={40}
              barBorderRadius={4}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              rulesColor={theme.colors.outline}
              rulesType="dashed"
              yAxisColor={theme.colors.outline}
              xAxisColor={theme.colors.outline}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'transparent',
                pointerColor: theme.colors.primary,
                radius: 6,
                pointerLabelWidth: 80,
                pointerLabelHeight: 40,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any) => {
                  const item = items[0];
                  return (
                    <View style={styles.tooltip}>
                      <Text style={{color: '#fff', fontSize: 10}}>{item.label}</Text>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>
                        {item.originalValue > 0 ? '+' : ''}{item.originalValue < 0 ? '-' : ''}{currencySymbol}{Math.abs(item.originalValue).toFixed(2)}
                      </Text>
                    </View>
                  );
                },
              }}
            />
          </Card>
        </View>
      )}

      {/* Till Breakdown Chart */}
      {tillFilter === 'all' && tillBreakdownChartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginBottom: 16 }]}>
            Total by Till
          </Text>
          <Card style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, paddingRight: 24, overflow: 'hidden' }} elevation={1}>
            <BarChart
              data={tillBreakdownChartData}
              width={SCREEN_WIDTH - 110}
              height={180}
              barWidth={22}
              spacing={Math.max(20, (SCREEN_WIDTH - 130 - (22 * tillBreakdownChartData.length)) / Math.max(tillBreakdownChartData.length, 1))}
              initialSpacing={20}
              yAxisLabelWidth={40}
              barBorderRadius={4}
              frontColor={theme.colors.tertiary}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              rulesColor={theme.colors.outline}
              rulesType="dashed"
              yAxisColor={theme.colors.outline}
              xAxisColor={theme.colors.outline}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'transparent',
                pointerColor: theme.colors.tertiary,
                radius: 6,
                pointerLabelWidth: 80,
                pointerLabelHeight: 40,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any) => {
                  const item = items[0];
                  return (
                    <View style={styles.tooltip}>
                      <Text style={{color: '#fff', fontSize: 10}}>{item.label}</Text>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>{currencySymbol}{item.value.toFixed(2)}</Text>
                    </View>
                  );
                },
              }}
            />
          </Card>
        </View>
      )}

      {/* Monthly Health Heatmap */}
      <View style={styles.chartContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Monthly Health
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -8 }}>
            <Button icon="chevron-left" compact onPress={() => setHeatmapMonthOffset(prev => prev - 1)} textColor={theme.colors.onSurface} style={{ margin: 0 }}>
              {''}
            </Button>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurface, minWidth: 80, textAlign: 'center' }}>
              {format(heatmapTargetMonth, 'MMM yyyy')}
            </Text>
            <Button icon="chevron-right" compact onPress={() => setHeatmapMonthOffset(prev => prev + 1)} textColor={theme.colors.onSurface} style={{ margin: 0 }} disabled={heatmapMonthOffset >= 0}>
              {''}
            </Button>
          </View>
        </View>
        <Card style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16 }} elevation={1}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={i} style={{ width: 32, textAlign: 'center', color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>{day}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Math.floor((SCREEN_WIDTH - 64 - (32 * 7)) / 6) }}>
            {calendarDays.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const diff = dailyDiffMap.get(dateStr);
              
              let bgColor = theme.colors.surfaceVariant;
              if (diff !== undefined) {
                const absDiff = Math.abs(diff);
                if (absDiff === 0) bgColor = '#10B981'; // Good
                else if (absDiff <= 5) bgColor = '#F59E0B'; // Small Diff
                else bgColor = theme.colors.error; // Large Diff
              }
              
              const isCurrentMonth = isSameMonth(day, heatmapTargetMonth);
              
              return (
                <View key={dateStr} style={{
                  width: 32, height: 32, borderRadius: 8, 
                  backgroundColor: bgColor,
                  opacity: isCurrentMonth ? 1 : 0.2,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: Math.floor((SCREEN_WIDTH - 64 - (32 * 7)) / 6)
                }}>
                  <Text style={{ fontSize: 12, color: diff !== undefined ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: diff !== undefined ? 'bold' : 'normal' }}>
                    {format(day, 'd')}
                  </Text>
                </View>
              );
            })}
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Balanced</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#F59E0B' }} />
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>&le; $5.00</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: theme.colors.error }} />
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>&gt; $5.00</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Recent Counts */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Recent Counts
        </Text>
      </View>

      {filteredSessions.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="cash-register" size={40} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
              No counts recorded for this period.{'\n'}Head to Tills to get started!
            </Text>
          </Card.Content>
        </Card>
      ) : (
        filteredSessions.slice(0, 5).map(session => {
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
  chartContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tooltip: {
    backgroundColor: '#333',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
});
