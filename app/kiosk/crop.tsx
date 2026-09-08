import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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

// The display area is measured at layout time rather than derived from
// Dimensions.get('window') at module scope: on a kiosk iPad that module-level
// read happens before the app settles into landscape, so it returns the
// portrait dimensions and the box comes out taller than the screen — pushing
// the header off the top and the buttons onto the photo.

// Touch target for a corner handle, and half of it — the handle is centred
// on its corner, so its visual marker sits at HANDLE_HIT / 2.
const HANDLE_HIT = 44;
const HANDLE_HALF = HANDLE_HIT / 2;

// Smallest the crop frame may be shrunk to, on its shorter side. Anything
// below this is both hard to grab and too low-resolution to print well.
const MIN_SHORT_SIDE = 80;

export default function CropScreen() {
  const router = useRouter();
  const { image: encodedImageUrl = '', session: sessionId = '' } =
    useLocalSearchParams<{ image: string; session: string }>();

  const imageUrl = decodeURIComponent(encodedImageUrl);
  const { setCroppedImage, resetAll, orientation } = useCropStore();

  const [isCropping, setIsCropping] = useState(false);

  // Measured size of the area available between the header and the buttons.
  const [{ width: DISPLAY_W, height: DISPLAY_H }, setDisplayArea] = useState({
    width: 0,
    height: 0,
  });
  const onDisplayLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDisplayArea((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  // The photo is resolved to a local file up front, and its true pixel
  // dimensions read from that file with Image.getSize.
  //
  // Image's onLoad event can't be used for this: RN downsamples a remote
  // image to the size of the view showing it, so nativeEvent.source reports
  // the *decoded* size (a few hundred px) rather than the file's real size.
  // The crop rect is computed by scaling display coordinates up by
  // naturalW / displayedW, so an under-reported natural width collapsed that
  // factor to ~1 and turned the frame's on-screen offset into a tiny rect in
  // the far corner of the actual photo. Measuring the same file that
  // ImageManipulator will open keeps the two in one coordinate space.
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let uri = imageUrl;
        if (imageUrl.startsWith('http')) {
          const dest = `${FileSystem.cacheDirectory}crop_source_${Date.now()}.jpg`;
          const download = await FileSystem.downloadAsync(imageUrl, dest);
          uri = download.uri;
        }
        if (cancelled) return;

        Image.getSize(
          uri,
          (width, height) => {
            if (cancelled) return;
            setImageSize({ width, height });
            setSourceUri(uri);
          },
          (err) => {
            console.error('Failed to measure crop source:', err);
            if (!cancelled) setLoadFailed(true);
          },
        );
      } catch (err) {
        console.error('Failed to prepare crop source:', err);
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Where the source image actually lands inside the display area under
  // resizeMode="contain" (letterboxed, centred). This is both the region the
  // crop frame is confined to and the reference frame handleApplyCrop maps
  // display pixels back to natural image pixels with, so the two can never
  // drift apart.
  const imageBounds = useMemo(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return null;
    if (DISPLAY_W === 0 || DISPLAY_H === 0) return null;
    const displayAspect = DISPLAY_W / DISPLAY_H;
    const imageAspect = imageSize.width / imageSize.height;
    const width = imageAspect > displayAspect ? DISPLAY_W : DISPLAY_H * imageAspect;
    const height = imageAspect > displayAspect ? DISPLAY_W / imageAspect : DISPLAY_H;
    return {
      width,
      height,
      left: (DISPLAY_W - width) / 2,
      top: (DISPLAY_H - height) / 2,
    };
  }, [imageSize, DISPLAY_W, DISPLAY_H]);

  // Until the image reports its dimensions, confine the frame to the whole
  // display area so the gestures below never have to special-case a null.
  const bounds = imageBounds ?? { left: 0, top: 0, width: DISPLAY_W, height: DISPLAY_H };

  // The frame is locked to the aspect ratio of the postcard's actual front-
  // image area for the current orientation. Both the preview
  // (PostcardPreview, xMidYMid slice) and the print HTML (payment.tsx,
  // object-fit: cover) drop the crop into that fixed slot and center-crop
  // whatever doesn't fit — so a free-shape crop gets silently sliced a second
  // time, and a wide selection comes back as a narrow strip. Locking the
  // ratio here is what makes the frame WYSIWYG all the way to the printer.
  const aspect = useMemo(() => {
    const pageWidthIn = orientation === 'landscape' ? CARD_H_IN : CARD_W_IN;
    const pageHeightIn = orientation === 'landscape' ? CARD_W_IN : CARD_H_IN;
    const innerWIn = pageWidthIn - 2 * BORDER_IN;
    const innerHIn = pageHeightIn - BORDER_IN - BOTTOM_IN;
    return innerWIn / innerHIn;
  }, [orientation]);

  // Minimum frame size, expressed on whichever side is the shorter one for
  // this ratio, so MIN_SHORT_SIDE means the same thing in both orientations.
  const minW = aspect >= 1 ? MIN_SHORT_SIDE * aspect : MIN_SHORT_SIDE;

  const { showModal, resetIdleTimer } = useIdleActivity(
    () => {
      resetAll();
      router.replace('/');
    },
    { enabled: !isCropping },
  );

  // The crop frame itself, in display-area coordinates.
  const cropX = useSharedValue(0);
  const cropY = useSharedValue(0);
  const cropW = useSharedValue(0);
  const cropH = useSharedValue(0);

  // Frame geometry captured at gesture start, so every update is computed
  // from the original rect rather than accumulating rounding drift.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);

  // Last time (UI thread) we pinged the idle clock from an in-progress
  // gesture. onUpdate fires at frame rate, so this throttles the runOnJS
  // bridge crossing to ~once/second instead of every frame — without it, a
  // sustained drag only reset the clock at onBegin, letting the idle timer
  // expire mid-gesture on long crops.
  const lastIdleResetAt = useSharedValue(0);
  const pingIdleTimer = () => {
    'worklet';
    const now = Date.now();
    if (now - lastIdleResetAt.value >= 1000) {
      lastIdleResetAt.value = now;
      runOnJS(resetIdleTimer)();
    }
  };

  // Start with the largest frame of the locked ratio that fits the image, so
  // the default crop keeps as much of the photo (and as many pixels) as the
  // postcard shape allows. Re-runs when the photo loads or the customer
  // flips orientation, both of which change what "largest fit" means.
  useEffect(() => {
    let w = bounds.width;
    let h = w / aspect;
    if (h > bounds.height) {
      h = bounds.height;
      w = h * aspect;
    }
    cropW.value = w;
    cropH.value = h;
    cropX.value = bounds.left + (bounds.width - w) / 2;
    cropY.value = bounds.top + (bounds.height - h) / 2;
  }, [bounds.left, bounds.top, bounds.width, bounds.height, aspect]);

  // Drag the whole frame, clamped so it can never leave the photo.
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = cropX.value;
          startY.value = cropY.value;
          runOnJS(resetIdleTimer)();
        })
        .onUpdate((e) => {
          cropX.value = clamp(
            startX.value + e.translationX,
            bounds.left,
            bounds.left + bounds.width - cropW.value,
          );
          cropY.value = clamp(
            startY.value + e.translationY,
            bounds.top,
            bounds.top + bounds.height - cropH.value,
          );
          pingIdleTimer();
        }),
    [bounds.left, bounds.top, bounds.width, bounds.height],
  );

  // One resize gesture per corner. The opposite corner stays anchored, the
  // dragged corner follows the finger, and the ratio stays locked: the width
  // and height the finger implies are projected back onto the aspect line,
  // then clamped to the minimum size and to whatever room is left between the
  // anchor and the edge of the photo.
  const makeResizeGesture = useCallback(
    (growsRight: boolean, growsDown: boolean) =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = cropX.value;
          startY.value = cropY.value;
          startW.value = cropW.value;
          startH.value = cropH.value;
          runOnJS(resetIdleTimer)();
        })
        .onUpdate((e) => {
          const right = bounds.left + bounds.width;
          const bottom = bounds.top + bounds.height;
          const anchorRight = startX.value + startW.value;
          const anchorBottom = startY.value + startH.value;

          // What the finger asks for, before the ratio is enforced.
          const rawW = growsRight
            ? startW.value + e.translationX
            : startW.value - e.translationX;
          const rawH = growsDown
            ? startH.value + e.translationY
            : startH.value - e.translationY;

          // Room left before the frame would run off the photo, measured from
          // the anchored corner.
          const maxW = growsRight ? right - startX.value : anchorRight - bounds.left;
          const maxH = growsDown ? bottom - startY.value : anchorBottom - bounds.top;

          // Project onto the locked ratio, then clamp on the width axis only
          // (height follows), so both edges' limits are respected at once.
          const projected = (rawW + rawH * aspect) / 2;
          const upper = Math.max(minW, Math.min(maxW, maxH * aspect));
          const w = clamp(projected, minW, upper);
          const h = w / aspect;

          cropW.value = w;
          cropH.value = h;
          cropX.value = growsRight ? startX.value : anchorRight - w;
          cropY.value = growsDown ? startY.value : anchorBottom - h;
          pingIdleTimer();
        }),
    [bounds.left, bounds.top, bounds.width, bounds.height, aspect, minW],
  );

  const tlGesture = useMemo(() => makeResizeGesture(false, false), [makeResizeGesture]);
  const trGesture = useMemo(() => makeResizeGesture(true, false), [makeResizeGesture]);
  const blGesture = useMemo(() => makeResizeGesture(false, true), [makeResizeGesture]);
  const brGesture = useMemo(() => makeResizeGesture(true, true), [makeResizeGesture]);

  const frameStyle = useAnimatedStyle(() => ({
    left: cropX.value,
    top: cropY.value,
    width: cropW.value,
    height: cropH.value,
  }));

  // Scrim quadrants around the frame, so everything outside the crop dims.
  const overlayTopStyle = useAnimatedStyle(() => ({ height: cropY.value }));
  const overlayBottomStyle = useAnimatedStyle(() => ({
    top: cropY.value + cropH.value,
  }));
  const overlayLeftStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    height: cropH.value,
    width: cropX.value,
  }));
  const overlayRightStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    height: cropH.value,
    left: cropX.value + cropW.value,
  }));

  const tlStyle = useAnimatedStyle(() => ({
    left: cropX.value - HANDLE_HALF,
    top: cropY.value - HANDLE_HALF,
  }));
  const trStyle = useAnimatedStyle(() => ({
    left: cropX.value + cropW.value - HANDLE_HALF,
    top: cropY.value - HANDLE_HALF,
  }));
  const blStyle = useAnimatedStyle(() => ({
    left: cropX.value - HANDLE_HALF,
    top: cropY.value + cropH.value - HANDLE_HALF,
  }));
  const brStyle = useAnimatedStyle(() => ({
    left: cropX.value + cropW.value - HANDLE_HALF,
    top: cropY.value + cropH.value - HANDLE_HALF,
  }));

  const handleApplyCrop = useCallback(async () => {
    if (!imageBounds || !sourceUri) {
      Alert.alert('Not Ready', 'Image is still loading. Please wait.');
      return;
    }
    setIsCropping(true);
    try {
      const naturalW = imageSize.width;
      const naturalH = imageSize.height;

      // The photo never moves, so mapping the frame back to natural pixels is
      // just its offset inside the contain-fit rect, scaled up. Both axes use
      // their own scale factor; they're equal in exact arithmetic, but that
      // keeps a rounded bound from skewing the other axis.
      const scaleX = naturalW / imageBounds.width;
      const scaleY = naturalH / imageBounds.height;

      const rawCropW = Math.round(cropW.value * scaleX);
      const rawCropH = Math.round(cropH.value * scaleY);

      // The frame is already clamped to the photo, so this is a guard against
      // rounding at the edges rather than a real repositioning.
      const cropX0 = Math.min(
        Math.max(0, Math.round((cropX.value - imageBounds.left) * scaleX)),
        Math.max(0, naturalW - rawCropW),
      );
      const cropY0 = Math.min(
        Math.max(0, Math.round((cropY.value - imageBounds.top) * scaleY)),
        Math.max(0, naturalH - rawCropH),
      );
      const finalW = Math.min(rawCropW, naturalW - cropX0);
      const finalH = Math.min(rawCropH, naturalH - cropY0);

      if (finalW <= 0 || finalH <= 0) {
        Alert.alert('Crop Error', 'Please resize or reposition the crop frame.');
        return;
      }

      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ crop: { originX: cropX0, originY: cropY0, width: finalW, height: finalH } }],
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
  }, [sourceUri, imageSize, imageBounds, setCroppedImage, router]);

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
            Drag the frame to choose what to keep, and pull a corner to resize
            it. Then tap Apply.
          </Text>
        </View>

        {/* Crop area — sized from its own layout, so it can never exceed the
            space left between the header and the buttons. */}
        <View style={styles.cropContainer}>
          {/* Measured after the container's padding, so the reported size is
              exactly what the display area may occupy. */}
          <View style={styles.cropMeasure} onLayout={onDisplayLayout}>
            <View style={[styles.displayArea, { width: DISPLAY_W, height: DISPLAY_H }]}>
              {sourceUri && imageBounds ? (
                <>
                  {/* The photo stays put — only the frame moves. */}
                  <Image
                    source={{ uri: sourceUri }}
                    style={styles.sourceImage}
                    resizeMode="contain"
                  />

                  {/* Dark scrim outside the crop frame */}
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.overlayTop, overlayTopStyle]}
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.overlayBottom, overlayBottomStyle]}
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.overlayLeft, overlayLeftStyle]}
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.overlayRight, overlayRightStyle]}
                  />

                  {/* Draggable crop frame */}
                  <GestureDetector gesture={dragGesture}>
                    <Animated.View style={[styles.cropFrame, frameStyle]}>
                      <View pointerEvents="none" style={[styles.gridLine, styles.gridV1]} />
                      <View pointerEvents="none" style={[styles.gridLine, styles.gridV2]} />
                      <View pointerEvents="none" style={[styles.gridLine, styles.gridH1]} />
                      <View pointerEvents="none" style={[styles.gridLine, styles.gridH2]} />
                    </Animated.View>
                  </GestureDetector>

                  {/* Corner handles. Siblings of the frame rather than children,
                      so a touch near a corner hits the handle only and never
                      also starts a frame drag. */}
                  <GestureDetector gesture={tlGesture}>
                    <Animated.View style={[styles.handle, tlStyle]}>
                      <View style={[styles.handleMark, styles.handleMarkTL]} />
                    </Animated.View>
                  </GestureDetector>
                  <GestureDetector gesture={trGesture}>
                    <Animated.View style={[styles.handle, trStyle]}>
                      <View style={[styles.handleMark, styles.handleMarkTR]} />
                    </Animated.View>
                  </GestureDetector>
                  <GestureDetector gesture={blGesture}>
                    <Animated.View style={[styles.handle, blStyle]}>
                      <View style={[styles.handleMark, styles.handleMarkBL]} />
                    </Animated.View>
                  </GestureDetector>
                  <GestureDetector gesture={brGesture}>
                    <Animated.View style={[styles.handle, brStyle]}>
                      <View style={[styles.handleMark, styles.handleMarkBR]} />
                    </Animated.View>
                  </GestureDetector>
                </>
              ) : (
                <View style={styles.loading}>
                  {loadFailed ? (
                    <Text style={styles.loadingText}>
                      Couldn't load your photo. Please go back and try again.
                    </Text>
                  ) : (
                    <ActivityIndicator color={COLORS.white} size="large" />
                  )}
                </View>
              )}
            </View>
          </View>
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
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  cropMeasure: {
    flex: 1,
    alignSelf: 'stretch',
  },
  displayArea: {
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 15,
    textAlign: 'center',
  },
  sourceImage: {
    ...StyleSheet.absoluteFillObject,
  },
  // Scrim quadrants — the edges that track the crop frame are animated
  // inline; these are the edges that stay pinned to the display area.
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
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  gridV1: { top: 0, bottom: 0, left: '33.33%', width: 1 },
  gridV2: { top: 0, bottom: 0, left: '66.66%', width: 1 },
  gridH1: { left: 0, right: 0, top: '33.33%', height: 1 },
  gridH2: { left: 0, right: 0, top: '66.66%', height: 1 },
  handle: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
  },
  // The marker sits at the centre of the hit area, which is the frame corner.
  handleMark: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: COLORS.white,
  },
  handleMarkTL: {
    top: HANDLE_HALF - 3,
    left: HANDLE_HALF - 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  handleMarkTR: {
    top: HANDLE_HALF - 3,
    right: HANDLE_HALF - 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  handleMarkBL: {
    bottom: HANDLE_HALF - 3,
    left: HANDLE_HALF - 3,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  handleMarkBR: {
    bottom: HANDLE_HALF - 3,
    right: HANDLE_HALF - 3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
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
