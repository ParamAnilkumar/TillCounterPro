import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, useTheme, Button, TextInput, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDenominations, getTills, saveCountSession } from '../../src/db/queries';
import { Denomination, Till } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useTillStore } from '../../src/store/useTillStore';

export default function CountSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const { currencySymbol, managerName } = useSettingsStore();
  const { draftCounts, setQuantity, clearDraft, markSaved } = useTillStore();
  const activeQuantities = draftCounts[id] || {};

  const [till, setTill] = useState<Till | null>(null);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getTills().then(tills => {
      const found = tills.find(t => t.id === id);
      if (found) setTill(found);
    });
    getDenominations().then(setDenominations);
  }, [id]);

  if (!till) return null;

  const actualTotal = denominations.reduce((sum, denom) => {
    const qty = activeQuantities[denom.id] || 0;
    return sum + qty * denom.value;
  }, 0);

  const difference = actualTotal - till.expectedFloat;
  const diffColor = difference === 0 ? theme.colors.primary : difference > 0 ? theme.colors.secondary : theme.colors.error;

  const handleSave = async () => {
    Alert.alert('Complete Count', 'Are you sure you are done counting?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete', onPress: async () => {
          const items = denominations.map(d => ({
            denominationId: d.id,
            quantity: activeQuantities[d.id] || 0,
            subtotal: (activeQuantities[d.id] || 0) * d.value,
          })).filter(i => i.quantity > 0);

          await saveCountSession({
            tillId: till.id,
            timestamp: new Date().toISOString(),
            expectedFloat: till.expectedFloat,
            actualTotal,
            difference,
            managerName,
            notes,
          }, items);

          markSaved(till.id);
          router.back();
        },
      },
    ]);
  };

  // Group by coin vs bill
  const bills = denominations.filter(d => d.type === 'bill');
  const coins = denominations.filter(d => d.type === 'coin');

  const renderDenomRow = (denom: Denomination) => {
    const qty = activeQuantities[denom.id] || 0;
    const subtotal = qty * denom.value;
    return (
      <View key={denom.id} style={[styles.denomRow, { borderBottomColor: theme.colors.outline }]}>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {denom.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {currencySymbol}{denom.value.toFixed(2)} each
          </Text>
        </View>
        <TextInput
          mode="outlined"
          keyboardType="numeric"
          value={qty === 0 ? '' : qty.toString()}
          onChangeText={val => setQuantity(till.id, denom.id, parseInt(val, 10) || 0)}
          style={styles.qtyInput}
          placeholder="0"
          dense
          outlineStyle={{ borderRadius: 10 }}
        />
        <View style={{ width: 74, alignItems: 'flex-end' }}>
          <Text
            variant="titleSmall"
            style={{ color: subtotal > 0 ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: '700' }}
          >
            {currencySymbol}{subtotal.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary Card */}
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '800', marginBottom: 16 }}>
            {till.name}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7, marginBottom: 4 }}>
                EXPECTED
              </Text>
              <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
                {currencySymbol}{till.expectedFloat.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }]} />
            <View style={styles.statBox}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7, marginBottom: 4 }}>
                ACTUAL
              </Text>
              <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
                {currencySymbol}{actualTotal.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }]} />
            <View style={styles.statBox}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7, marginBottom: 4 }}>
                DIFF
              </Text>
              <Text variant="titleLarge" style={{ color: diffColor, fontWeight: '800' }}>
                {difference > 0 ? '+' : ''}{currencySymbol}{difference.toFixed(2)}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Bills Section */}
        {bills.length > 0 && (
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content>
              <View style={styles.sectionLabel}>
                <MaterialCommunityIcons name="cash" size={16} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary, marginLeft: 6, fontWeight: '700', letterSpacing: 0.5 }}>
                  BILLS
                </Text>
              </View>
              {bills.map(renderDenomRow)}
            </Card.Content>
          </Card>
        )}

        {/* Coins Section */}
        {coins.length > 0 && (
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content>
              <View style={styles.sectionLabel}>
                <MaterialCommunityIcons name="circle-slice-8" size={16} color={theme.colors.secondary} />
                <Text variant="labelLarge" style={{ color: theme.colors.secondary, marginLeft: 6, fontWeight: '700', letterSpacing: 0.5 }}>
                  COINS
                </Text>
              </View>
              {coins.map(renderDenomRow)}
            </Card.Content>
          </Card>
        )}

        {/* Notes */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <TextInput
              label="Session Notes (Optional)"
              mode="outlined"
              multiline
              value={notes}
              onChangeText={setNotes}
              outlineStyle={{ borderRadius: 12 }}
            />
          </Card.Content>
        </Card>

        {/* Actions */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveBtn}
          contentStyle={{ height: 54 }}
          labelStyle={{ fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }}
          icon="check-circle-outline"
        >
          Complete Count
        </Button>

        <Button
          mode="outlined"
          onPress={() => {
            Alert.alert('Clear Counts', 'Reset all quantities for this till?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => clearDraft(till.id) },
            ]);
          }}
          style={[styles.clearBtn, { borderColor: theme.colors.error }]}
          contentStyle={{ height: 50 }}
          textColor={theme.colors.error}
          labelStyle={{ fontWeight: '600' }}
          icon="refresh"
        >
          Clear Counts
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 20,
    padding: 20,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 48, marginHorizontal: 4 },
  sectionCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qtyInput: { width: 72, marginHorizontal: 12, height: 40 },
  saveBtn: { marginHorizontal: 16, marginTop: 8, marginBottom: 10, borderRadius: 14 },
  clearBtn: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14 },
});
