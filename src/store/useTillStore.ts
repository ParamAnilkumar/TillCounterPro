import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TillState {
  draftCounts: Record<string, Record<string, number>>; // tillId -> denominationId -> quantity
  savedTills: Record<string, boolean>; // tillId -> whether last count was saved
  setQuantity: (tillId: string, denominationId: string, quantity: number) => void;
  clearDraft: (tillId: string) => void;
  markSaved: (tillId: string) => void;
}

export const useTillStore = create<TillState>()(
  persist(
    (set) => ({
      draftCounts: {},
      savedTills: {},
      setQuantity: (tillId, denominationId, quantity) =>
        set((state) => ({
          draftCounts: {
            ...state.draftCounts,
            [tillId]: {
              ...(state.draftCounts[tillId] || {}),
              [denominationId]: quantity,
            },
          },
          // Any edit clears the "saved" flag so Draft in progress reappears
          savedTills: { ...state.savedTills, [tillId]: false },
        })),
      clearDraft: (tillId) =>
        set((state) => {
          const newDrafts = { ...state.draftCounts };
          delete newDrafts[tillId];
          const newSaved = { ...state.savedTills };
          delete newSaved[tillId];
          return { draftCounts: newDrafts, savedTills: newSaved };
        }),
      markSaved: (tillId) =>
        set((state) => ({
          savedTills: { ...state.savedTills, [tillId]: true },
        })),
    }),
    {
      name: 'till-draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
