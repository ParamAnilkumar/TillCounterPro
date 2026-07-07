import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Switch, List, useTheme, Button, Surface, Divider, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const settings = useSettingsStore();

  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleManagePersons = () => {
    setPasswordInput('');
    setPasswordError(false);
    setPasswordDialogVisible(true);
  };

  const verifyPassword = () => {
    if (passwordInput === '3254') {
      setPasswordDialogVisible(false);
      router.push('/persons');
    } else {
      setPasswordError(true);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile-style header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="account" size={32} color={theme.colors.onPrimary} />
        </View>
        <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', marginTop: 8 }}>
          {settings.managerName || 'Manager'}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
          TillCounter Pro
        </Text>
      </Surface>

      {/* General Section */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          GENERAL
        </Text>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.colors.onSurfaceVariant} style={styles.fieldIcon} />
            <TextInput
              label="Manager Name"
              value={settings.managerName}
              onChangeText={settings.setManagerName}
              style={styles.input}
              mode="outlined"
              outlineStyle={{ borderRadius: 10 }}
            />
          </View>
          <Divider style={{ marginVertical: 4 }} />
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="currency-usd" size={20} color={theme.colors.onSurfaceVariant} style={styles.fieldIcon} />
            <TextInput
              label="Currency Symbol"
              value={settings.currencySymbol}
              onChangeText={settings.setCurrencySymbol}
              style={styles.input}
              maxLength={3}
              mode="outlined"
              outlineStyle={{ borderRadius: 10 }}
            />
          </View>
          <Divider style={{ marginVertical: 4 }} />
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="cash" size={20} color={theme.colors.onSurfaceVariant} style={styles.fieldIcon} />
            <TextInput
              label="Default Float Amount"
              value={settings.defaultFloatAmount.toString()}
              onChangeText={v => settings.setDefaultFloatAmount(parseFloat(v) || 0)}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              outlineStyle={{ borderRadius: 10 }}
              left={<TextInput.Affix text={settings.currencySymbol} />}
            />
          </View>
        </Surface>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          PREFERENCES
        </Text>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <List.Item
            title="Dark Mode"
            description="Switch between light and dark theme"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="weather-night" size={18} color={theme.colors.primary} />
              </View>
            )}
            right={() => (
              <Switch
                value={settings.darkMode}
                onValueChange={settings.setDarkMode}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Manage Denominations"
            description="Add, edit, or remove cash denominations"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            onPress={() => router.push('/denominations')}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color={theme.colors.secondary} />
              </View>
            )}
            right={() => (
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            )}
          />
        </Surface>
      </View>

      {/* Personnel Section */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          PERSONNEL
        </Text>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <List.Item
            title="Manage Persons"
            description="Add or remove authorized persons for tills"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            onPress={handleManagePersons}
            left={() => (
              <View style={[styles.listIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color={theme.colors.primary} />
              </View>
            )}
            right={() => (
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            )}
          />
        </Surface>
      </View>


      <Portal>
        <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)} style={{ borderRadius: 20 }}>
          <Dialog.Title style={{ fontWeight: '700' }}>Admin Authentication</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
              Please enter the admin password to access personnel settings.
            </Text>
            <TextInput
              label="Password"
              value={passwordInput}
              onChangeText={(text) => { setPasswordInput(text); setPasswordError(false); }}
              secureTextEntry
              mode="outlined"
              error={passwordError}
              autoFocus
              onSubmitEditing={verifyPassword}
            />
            {passwordError && (
              <Text style={{ color: theme.colors.error, marginTop: 8, fontSize: 12 }}>
                Incorrect password. Please try again.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={verifyPassword} style={{ borderRadius: 8 }}>Verify</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  fieldIcon: { marginRight: 8, marginTop: 8 },
  input: { flex: 1 },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
  },
});
