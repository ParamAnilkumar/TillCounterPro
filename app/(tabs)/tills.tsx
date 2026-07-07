import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, FAB, useTheme, IconButton, Menu, Dialog, Portal, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getTills, addTill, updateTill, deleteTill } from '../../src/db/queries';
import { Till } from '../../src/types';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useTillStore } from '../../src/store/useTillStore';

export default function TillsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { currencySymbol, defaultFloatAmount, persons } = useSettingsStore();
  const { draftCounts, savedTills } = useTillStore();

  const [tills, setTills] = useState<Till[]>([]);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [authDialogVisible, setAuthDialogVisible] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAction, setAuthAction] = useState<'add' | 'edit' | 'delete' | 'duplicate' | 'count'>('add');
  const [pendingTill, setPendingTill] = useState<Till | null>(null);

  // Start Session Dialog
  const [startSessionVisible, setStartSessionVisible] = useState(false);
  const [sessionTime, setSessionTime] = useState<'opening' | 'afternoon' | 'closing' | 'overnight'>('closing');
  const [sessionExpectedFloat, setSessionExpectedFloat] = useState('');
  const [sessionCounterName, setSessionCounterName] = useState('');

  const [editingTill, setEditingTill] = useState<Till | null>(null);
  const [tillName, setTillName] = useState('');
  const [expectedFloat, setExpectedFloat] = useState(defaultFloatAmount.toString());
  const [notes, setNotes] = useState('');

  const loadTills = useCallback(() => {
    getTills().then(t => setTills(t.filter(x => x.name !== 'Combined Counts')));
  }, []);

  useFocusEffect(useCallback(() => { loadTills(); }, [loadTills]));

  const executeAction = async (action: 'add' | 'edit' | 'delete' | 'duplicate' | 'count', till: Till | null) => {
    if (action === 'add') {
      setEditingTill(null);
      setTillName('');
      setExpectedFloat(defaultFloatAmount.toString());
      setNotes('');
      setDialogVisible(true);
    } else if (action === 'edit' && till) {
      setEditingTill(till);
      setTillName(till.name);
      setExpectedFloat(till.expectedFloat.toString());
      setNotes(till.notes || '');
      setDialogVisible(true);
    } else if (action === 'delete' && till) {
      Alert.alert('Delete Till', 'Are you sure you want to delete this till?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTill(till.id); loadTills(); } },
      ]);
    } else if (action === 'duplicate' && till) {
      await addTill({ name: `${till.name} (Copy)`, expectedFloat: till.expectedFloat, notes: till.notes });
      loadTills();
    }
  };

  const handleSave = async () => {
    if (!tillName.trim()) return;
    const floatVal = 0;
    
    if (editingTill) {
      await updateTill(editingTill.id, { name: tillName, expectedFloat: floatVal, notes });
    } else {
      await addTill({ name: tillName, expectedFloat: floatVal, notes });
    }
    setDialogVisible(false);
    loadTills();
  };

  const requireAuth = (action: 'add' | 'edit' | 'delete' | 'duplicate' | 'count', till: Till | null = null) => {
    setMenuVisible(null);
    setAuthAction(action);
    setPendingTill(till);
    setAuthName('');
    setAuthCode('');
    setAuthError('');
    setAuthDialogVisible(true);
  };

  const handleAuthSubmit = () => {
    const matchedPerson = persons.find(
      p => p.name.toLowerCase() === authName.trim().toLowerCase() && p.code === authCode
    );

    if (!matchedPerson) {
      setAuthError('Invalid Name or Code.');
      return;
    }

    if (authAction !== 'count' && matchedPerson.role !== 'manager') {
      setAuthError('Only Managers can modify tills.');
      return;
    }

    setAuthDialogVisible(false);

    if (authAction === 'count' && pendingTill) {
      setSessionCounterName(matchedPerson.name);
      setSessionExpectedFloat(pendingTill.expectedFloat.toString());
      setSessionTime('closing');
      setStartSessionVisible(true);
    } else {
      executeAction(authAction, pendingTill);
    }
  };

  const handleStartSession = () => {
    if (!pendingTill) return;
    setStartSessionVisible(false);
    router.push({ 
      pathname: '/count/[id]', 
      params: { 
        id: pendingTill.id, 
        counterName: sessionCounterName,
        sessionType: sessionTime,
        expectedFloat: sessionExpectedFloat
      } 
    });
  };

  const getTillDraftTotal = (till: Till) => {
    const drafts = draftCounts[till.id] || {};
    return Object.values(drafts).reduce((s, q) => s + q, 0);
  };

  const hasDraftInProgress = (till: Till) => {
    return getTillDraftTotal(till) > 0 && !savedTills[till.id];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Combine Banner */}
      <Surface style={[styles.combineBanner, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
            Combine Tills
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
            Add multiple tills together instantly
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={() => router.push('/combine')}
          style={{ borderRadius: 10 }}
          labelStyle={{ fontSize: 13, fontWeight: '700' }}
          icon="plus-box-multiple"
        >
          Combine
        </Button>
      </Surface>

      <FlatList
        data={tills}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-register" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, opacity: 0.6 }}>
              No tills yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.4, marginTop: 4 }}>
              Tap + to add your first till
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const showDraftBadge = hasDraftInProgress(item);
          return (
            <Card
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => requireAuth('count', item)}
              elevation={2}
            >
              <Card.Content style={styles.cardContent}>
                <View style={[styles.tillIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="cash-register" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {item.name}
                  </Text>
                  {showDraftBadge && (
                    <View style={[styles.draftBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                      <MaterialCommunityIcons name="pencil-outline" size={11} color={theme.colors.onSecondaryContainer} />
                      <Text style={{ fontSize: 11, color: theme.colors.onSecondaryContainer, marginLeft: 3, fontWeight: '600' }}>
                        Draft in progress
                      </Text>
                    </View>
                  )}
                </View>
                <Menu
                  visible={menuVisible === item.id}
                  onDismiss={() => setMenuVisible(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={20}
                      iconColor={theme.colors.onSurfaceVariant}
                      onPress={() => setMenuVisible(item.id)}
                    />
                  }
                >
                  <Menu.Item leadingIcon="pencil-outline" onPress={() => requireAuth('edit', item)} title="Edit" />
                  <Menu.Item leadingIcon="content-copy" onPress={() => requireAuth('duplicate', item)} title="Duplicate" />
                  <Menu.Item leadingIcon="delete-outline" onPress={() => requireAuth('delete', item)} title="Delete" titleStyle={{ color: theme.colors.error }} />
                </Menu>
              </Card.Content>
            </Card>
          );
        }}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 20 }}>
          <Dialog.Title style={{ fontWeight: '700' }}>{editingTill ? 'Edit Till' : 'New Till'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Till Name" value={tillName} onChangeText={setTillName} style={styles.input} mode="outlined" />
            <TextInput label="Notes (Optional)" value={notes} onChangeText={setNotes} style={styles.input} multiline mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} style={{ borderRadius: 8 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={authDialogVisible} onDismiss={() => setAuthDialogVisible(false)} style={{ borderRadius: 20 }}>
          <Dialog.Title style={{ fontWeight: '700' }}>Authentication Required</Dialog.Title>
          <Dialog.Content>
            {authError ? <Text style={{ color: theme.colors.error, marginBottom: 8, fontSize: 12 }}>{authError}</Text> : null}
            <Text style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
              Please enter an authorized person's name and 4-digit code to {authAction === 'count' ? 'access this till' : 'modify tills'}.
            </Text>
            <TextInput
              label="Person Name"
              value={authName}
              onChangeText={n => { setAuthName(n); setAuthError(''); }}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="4-Digit Code"
              value={authCode}
              onChangeText={c => { setAuthCode(c); setAuthError(''); }}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
              mode="outlined"
              secureTextEntry
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAuthDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAuthSubmit} style={{ borderRadius: 8 }}>Verify</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Start Session Dialog */}
        <Dialog visible={startSessionVisible} onDismiss={() => setStartSessionVisible(false)} style={{ borderRadius: 20 }}>
          <Dialog.Title style={{ fontWeight: '700' }}>Start Session</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
              Configure your count session for {pendingTill?.name}.
            </Text>
            
            <Text style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>SESSION TIME</Text>
            <View style={{ marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['opening', 'afternoon', 'closing', 'overnight'].map(type => (
                <Button
                  key={type}
                  mode={sessionTime === type ? 'contained' : 'outlined'}
                  onPress={() => setSessionTime(type as any)}
                  compact
                  style={{ borderRadius: 8 }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </View>

            <TextInput
              label="Expected Amount"
              value={sessionExpectedFloat}
              onChangeText={setSessionExpectedFloat}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              left={<TextInput.Affix text={currencySymbol} />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStartSessionVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleStartSession} style={{ borderRadius: 8 }} icon="play">Start</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => requireAuth('add')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  combineBanner: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: { marginBottom: 10, borderRadius: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  tillIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, borderRadius: 18 },
  input: { marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
});
