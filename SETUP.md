# Posta Kiosk — React Native Expo App

Complete React Native Expo conversion of the kiosk-app-frontend Next.js web app.

## Project Structure

```
kiosk-app-expo/
├── app/
│   ├── _layout.tsx          # Root layout (QueryClient, SafeArea, GestureHandler)
│   ├── index.tsx            # Home screen — create session + start button
│   ├── kiosk/
│   │   ├── qr.tsx           # QR code display + WebSocket listener
│   │   ├── edit.tsx         # Filter picker + brightness slider + flip card
│   │   ├── crop.tsx         # Pan/pinch crop with expo-image-manipulator
│   │   ├── review.tsx       # Front + back postcard preview
│   │   ├── payment.tsx      # Price summary + AirPrint / CUPS print
│   │   └── print.tsx        # Print confirmation screen
│   └── mobile/
│       └── upload.tsx       # Phone upload (expo-image-picker)
├── components/
│   ├── FilteredImage.tsx    # SVG filter-based image renderer (grayscale, sepia, etc.)
│   ├── IdleModal.tsx        # Idle activity warning modal
│   ├── PostaFooter.tsx      # Fixed footer with Posta branding
│   └── ProgressSteps.tsx    # 1–5 step indicator
├── constants/
│   └── theme.ts             # Colors, spacing, radii, filter matrices
├── hooks/
│   ├── useCreateSession.ts
│   ├── useIdleActivity.ts
│   └── useUploadSessionImage.ts
├── services/
│   ├── api.ts               # Axios instance
│   └── session.ts           # All API calls
└── stores/
    └── cropStore.ts         # Zustand store (AsyncStorage persistence)
```

## Setup

### 1. Copy assets from the web app

Copy all images and icons from `kiosk-app-frontend/public/` into `kiosk-app-expo/assets/`:

```bash
cp ../kiosk-app-frontend/public/images/*.png  assets/images/
cp ../kiosk-app-frontend/public/icons/*.png   assets/icons/
```

Also add placeholder `icon.png`, `splash-icon.png`, `adaptive-icon.png`, and `favicon.png` to `assets/images/` (or update paths in `app.json`).

### 2. Install dependencies

```bash
cd kiosk-app-expo
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your backend URL
```

### 4. Run on device / simulator

```bash
# iOS Simulator
npx expo start --ios

# Physical iPad (recommended for kiosk)
npx expo start
# Scan QR with Expo Go, or build a dev client:
npx expo run:ios --device
```

## Key Differences from Web App

| Feature | Web (Next.js) | Native (Expo) |
|---------|--------------|---------------|
| Routing | `useRouter` + `useSearchParams` | `useRouter` + `useLocalSearchParams` |
| Storage | `sessionStorage` | `AsyncStorage` |
| Image filters | CSS `filter:` | SVG `FeColorMatrix` (preview) + CSS in HTML (print) |
| Printing | `window.print()` / CUPS | `expo-print` AirPrint / CUPS API |
| QR Code | `qrcode.react` | `react-native-qrcode-svg` |
| Crop | `react-image-crop` | `expo-image-manipulator` + pan/pinch UI |
| Fullscreen | Fullscreen API | `expo-keep-awake` + kiosk mode |
| Image pick | Drag-drop file input | `expo-image-picker` |
| Environment vars | `NEXT_PUBLIC_*` | `EXPO_PUBLIC_*` |

## Printing

### AirPrint (default, iOS only)
- Uses `expo-print` with HTML containing the exact same CSS filter as the web app
- Goes directly to any AirPrint-compatible printer on the same network
- No popup dialog on iPad when a printer is preconfigured

### Server-side CUPS printing
- Set `EXPO_PUBLIC_USE_SERVER_PRINT=true` in `.env`
- Captures the filtered postcard preview as a JPEG via `react-native-view-shot`
- POSTs the image to `POST /session/{id}/print`
- Backend handles CUPS print job configuration

## Filters (Preview vs Print)

Preview uses `react-native-svg` `FeColorMatrix` filter primitives — pixel-accurate on iOS.

Print uses `expo-print` HTML with the same CSS filter string as the web app:
- `original`: no filter
- `warm`: `sepia(20%) saturate(140%) hue-rotate(-10deg)`
- `cool`: `saturate(90%) hue-rotate(15deg) brightness(105%)`
- `pastel`: `saturate(70%) brightness(110%) contrast(90%)`
- `mono`: `grayscale(100%)`
- `sepia`: `sepia(80%)`

## Build for Production (iPad Kiosk)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS build
eas build:configure

# Build for iOS (creates IPA for TestFlight / App Store / MDM)
eas build --platform ios --profile production
```

For an unattended kiosk, configure Guided Access on the iPad (Settings → Accessibility → Guided Access) to lock the app into single-app mode.
