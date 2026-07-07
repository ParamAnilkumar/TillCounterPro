import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, FAB, useTheme, IconButton, Dialog, Portal, TextInput, Button, Appbar, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore, Person } from '../src/store/useSettingsStore';

export default function PersonsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { persons, addPerson, removePerson, updatePerson } = useSettingsStore();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'manager' | 'crew'>('crew');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (code.length !== 4 || !/^\d+$/.test(code)) {
      setError('Code must be exactly 4 digits');
      return;
    }

    if (editingPerson) {
      updatePerson(editingPerson.id, { ...editingPerson, name, code, role });
    } else {
      addPerson({ id: Date.now().toString(), name, code, role });
    }
    setDialogVisible(false);
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setName(person.name);
    setCode(person.code);
    setRole(person.role || 'crew');
    setError('');
    setDialogVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Person', 'Are you sure you want to remove this person?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePerson(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Manage Persons" />
      </Appbar.Header>

      <FlatList
        data={persons}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, opacity: 0.6 }}>
              No persons added yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.4, marginTop: 4 }}>
              Tap + to add an authorized person
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={[styles.personIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="account" size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Code: ****  •  {item.role === 'manager' ? 'Manager' : 'Crew'}
                </Text>
              </View>
              <IconButton
                icon="pencil-outline"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => handleEdit(item)}
              />
              <IconButton
                icon="delete-outline"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => handleDelete(item.id)}
              />
            </Card.Content>
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 20 }}>
          <Dialog.Title style={{ fontWeight: '700' }}>{editingPerson ? 'Edit Person' : 'Add Person'}</Dialog.Title>
          <Dialog.Content>
            {error ? <Text style={{ color: theme.colors.error, marginBottom: 8, fontSize: 12 }}>{error}</Text> : null}
            <TextInput
              label="Name"
              value={name}
              onChangeText={n => { setName(n); setError(''); }}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="4-Digit Code"
              value={code}
              onChangeText={c => { setCode(c); setError(''); }}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
              mode="outlined"
              secureTextEntry
            />
            <Text style={{ marginTop: 12, marginBottom: 8, color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>ROLE</Text>
            <SegmentedButtons
              value={role}
              onValueChange={val => setRole(val as 'manager' | 'crew')}
              buttons={[
                { value: 'crew', label: 'Crew' },
                { value: 'manager', label: 'Manager' },
              ]}
              theme={{ colors: { secondaryContainer: theme.colors.primaryContainer } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} style={{ borderRadius: 8 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          setEditingPerson(null);
          setName('');
          setCode('');
          setRole('crew');
          setError('');
          setDialogVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { marginBottom: 10, borderRadius: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  personIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, borderRadius: 18 },
  input: { marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
});
