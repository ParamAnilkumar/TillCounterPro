import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, FAB, IconButton, useTheme, Dialog, Portal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getDenominations, addDenomination, updateDenomination, deleteDenomination } from '../src/db/queries';
import { Denomination } from '../src/types';
import { useSettingsStore } from '../src/store/useSettingsStore';

export default function DenominationsScreen() {
  const theme = useTheme();
  const { currencySymbol } = useSettingsStore();
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingDenom, setEditingDenom] = useState<Denomination | null>(null);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('bill');
  const [sortOrder, setSortOrder] = useState('');

  const loadDenominations = useCallback(() => {
    getDenominations().then(setDenominations);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDenominations();
    }, [loadDenominations])
  );

  const handleSave = async () => {
    if (!name || !value) return;
    const val = parseFloat(value) || 0;
    const order = parseInt(sortOrder, 10) || denominations.length + 1;
    
    if (editingDenom) {
      await updateDenomination(editingDenom.id, { name, value: val, type: type as any, sortOrder: order });
    } else {
      await addDenomination({ name, value: val, type: type as any, sortOrder: order });
    }
    
    setDialogVisible(false);
    loadDenominations();
  };

  const handleEdit = (denom: Denomination) => {
    setEditingDenom(denom);
    setName(denom.name);
    setValue(denom.value.toString());
    setType(denom.type);
    setSortOrder(denom.sortOrder.toString());
    setDialogVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Denomination', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteDenomination(id);
        loadDenominations();
      }}
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={denominations}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.name}
              subtitle={`Value: ${currencySymbol}${item.value.toFixed(2)} • Type: ${item.type}`}
              right={(props) => (
                <View style={{ flexDirection: 'row' }}>
                  <IconButton {...props} icon="pencil" onPress={() => handleEdit(item)} />
                  <IconButton {...props} icon="delete" iconColor={theme.colors.error} onPress={() => handleDelete(item.id)} />
                </View>
              )}
            />
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingDenom ? 'Edit Denomination' : 'New Denomination'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Name (e.g. Twenty Dollar Bill)" value={name} onChangeText={setName} style={styles.input} />
            <TextInput label="Value" value={value} onChangeText={setValue} keyboardType="numeric" style={styles.input} />
            <TextInput label="Sort Order" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" style={styles.input} />
            <SegmentedButtons
              value={type}
              onValueChange={setType}
              buttons={[
                { value: 'coin', label: 'Coin' },
                { value: 'bill', label: 'Bill' },
              ]}
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          setEditingDenom(null);
          setName('');
          setValue('');
          setType('bill');
          setSortOrder((denominations.length + 1).toString());
          setDialogVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { marginBottom: 12 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  input: { marginBottom: 12 },
});
