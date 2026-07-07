import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, useTheme, Surface, SegmentedButtons, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getHistory } from '../../src/db/queries';
import { CountSessionWithItems } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

type Timeline = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function ReportsTabScreen() {
  const theme = useTheme();
  const { currencySymbol } = useSettingsStore();
  const [sessions, setSessions] = useState<CountSessionWithItems[]>([]);
  const [timeline, setTimeline] = useState<Timeline>('daily');

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setSessions);
    }, [])
  );

  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.timestamp);
    const today = new Date();
    
    switch (timeline) {
      case 'daily':
        return isSameDay(sessionDate, today);
      case 'weekly':
        return isSameWeek(sessionDate, today, { weekStartsOn: 1 });
      case 'monthly':
        return isSameMonth(sessionDate, today);
      case 'yearly':
        return isSameYear(sessionDate, today);
      default:
        return true;
    }
  });

  const totalExpected = filteredSessions.reduce((sum, s) => sum + s.expectedFloat, 0);
  const totalActual = filteredSessions.reduce((sum, s) => sum + s.actualTotal, 0);
  const totalDifference = filteredSessions.reduce((sum, s) => sum + s.difference, 0);

  const exportCSV = async () => {
    try {
      const header = 'ID,Till Name,Session Type,Date,Manager,Expected,Actual,Difference\n';
      const rows = filteredSessions.map(s => 
        `"${s.id}","${s.tillName || 'Unknown'}","${s.sessionType ? s.sessionType.charAt(0).toUpperCase() + s.sessionType.slice(1) : ''}","${new Date(s.timestamp).toLocaleString()}","${s.managerName || ''}",${s.expectedFloat},${s.actualTotal},${s.difference}`
      ).join('\n');
      
      const fileUri = FileSystem.documentDirectory + `TillCounter_${timeline.toUpperCase()}_Report.csv`;
      await FileSystem.writeAsStringAsync(fileUri, header + rows, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'Cannot share the file on this device.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate CSV.');
    }
  };

  const exportPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 32px; color: #1e293b; }
              h1 { font-size: 22px; margin-bottom: 4px; text-transform: capitalize; }
              p { font-size: 12px; color: #64748b; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th { background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
              td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .balanced { color: #0891b2; font-weight: bold; }
              .summary-box { background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
              .summary-title { font-size: 14px; font-weight: bold; color: #334155; margin-bottom: 8px; }
              .summary-stats { display: flex; gap: 24px; }
              .stat-item { flex: 1; }
              .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
              .stat-value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            </style>
          </head>
          <body>
            <h1>TillCounter Pro — ${timeline} Report</h1>
            <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${filteredSessions.length} session(s)</p>
            
            <div class="summary-box">
              <div class="summary-title">Timeline Summary</div>
              <div class="summary-stats">
                <div class="stat-item">
                  <div class="stat-label">Total Expected</div>
                  <div class="stat-value">${currencySymbol}${totalExpected.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">Total Actual</div>
                  <div class="stat-value">${currencySymbol}${totalActual.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">Total Difference</div>
                  <div class="stat-value ${totalDifference > 0 ? 'positive' : totalDifference < 0 ? 'negative' : 'balanced'}">
                    ${totalDifference > 0 ? '+' : ''}${currencySymbol}${totalDifference.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <table>
              <tr>
                <th>Till Name</th>
                <th>Type</th>
                <th>Date &amp; Time</th>
                <th>Manager</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Difference</th>
              </tr>
              ${filteredSessions.map(s => `
                <tr>
                  <td>${s.tillName || 'Unknown'}</td>
                  <td>${s.sessionType ? s.sessionType.charAt(0).toUpperCase() + s.sessionType.slice(1) : ''}</td>
                  <td>${new Date(s.timestamp).toLocaleString()}</td>
                  <td>${s.managerName || '—'}</td>
                  <td>${currencySymbol}${s.expectedFloat.toFixed(2)}</td>
                  <td><strong>${currencySymbol}${s.actualTotal.toFixed(2)}</strong></td>
                  <td class="${s.difference > 0 ? 'positive' : s.difference < 0 ? 'negative' : 'balanced'}">
                    ${s.difference > 0 ? '+' : ''}${currencySymbol}${s.difference.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (e: any) {
      if (e?.message?.includes('cancel')) return;
      Alert.alert('Error', 'Failed to generate PDF.');
    }
  };

  const diffColor = totalDifference === 0 ? theme.colors.primary : totalDifference > 0 ? theme.colors.secondary : theme.colors.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={timeline}
          onValueChange={(val) => setTimeline(val as Timeline)}
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
          style={styles.segmentedControl}
        />
      </View>

      <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.summaryHeader}>
          <MaterialCommunityIcons name="finance" size={24} color={theme.colors.onPrimaryContainer} />
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', marginLeft: 8 }}>
            Timeline Summary
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>Expected</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>{currencySymbol}{totalExpected.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>Actual</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>{currencySymbol}{totalActual.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>Difference</Text>
            <Text variant="titleMedium" style={{ color: diffColor, fontWeight: '800' }}>
              {totalDifference > 0 ? '+' : ''}{currencySymbol}{totalDifference.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.exportActions}>
          <Button mode="contained" icon="file-delimited" onPress={exportCSV} style={styles.exportBtn}>
            CSV
          </Button>
          <Button mode="contained-tonal" icon="file-pdf-box" onPress={exportPDF} style={styles.exportBtn}>
            PDF
          </Button>
        </View>
      </Surface>

      <FlatList
        data={filteredSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, opacity: 0.6 }}>
              No counts found
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.4, marginTop: 4 }}>
              Try selecting a different timeline.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemDiff = item.difference;
          const iDiffColor = itemDiff === 0 ? theme.colors.primary : itemDiff > 0 ? theme.colors.secondary : theme.colors.error;
          
          return (
            <Card style={[styles.recordCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Card.Content style={styles.recordContent}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {item.tillName || 'Unknown Till'}
                    {item.sessionType ? ` (${item.sessionType.charAt(0).toUpperCase() + item.sessionType.slice(1)})` : ''}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    By: {item.managerName || '—'}  |  {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Exp: {currencySymbol}{item.expectedFloat.toFixed(2)}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      Act: {currencySymbol}{item.actualTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>Diff</Text>
                  <Text variant="titleMedium" style={{ color: iDiffColor, fontWeight: '800' }}>
                    {itemDiff > 0 ? '+' : ''}{currencySymbol}{itemDiff.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentContainer: { padding: 16, paddingBottom: 8 },
  segmentedControl: { backgroundColor: 'transparent' },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  summaryItem: { flex: 1 },
  exportActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  exportBtn: { flex: 1, borderRadius: 8 },
  recordCard: { marginBottom: 10, borderRadius: 12 },
  recordContent: { flexDirection: 'row' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
});
