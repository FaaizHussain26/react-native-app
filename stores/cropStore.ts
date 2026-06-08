import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterType } from '../constants/theme';

interface CropState {
  croppedImage: string | null;
  brightness: number;
  selectedFilter: FilterType;
  orientation: 'portrait' | 'landscape';
}

interface CropActions {
  setCroppedImage: (img: string | null) => void;
  setBrightness: (value: number) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setOrientation: (o: 'portrait' | 'landscape') => void;
  clearCroppedImage: () => void;
  resetFilters: () => void;
  resetAll: () => void;
}

type CropStore = CropState & CropActions;

const initialState: CropState = {
  croppedImage: null,
  brightness: 100,
  selectedFilter: 'original',
  orientation: 'portrait',
};

export const useCropStore = create<CropStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCroppedImage: (img) => set({ croppedImage: img }),

      setBrightness: (value) => set({ brightness: value }),

      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      setOrientation: (o) => set({ orientation: o, croppedImage: null }),

      clearCroppedImage: () => set({ croppedImage: null }),

      resetFilters: () =>
        set({
          brightness: initialState.brightness,
          selectedFilter: initialState.selectedFilter,
          croppedImage: null,
        }),

      resetAll: () => set(initialState),
    }),
    {
      name: 'crop-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
