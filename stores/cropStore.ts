import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterType } from '../constants/theme';

export type Orientation = 'portrait' | 'landscape';

interface CropState {
  croppedImage: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  selectedFilter: FilterType;
  orientation: Orientation;
  comingSoonFilter: string | null;
}

interface CropActions {
  setCroppedImage: (img: string | null) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setWarmth: (value: number) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setOrientation: (orientation: Orientation) => void;
  setComingSoonFilter: (filter: string | null) => void;
  clearCroppedImage: () => void;
  resetFilters: () => void;
  resetAll: () => void;
}

type CropStore = CropState & CropActions;

const initialState: CropState = {
  croppedImage: null,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  selectedFilter: 'original',
  orientation: 'portrait',
  comingSoonFilter: null,
};

export const useCropStore = create<CropStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCroppedImage: (img) => set({ croppedImage: img }),

      setBrightness: (value) => set({ brightness: value }),

      setContrast: (value) => set({ contrast: value }),

      setSaturation: (value) => set({ saturation: value }),

      setWarmth: (value) => set({ warmth: value }),

      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      setOrientation: (orientation) => set({ orientation }),

      setComingSoonFilter: (filter) => set({ comingSoonFilter: filter }),

      clearCroppedImage: () => set({ croppedImage: null }),

      resetFilters: () =>
        set({
          brightness: initialState.brightness,
          contrast: initialState.contrast,
          saturation: initialState.saturation,
          warmth: initialState.warmth,
          selectedFilter: initialState.selectedFilter,
          comingSoonFilter: initialState.comingSoonFilter,
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
