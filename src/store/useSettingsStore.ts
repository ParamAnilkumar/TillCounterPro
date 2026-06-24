import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  managerName: string;
  currencySymbol: string;
  darkMode: boolean;
  defaultFloatAmount: number;
  setManagerName: (name: string) => void;
  setCurrencySymbol: (symbol: string) => void;
  setDarkMode: (isDark: boolean) => void;
  setDefaultFloatAmount: (amount: number) => void;
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
    }),
    {
      name: 'tillcounter-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
