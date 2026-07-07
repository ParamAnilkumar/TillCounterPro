import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, useTheme, Searchbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getHistory, deleteCountSession } from '../../src/db/queries';
import { CountSessionWithItems } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';

export default function HistoryScreen() {
  const theme = useTheme();
  const { currencySymbol } = useSettingsStore();
  const [sessions, setSessions] = useState<CountSessionWithItems[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadHistory = useCallback(() => {
    getHistory().then(setSessions);
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this count from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCountSession(id); loadHistory(); } },
    ]);
  };

  const filteredSessions = sessions.filter(session => {
    const term = searchQuery.toLowerCase();
    return (
      (session.tillName?.toLowerCase() || '').includes(term) ||
      (session.managerName?.toLowerCase() || '').includes(term)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search by till or manager…"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        elevation={1}
      />

      <FlatList
        data={filteredSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, opacity: 0.6 }}>
              No history yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.4, marginTop: 4, textAlign: 'center' }}>
              Completed count sessions will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedIds.has(item.id);
          const itemsToShow = isExpanded ? item.items : item.items.slice(0, 3);
          const diff = item.difference;
          const diffColor = diff === 0 ? theme.colors.primary : diff > 0 ? theme.colors.secondary : theme.colors.error;
          const statusLabel = diff === 0 ? 'Balanced' : diff > 0 ? 'Overage' : 'Shortage';
          const statusIcon = diff === 0 ? 'check-circle' : diff > 0 ? 'arrow-up-circle' : 'arrow-down-circle';

          return (
            <Card
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => toggleExpand(item.id)}
              elevation={2}
            >
              <Card.Content style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: `${diffColor}22` }]}>
                  <MaterialCommunityIcons name={statusIcon as any} size={20} color={diffColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {item.tillName || 'Unknown Till'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {item.managerName ? ` · ${item.managerName}` : ''}
                    {item.sessionType ? ` · ${item.sessionType.charAt(0).toUpperCase() + item.sessionType.slice(1)}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {currencySymbol}{item.actualTotal.toFixed(2)}
                  </Text>
                  <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22` }]}>
                    <Text style={{ fontSize: 11, color: diffColor, fontWeight: '700' }}>
                      {diff > 0 ? '+' : ''}{currencySymbol}{diff.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon="delete-outline"
                  size={18}
                  iconColor={theme.colors.error}
                  onPress={() => handleDelete(item.id)}
                  style={{ margin: 0 }}
                />
              </Card.Content>

              {/* Expanded details */}
              {itemsToShow.length > 0 && (
                <Card.Content style={styles.itemsSection}>
                  {itemsToShow.map(i => (
                    <View key={i.id} style={styles.itemRow}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                        {i.denominationName || 'Unknown'} × {i.quantity}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                        {currencySymbol}{i.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  {!isExpanded && item.items.length > 3 && (
                    <Text style={{ fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: '600' }}>
                      ↓ Tap to see {item.items.length - 3} more
                    </Text>
                  )}
                  {item.notes ? (
                    <View style={[styles.noteBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <MaterialCommunityIcons name="note-text-outline" size={14} color={theme.colors.onSurfaceVariant} />
                      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
                        {item.notes}
                      </Text>
                    </View>
                  ) : null}
                </Card.Content>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 16, marginBottom: 8, borderRadius: 14 },
  card: { marginBottom: 10, borderRadius: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  statusDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 3, alignSelf: 'flex-end' },
  itemsSection: { paddingTop: 0, paddingBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  emptyState: { alignItems: 'center', paddingTop: 80 },
});
