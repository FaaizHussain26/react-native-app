import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterType } from '../constants/theme';

export type Orientation = 'portrait' | 'landscape';

/**
 * A crop rectangle in 0..1 fractions of the *original* image's own pixel
 * dimensions — not display pixels. Normalized so it survives a different
 * screen size, a different source resolution, and a store rehydrate.
 */
export type NormalizedRect = { x: number; y: number; w: number; h: number };

interface CropState {
  croppedImage: string | null;
  /**
   * Local cache copy of the UN-cropped source photo. Cropping always reads
   * from this, never from croppedImage, so re-cropping can't compound.
   */
  originalImage: string | null;
  /** The rectangle croppedImage was cut from, so the crop screen reopens where the customer left it. */
  cropRect: NormalizedRect | null;
  /** Which session cropRect belongs to — a persisted rect must not be applied to a new customer's photo. */
  cropSourceSession: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  selectedFilter: FilterType;
  orientation: Orientation;
  // True once the customer has explicitly picked Portrait/Landscape, so a
  // later auto-detection pass (e.g. re-running on a fresh crop, or on an
  // edit-screen remount) can never silently overwrite their choice.
  orientationManuallySet: boolean;
  comingSoonFilter: string | null;
}

interface CropActions {
  setCroppedImage: (img: string | null) => void;
  setOriginalImage: (uri: string | null) => void;
  /** Commits a finished crop in one write, so no render sees croppedImage and cropRect disagree. */
  applyCrop: (payload: {
    croppedImage: string;
    originalImage: string;
    cropRect: NormalizedRect;
    session: string;
  }) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setWarmth: (value: number) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setOrientation: (orientation: Orientation) => void;
  setAutoDetectedOrientation: (orientation: Orientation) => void;
  setComingSoonFilter: (filter: string | null) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

type CropStore = CropState & CropActions;

const initialState: CropState = {
  croppedImage: null,
  originalImage: null,
  cropRect: null,
  cropSourceSession: null,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  selectedFilter: 'original',
  orientation: 'portrait',
  orientationManuallySet: false,
  comingSoonFilter: null,
};

export const useCropStore = create<CropStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCroppedImage: (img) => set({ croppedImage: img }),

      setOriginalImage: (uri) => set({ originalImage: uri }),

      applyCrop: ({ croppedImage, originalImage, cropRect, session }) =>
        set({ croppedImage, originalImage, cropRect, cropSourceSession: session }),

      setBrightness: (value) => set({ brightness: value }),

      setContrast: (value) => set({ contrast: value }),

      setSaturation: (value) => set({ saturation: value }),

      setWarmth: (value) => set({ warmth: value }),

      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      setOrientation: (orientation) => set({ orientation, orientationManuallySet: true }),

      // Only takes effect if the customer hasn't manually chosen an
      // orientation yet — see the CropState.orientationManuallySet comment.
      setAutoDetectedOrientation: (orientation) =>
        set((state) => (state.orientationManuallySet ? {} : { orientation })),

      setComingSoonFilter: (filter) => set({ comingSoonFilter: filter }),

      resetFilters: () =>
        set({
          brightness: initialState.brightness,
          contrast: initialState.contrast,
          saturation: initialState.saturation,
          warmth: initialState.warmth,
          selectedFilter: initialState.selectedFilter,
          comingSoonFilter: initialState.comingSoonFilter,
          // cropRect has to go with croppedImage — otherwise the store claims
          // a crop rectangle for a photo that is no longer cropped, and the
          // crop screen would restore it. originalImage stays: it's a cached
          // download, and dropping it would only force a re-fetch.
          croppedImage: null,
          cropRect: null,
          cropSourceSession: null,
        }),

      resetAll: () => set(initialState),
    }),
    {
      name: 'crop-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist file URIs. Both point into cacheDirectory, which the OS
      // may evict between launches — a rehydrated-but-evicted croppedImage
      // makes the print path's base64 read throw. cropRect and
      // cropSourceSession are pure data and are enough to restore the
      // customer's rectangle after a fresh download.
      partialize: ({ croppedImage, originalImage, ...rest }) => rest,
    },
  ),
);
