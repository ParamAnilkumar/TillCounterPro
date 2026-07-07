import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Person {
  id: string;
  name: string;
  code: string;
  role?: 'manager' | 'crew';
}

interface SettingsState {
  managerName: string;
  currencySymbol: string;
  darkMode: boolean;
  defaultFloatAmount: number;
  setManagerName: (name: string) => void;
  setCurrencySymbol: (symbol: string) => void;
  setDarkMode: (isDark: boolean) => void;
  setDefaultFloatAmount: (amount: number) => void;
  persons: Person[];
  addPerson: (person: Person) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, person: Person) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      managerName: '',
      currencySymbol: '$',
      darkMode: false,
      defaultFloatAmount: 150.00,
      setManagerName: (name) => set({ managerName: name }),
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      setDarkMode: (isDark) => set({ darkMode: isDark }),
      setDefaultFloatAmount: (amount) => set({ defaultFloatAmount: amount }),
      persons: [],
      addPerson: (person) => set((state) => ({ persons: [...state.persons, person] })),
      removePerson: (id) => set((state) => ({ persons: state.persons.filter(p => p.id !== id) })),
      updatePerson: (id, person) => set((state) => ({ persons: state.persons.map(p => p.id === id ? person : p) })),
    }),
    {
      name: 'tillcounter-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
