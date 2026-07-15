import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedPrinter {
  name: string;
  url: string;
}

interface PrinterState {
  printer: SavedPrinter | null;
}

interface PrinterActions {
  setPrinter: (printer: SavedPrinter | null) => void;
  clearPrinter: () => void;
}

type PrinterStore = PrinterState & PrinterActions;

export const usePrinterStore = create<PrinterStore>()(
  persist(
    (set) => ({
      printer: null,

      setPrinter: (printer) => set({ printer }),

      clearPrinter: () => set({ printer: null }),
    }),
    {
      name: 'printer-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
