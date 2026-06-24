import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, Button } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getHistory } from '../src/db/queries';
import { CountSessionWithItems } from '../src/types';
import { useSettingsStore } from '../src/store/useSettingsStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function ReportsScreen() {
  const theme = useTheme();
  const { currencySymbol } = useSettingsStore();
  const [sessions, setSessions] = useState<CountSessionWithItems[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setSessions);
    }, [])
  );

  const exportCSV = async () => {
    try {
      const header = 'ID,Till Name,Date,Manager,Expected,Actual,Difference\n';
      const rows = sessions.map(s => 
        `"${s.id}","${s.tillName}","${new Date(s.timestamp).toLocaleString()}","${s.managerName || ''}",${s.expectedFloat},${s.actualTotal},${s.difference}`
      ).join('\n');
      
      const fileUri = FileSystem.documentDirectory + 'TillCounter_Report.csv';
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
              h1 { font-size: 22px; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th { background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
              td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .balanced { color: #0891b2; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>TillCounter Pro — Count Report</h1>
            <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${sessions.length} session(s)</p>
            <table>
              <tr>
                <th>Till Name</th>
                <th>Date &amp; Time</th>
                <th>Manager</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Difference</th>
              </tr>
              ${sessions.map(s => `
                <tr>
                  <td>${s.tillName || 'Unknown'}</td>
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
      // User cancelled = no error to show
      if (e?.message?.includes('cancel')) return;
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Title title="Export Data" subtitle="Share reports via CSV or PDF" />
        <Card.Content>
          <Button mode="contained" icon="file-delimited" onPress={exportCSV} style={styles.button}>
            Export to CSV
          </Button>
          <Button mode="contained-tonal" icon="file-pdf-box" onPress={exportPDF} style={styles.button}>
            Export to PDF
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  button: { marginBottom: 16, height: 48, justifyContent: 'center' },
});
