import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, Button, Checkbox, Divider, Surface, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getDenominations, getTills, saveCountSession, addTill } from '../src/db/queries';
import { Denomination, Till } from '../src/types';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTillStore } from '../src/store/useTillStore';

export default function CombineTillsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { currencySymbol, managerName } = useSettingsStore();
  const { draftCounts } = useTillStore();

  const [tills, setTills] = useState<Till[]>([]);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [selectedTills, setSelectedTills] = useState<Set<string>>(new Set());

  useEffect(() => {
    getTills().then(t => setTills(t.filter(x => x.name !== 'Combined Counts')));
    getDenominations().then(setDenominations);
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedTills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const combinedItems = denominations.map(denom => {
    let quantity = 0;
    selectedTills.forEach(tillId => {
      quantity += draftCounts[tillId]?.[denom.id] || 0;
    });
    return { denominationId: denom.id, name: denom.name, value: denom.value, quantity, subtotal: quantity * denom.value };
  }).filter(item => item.quantity > 0);

  const actualTotal = combinedItems.reduce((sum, item) => sum + item.subtotal, 0);

  let expectedFloat = 0;
  selectedTills.forEach(tillId => {
    const till = tills.find(t => t.id === tillId);
    if (till) expectedFloat += till.expectedFloat;
  });

  const difference = actualTotal - expectedFloat;
  const diffColor = difference === 0 ? theme.colors.primary : difference > 0 ? theme.colors.secondary : theme.colors.error;

  const handleSave = async () => {
    if (selectedTills.size === 0) {
      Alert.alert('No tills selected', 'Please select at least one till to save.');
      return;
    }
    Alert.alert('Save Combined Count', 'Save this combined count to history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save', onPress: async () => {
          let allTills = await getTills();
          let combinedTill = allTills.find(t => t.name === 'Combined Counts');
          let combinedTillId = combinedTill?.id;
          if (!combinedTillId) {
            combinedTillId = await addTill({ name: 'Combined Counts', expectedFloat: 0, notes: 'Auto-generated for combined deposits' });
          }
          const items = combinedItems.map(item => ({
            denominationId: item.denominationId,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }));
          const selectedTillNames = Array.from(selectedTills).map(id => tills.find(t => t.id === id)?.name).filter(Boolean).join(', ');
          await saveCountSession({
            tillId: combinedTillId,
            timestamp: new Date().toISOString(),
            expectedFloat,
            actualTotal,
            difference,
            managerName,
            notes: `Combined count of: ${selectedTillNames}`,
          }, items);
          Alert.alert('Saved!', 'Combined count saved to history.');
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Instruction Banner */}
      <Surface style={[styles.banner, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.primary} />
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 8, flex: 1 }}>
          Select the tills you want to combine. Their current counts will be added together automatically.
        </Text>
      </Surface>

      {/* Till Selection */}
      <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
        SELECT TILLS
      </Text>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Card.Content style={{ paddingHorizontal: 8 }}>
          {tills.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 16 }}>
              No tills available. Add tills first.
            </Text>
          )}
          {tills.map((till, index) => (
            <View key={till.id}>
              <Checkbox.Item
                label={till.name}
                status={selectedTills.has(till.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleSelection(till.id)}
                labelStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
                color={theme.colors.primary}
              />
              {index < tills.length - 1 && <Divider />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Results */}
      {selectedTills.size > 0 && (
        <>
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary, marginTop: 8 }]}>
            COMBINED RESULT
          </Text>

          {/* Summary row */}
          <Surface style={[styles.summaryBanner, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <View style={styles.summaryBlock}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>GRAND TOTAL</Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '800' }}>
                {currencySymbol}{actualTotal.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }]} />
            <View style={styles.summaryBlock}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>EXPECTED</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
                {currencySymbol}{expectedFloat.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }]} />
            <View style={styles.summaryBlock}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>DIFF</Text>
              <Text variant="titleLarge" style={{ color: diffColor, fontWeight: '800' }}>
                {difference > 0 ? '+' : ''}{currencySymbol}{difference.toFixed(2)}
              </Text>
            </View>
          </Surface>

          {/* Denomination Breakdown */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                DENOMINATION BREAKDOWN
              </Text>
              {combinedItems.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 }}>
                  No values found in selected tills.
                </Text>
              ) : (
                combinedItems.map(item => (
                  <View key={item.denominationId} style={[styles.itemRow, { borderBottomColor: theme.colors.outline }]}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                      {item.name}
                    </Text>
                    <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: 8 }}
                      textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                      ×{item.quantity}
                    </Chip>
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700', width: 70, textAlign: 'right' }}>
                      {currencySymbol}{item.subtotal.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveBtn}
            contentStyle={{ height: 54 }}
            labelStyle={{ fontSize: 16, fontWeight: '700' }}
            icon="content-save-outline"
          >
            Save to History
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 20,
    marginTop: 8,
  },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16 },
  summaryBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBlock: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 52, marginHorizontal: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { marginHorizontal: 16, marginTop: 4, borderRadius: 14 },
});
