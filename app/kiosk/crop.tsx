import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDecay,
  clamp,
  runOnJS,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCropStore } from '../../stores/cropStore';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { CARD_W_IN, CARD_H_IN, BORDER_IN, BOTTOM_IN } from '../../constants/postcard';

const { width: SW, height: SH } = Dimensions.get('window');

// The display area behind the crop frame
const DISPLAY_W = SW * 0.65;
const DISPLAY_H = SH * 0.75;

export default function CropScreen() {
  const router = useRouter();
  const { image: encodedImageUrl = '', session: sessionId = '' } =
    useLocalSearchParams<{ image: string; session: string }>();

  const imageUrl = decodeURIComponent(encodedImageUrl);
  const { setCroppedImage, resetAll, orientation } = useCropStore();

  const [isCropping, setIsCropping] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // The actual rendered size of the source image under resizeMode="contain"
  // at scale 1 (image scaled to fit DISPLAY_W x DISPLAY_H, keeping aspect
  // ratio). Shared by the min-zoom floor below and the crop-pixel math in
  // handleApplyCrop, so the two can never drift apart.
  const baseRendered = useMemo(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return null;
    const displayAspect = DISPLAY_W / DISPLAY_H;
    const imageAspect = imageSize.width / imageSize.height;
    if (imageAspect > displayAspect) {
      return { width: DISPLAY_W, height: DISPLAY_W / imageAspect };
    }
    return { height: DISPLAY_H, width: DISPLAY_H * imageAspect };
  }, [imageSize]);

  // The crop frame mirrors the postcard's actual front-image area for the
  // current orientation, so cropping a landscape photo doesn't force it
  // into the portrait card shape (and vice versa).
  const { CROP_FRAME_W, CROP_FRAME_H, frameLeft, frameTop } = useMemo(() => {
    const pageWidthIn = orientation === 'landscape' ? CARD_H_IN : CARD_W_IN;
    const pageHeightIn = orientation === 'landscape' ? CARD_W_IN : CARD_H_IN;
    const innerWIn = pageWidthIn - 2 * BORDER_IN;
    const innerHIn = pageHeightIn - BORDER_IN - BOTTOM_IN;

    const shortIn = Math.min(innerWIn, innerHIn);
    const longIn = Math.max(innerWIn, innerHIn);
    const shortPx = Math.min(SW * 0.35, 320);
    const longPx = shortPx * (longIn / shortIn);

    const frameW = innerWIn >= innerHIn ? longPx : shortPx;
    const frameH = innerWIn >= innerHIn ? shortPx : longPx;

    return {
      CROP_FRAME_W: frameW,
      CROP_FRAME_H: frameH,
      frameLeft: (DISPLAY_W - frameW) / 2,
      frameTop: (DISPLAY_H - frameH) / 2,
    };
  }, [orientation]);

  // The image must always fully cover the crop frame in both dimensions —
  // otherwise the frame extends past the (contain-fit) image edges, relX/relY
  // in handleApplyCrop go negative, and the crop rect silently shifts/shrinks
  // instead of matching what's visible in the frame. This is most likely to
  // bite in landscape, where the frame is much wider than in portrait.
  const minScale = useMemo(() => {
    if (!baseRendered) return 0.5;
    return Math.max(
      CROP_FRAME_W / baseRendered.width,
      CROP_FRAME_H / baseRendered.height,
      0.5,
    );
  }, [baseRendered, CROP_FRAME_W, CROP_FRAME_H]);

  const { showModal, resetIdleTimer } = useIdleActivity(
    () => {
      resetAll();
      router.replace('/');
    },
    { enabled: !isCropping },
  );

  // Pan offset of the image within the display area
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Store initial values at gesture start for pan
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  // Last time (UI thread) we pinged the idle clock from an in-progress
  // gesture. onUpdate fires at frame rate, so this throttles the
  // runOnJS bridge crossing to ~once/second instead of every frame —
  // without it, a sustained pan/pinch only reset the clock at onBegin,
  // letting the idle timer expire mid-gesture on long crops.
  const lastIdleResetAt = useSharedValue(0);
  const pingIdleTimer = () => {
    'worklet';
    const now = Date.now();
    if (now - lastIdleResetAt.value >= 1000) {
      lastIdleResetAt.value = now;
      runOnJS(resetIdleTimer)();
    }
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(resetIdleTimer)();
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
      pingIdleTimer();
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      runOnJS(resetIdleTimer)();
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, minScale, 4);
      pingIdleTimer();
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Whenever a new image loads or the crop frame's geometry changes
  // (orientation), make sure the image starts out covering the frame —
  // otherwise a photo whose aspect ratio doesn't already fill the (wider,
  // in landscape) frame would start below minScale and require the user to
  // manually zoom in before any crop position is actually valid.
  useEffect(() => {
    if (scale.value < minScale) {
      scale.value = minScale;
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [minScale]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleApplyCrop = useCallback(async () => {
    if (imageSize.width === 0 || imageSize.height === 0) {
      Alert.alert('Not Ready', 'Image is still loading. Please wait.');
      return;
    }
    setIsCropping(true);
    try {
      let localUri = imageUrl;

      if (imageUrl.startsWith('http')) {
        const filename = `crop_source_${Date.now()}.jpg`;
        const destPath = FileSystem.cacheDirectory + filename;
        const download = await FileSystem.downloadAsync(imageUrl, destPath);
        localUri = download.uri;
      }

      const naturalW = imageSize.width;
      const naturalH = imageSize.height;

      // Reuse the same contain-fit calculation the min-zoom floor is based
      // on, so this can never drift from what's actually on screen.
      if (!baseRendered) {
        Alert.alert('Not Ready', 'Image is still loading. Please wait.');
        return;
      }

      // Apply user pinch scale on top of the base rendered size
      const displayedImgW = baseRendered.width * scale.value;
      const displayedImgH = baseRendered.height * scale.value;

      // Image top-left in display coords (centered, then shifted by pan)
      const imgLeft = DISPLAY_W / 2 - displayedImgW / 2 + translateX.value;
      const imgTop = DISPLAY_H / 2 - displayedImgH / 2 + translateY.value;

      // Where the frame sits inside the displayed image
      // (frameLeft/frameTop come from the orientation-aware geometry above)
      const relX = frameLeft - imgLeft;
      const relY = frameTop - imgTop;

      // Map from display pixels to natural image pixels, then clamp fully
      // into [0, naturalW/H] on both ends — not just the lower bound — so a
      // pan/zoom combination that lets the frame edge fall outside the
      // image can't silently produce a shifted or out-of-range crop rect.
      const scaleToNatural = naturalW / displayedImgW;
      const rawCropW = Math.round(CROP_FRAME_W * scaleToNatural);
      const rawCropH = Math.round(CROP_FRAME_H * scaleToNatural);
      const cropX = Math.min(Math.max(0, Math.round(relX * scaleToNatural)), Math.max(0, naturalW - rawCropW));
      const cropY = Math.min(Math.max(0, Math.round(relY * scaleToNatural)), Math.max(0, naturalH - rawCropH));
      const cropW = Math.min(rawCropW, naturalW - cropX);
      const cropH = Math.min(rawCropH, naturalH - cropY);

      if (cropW <= 0 || cropH <= 0) {
        Alert.alert('Crop Error', 'Please zoom in or reposition the image inside the frame.');
        return;
      }

      const result = await ImageManipulator.manipulateAsync(
        localUri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );

      setCroppedImage(result.uri);
      router.back();
    } catch (err) {
      console.error('Crop failed:', err);
      Alert.alert('Crop Error', 'Failed to crop the image. Please try again.');
    } finally {
      setIsCropping(false);
    }
  }, [
    imageUrl,
    imageSize,
    baseRendered,
    translateX,
    translateY,
    scale,
    CROP_FRAME_W,
    CROP_FRAME_H,
    frameLeft,
    frameTop,
    setCroppedImage,
    router,
  ]);

  const handleCancel = () => {
    router.back();
  };

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={() => {
        resetIdleTimer();
        return false;
      }}
    >
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Crop Your Photo</Text>
          <Text style={styles.subtitle}>
            Pan and pinch to position your photo within the crop frame, then tap
            Apply.
          </Text>
        </View>

        {/* Crop area */}
        <View style={styles.cropContainer}>
          <GestureDetector gesture={composedGesture}>
            <View style={styles.displayArea}>
              {/* Background image (pannable/zoomable) */}
              <Animated.Image
                source={{ uri: imageUrl }}
                style={[styles.sourceImage, imageStyle]}
                resizeMode="contain"
                onLoad={(e) =>
                  setImageSize({
                    width: e.nativeEvent.source.width,
                    height: e.nativeEvent.source.height,
                  })
                }
              />

              {/* Dark overlay outside crop frame */}
              <View style={[styles.overlayTop, { height: frameTop }]} />
              <View
                style={[
                  styles.overlayBottom,
                  { height: DISPLAY_H - frameTop - CROP_FRAME_H },
                ]}
              />
              <View
                style={[
                  styles.overlayLeft,
                  { top: frameTop, width: frameLeft, height: CROP_FRAME_H },
                ]}
              />
              <View
                style={[
                  styles.overlayRight,
                  {
                    top: frameTop,
                    width: DISPLAY_W - frameLeft - CROP_FRAME_W,
                    height: CROP_FRAME_H,
                  },
                ]}
              />

              {/* Crop frame border */}
              <View
                style={[
                  styles.cropFrame,
                  { top: frameTop, left: frameLeft, width: CROP_FRAME_W, height: CROP_FRAME_H },
                ]}
              >
                {/* Corner handles */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
          </GestureDetector>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.applyBtn, isCropping && styles.applyBtnDisabled]}
            onPress={handleApplyCrop}
            disabled={isCropping}
          >
            {isCropping ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.applyText}>Apply Crop</Text>
            )}
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  background: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 500,
  },
  cropContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayArea: {
    width: DISPLAY_W,
    height: DISPLAY_H,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  sourceImage: {
    width: DISPLAY_W,
    height: DISPLAY_H,
    position: 'absolute',
  },
  // Overlay quadrants — geometry (top/left/width/height) is orientation-
  // dependent and applied as inline style overrides at render time.
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayLeft: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayRight: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.white,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    minWidth: 140,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  cancelText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    minWidth: 160,
    alignItems: 'center',
    ...SHADOW.md,
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
