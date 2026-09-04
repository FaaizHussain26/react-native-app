import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCropStore, NormalizedRect } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import {
  IMAGE_AREA_IN,
  imageAreaAspect,
  MIN_CROP_DPI,
  PRINT_DPI,
} from '../../constants/postcard';
import {
  Rect,
  MODE_NONE,
  MODE_MOVE,
  CORNER_TL,
  CORNER_TR,
  CORNER_BL,
  CORNER_BR,
  maxWidthIn,
  defaultRect,
  clampToBounds,
  resizeFromCorner,
  resizeAboutCenter,
} from '../../utils/cropGeometry';

const { width: SW, height: SH } = Dimensions.get('window');

// Vertical chrome around the crop area: the header (~118 — 24 top + 16 bottom
// padding, a 28px title line, 4, then two 14px subtitle lines), the zoom row
// (~72 — 16*2 padding and a 40px slider) and the actions row (~100 — 24*2
// padding and a 52px button). Measured against the static styles below rather
// than taken as a fraction of the screen: there is no ScrollView here to
// absorb an overflow if the guess is wrong.
const CHROME_H = 290;
const DISPLAY_W = Math.min(SW * 0.7, 900);
const DISPLAY_H = Math.max(SH - CHROME_H, 260);

// Touch radius for the corner handles. Sized for a finger on a kiosk screen,
// not for the 20px the handles are drawn at.
const HANDLE_HIT_PX = 44;

// How closely a saved crop rectangle's aspect has to match the current frame's
// before we'll restore it. Anything further off means the orientation changed
// since, so the rectangle is meaningless and we start fresh.
const ASPECT_EPS = 0.02;

/** Everything the gesture worklets need to know about the current geometry. */
type Geom = { bounds: Rect; maxW: number; minW: number; aspect: number };

const clampZoom = (z: number, g: Geom) =>
  Math.min(Math.max(z, 1), Math.max(1, g.maxW / g.minW));

/**
 * Turn a saved normalized rect back into display coordinates, or null if it
 * can't be trusted any more.
 */
function restoreRect(
  nr: NormalizedRect | null,
  g: Geom,
  natural: { width: number; height: number },
): Rect | null {
  if (!nr || natural.width === 0 || natural.height === 0) return null;

  // nr.w and nr.h are fractions of *different* denominators, so they have to
  // go back to pixels before their ratio means anything.
  const srcAspect = (nr.w * natural.width) / (nr.h * natural.height);
  if (!Number.isFinite(srcAspect) || Math.abs(srcAspect - g.aspect) > ASPECT_EPS) {
    return null;
  }

  // minW may have moved since (different source, different display size), so
  // re-clamp rather than trusting the saved width.
  const w = Math.min(Math.max(nr.w * g.bounds.w, Math.min(g.minW, g.maxW)), g.maxW);
  const p = clampToBounds(
    g.bounds.x + nr.x * g.bounds.w,
    g.bounds.y + nr.y * g.bounds.h,
    w,
    g.aspect,
    g.bounds,
  );
  return { x: p.x, y: p.y, w, h: w / g.aspect };
}

export default function CropScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const {
    originalImage,
    cropRect,
    cropSourceSession,
    orientation,
    setOriginalImage,
    applyCrop,
    resetAll,
  } = useCropStore();

  // The crop rectangle's aspect is the postcard's printable image area for the
  // current orientation — the same constant the preview and the print HTML
  // derive from, so what's inside the rectangle is exactly what prints.
  const ASPECT = useMemo(() => imageAreaAspect(orientation), [orientation]);

  const [isCropping, setIsCropping] = useState(false);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const remoteUrl = sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : null;

  const { showModal, resetIdleTimer } = useIdleActivity(
    () => {
      resetAll();
      router.replace('/');
    },
    { enabled: !isCropping },
  );

  // ── Source photo ────────────────────────────────────────────────────────
  // Resolved at mount rather than at Apply time, so the pixels on screen and
  // the pixels we crop are the same bytes, Apply doesn't block on the network,
  // and a download failure surfaces before the customer has done any work.
  // Always the *original* — never the previous crop, which is what used to
  // make re-cropping compound.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (originalImage) {
        // The store no longer persists this URI, but within a session the
        // cache file can still be evicted underneath us.
        const info = await FileSystem.getInfoAsync(originalImage);
        if (cancelled) return;
        if (info.exists) {
          setSourceUri(originalImage);
          return;
        }
      }

      if (!remoteUrl) {
        setSourceError(true);
        return;
      }

      try {
        // Session-stable filename: the old code wrote a new
        // crop_source_<timestamp>.jpg on every Apply and never cleaned any of
        // them up, which grows without bound on a kiosk left running.
        const dest = `${FileSystem.cacheDirectory}crop_source_${sessionId}.jpg`;
        const dl = await FileSystem.downloadAsync(remoteUrl, dest);
        if (cancelled) return;
        setSourceUri(dl.uri);
        setOriginalImage(dl.uri);
      } catch (err) {
        console.error('Failed to download crop source:', err);
        if (!cancelled) setSourceError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [originalImage, remoteUrl, sessionId, setOriginalImage]);

  // Natural pixel dimensions, read up front so the photo can be laid out at
  // exactly its fitted rect (see `fit` below) instead of relying on
  // resizeMode="contain" rounding the same way our own math does.
  useEffect(() => {
    if (!sourceUri) return;
    let cancelled = false;
    Image.getSize(
      sourceUri,
      (width, height) => {
        if (!cancelled) setImageSize({ width, height });
      },
      (err) => {
        console.error('Failed to read crop source size:', err);
        if (!cancelled) setSourceError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sourceUri]);

  // ── Geometry ────────────────────────────────────────────────────────────
  const fit = useMemo<Geom | null>(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return null;

    // Contain-fit the photo into the display area; `bounds` is its on-screen
    // rect and the region the crop rectangle is confined to.
    const imageAspect = imageSize.width / imageSize.height;
    const displayAspect = DISPLAY_W / DISPLAY_H;
    const bw = imageAspect > displayAspect ? DISPLAY_W : DISPLAY_H * imageAspect;
    const bh = imageAspect > displayAspect ? DISPLAY_W / imageAspect : DISPLAY_H;
    const bounds: Rect = {
      x: (DISPLAY_W - bw) / 2,
      y: (DISPLAY_H - bh) / 2,
      w: bw,
      h: bh,
    };

    const maxW = maxWidthIn(bounds, ASPECT);

    // Tightest crop we allow, in display pixels: whatever MIN_CROP_DPI over
    // the printed image area works out to in source pixels, converted at the
    // display scale. Floored at three handle hit-zones across, below which the
    // corner zones would cover the whole rectangle and leave nowhere to grab
    // it to move it.
    const minSrcW = IMAGE_AREA_IN[orientation].w * MIN_CROP_DPI;
    const pxPerSrc = bounds.w / imageSize.width;
    const minW = Math.min(Math.max(minSrcW * pxPerSrc, 3 * HANDLE_HIT_PX), maxW);

    return { bounds, maxW, minW, aspect: ASPECT };
  }, [imageSize, ASPECT, orientation]);

  const zMax = fit ? Math.max(1, fit.maxW / fit.minW) : 1;

  // ── Shared values ───────────────────────────────────────────────────────
  // The gestures are rebuilt on every render, so their worklets close over
  // that render's JS values — and bounds/minW/aspect all arrive
  // asynchronously (image size, orientation). So the worklets read geometry
  // only from `geom`, never from the `fit` memo directly.
  const rect = useSharedValue<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const geom = useSharedValue<Geom | null>(null);
  const startRect = useSharedValue<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const grab = useSharedValue({ dx: 0, dy: 0 });
  const mode = useSharedValue(MODE_NONE);
  const pinchStartW = useSharedValue(0);
  const pinchCenter = useSharedValue({ x: 0, y: 0 });
  const zoomReq = useSharedValue(1);

  // JS-thread mirror of `geom`, for the slider, Reset and the apply math.
  const fitRef = useRef<Geom | null>(null);

  // Seed the rectangle once per (image, orientation) — restoring the
  // customer's last rectangle when it still applies, otherwise the default.
  // Deliberately keyed on `fit` alone: re-running when cropRect changes would
  // stomp the rectangle mid-session right after an Apply.
  useEffect(() => {
    if (!fit) return;
    fitRef.current = fit;
    geom.value = fit;

    const restored =
      cropSourceSession === sessionId ? restoreRect(cropRect, fit, imageSize) : null;
    const r = restored ?? defaultRect(fit.bounds, fit.aspect);
    rect.value = r;

    const z = clampZoom(fit.maxW / r.w, fit);
    zoomReq.value = z;
    setZoom(z);
  }, [fit]);

  // ── Idle clock ──────────────────────────────────────────────────────────
  // onUpdate fires at frame rate, so this throttles the runOnJS bridge
  // crossing to ~once/second. Without it a sustained drag only reset the clock
  // at the start of the gesture, letting the idle timer expire mid-crop.
  const lastIdleResetAt = useSharedValue(0);
  const pingIdleTimer = () => {
    'worklet';
    const now = Date.now();
    if (now - lastIdleResetAt.value >= 1000) {
      lastIdleResetAt.value = now;
      runOnJS(resetIdleTimer)();
    }
  };

  // The same throttle on the JS side, for the slider — its onValueChange runs
  // here, not in a worklet, and a long slider drag would otherwise pop the
  // idle modal.
  const lastJsIdlePingRef = useRef(0);
  const pingIdleTimerJS = useCallback(() => {
    const now = Date.now();
    if (now - lastJsIdlePingRef.current >= 1000) {
      lastJsIdlePingRef.current = now;
      resetIdleTimer();
    }
  }, [resetIdleTimer]);

  // ── Zoom slider binding ─────────────────────────────────────────────────
  // The rectangle's width is the source of truth. The slider writes a request
  // into `zoomReq` and a reaction turns it into a rect on the UI thread (no
  // React render per frame); gestures push the thumb back on release only.
  const syncZoomFromRect = useCallback((w: number) => {
    const g = fitRef.current;
    if (!g || w <= 0) return;
    const z = clampZoom(g.maxW / w, g);
    zoomReq.value = z;
    setZoom(z);
  }, []);

  useAnimatedReaction(
    () => zoomReq.value,
    (z, prev) => {
      if (prev === null || Math.abs(z - prev) < 1e-4) return;
      const g = geom.value;
      if (!g) return;
      const r = rect.value;
      rect.value = resizeAboutCenter(
        r.x + r.w / 2,
        r.y + r.h / 2,
        g.maxW / z,
        g.aspect,
        g.minW,
        g.bounds,
      );
    },
  );

  // ── Gestures ────────────────────────────────────────────────────────────
  // One pan for both moving and resizing, dispatched by hit-testing the touch
  // against the corners. Five nested detectors would need gesture refs and
  // priority wiring to do the same job.
  //
  // Note this hit-tests in onStart, not onBegin, and works off absolute
  // e.x/e.y rather than e.translationX/Y: RNGH resets a pan's translation
  // origin when the handler *activates*, which is after onBegin fires, so
  // snapshotting in onBegin and adding translations makes the handle trail the
  // finger by the activation distance. A grab offset sidesteps the question
  // entirely, and gives the right "grab it where you touched it" feel.
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onStart((e) => {
      const g = geom.value;
      if (!g) {
        mode.value = MODE_NONE;
        return;
      }
      const r = rect.value;
      startRect.value = r;

      // The hit radius shrinks with the rectangle so the four corner zones can
      // never swallow the whole interior and make "move" unreachable at
      // minimum size.
      const hit = Math.min(HANDLE_HIT_PX, Math.min(r.w, r.h) / 3);
      const cx = [r.x, r.x + r.w, r.x, r.x + r.w];
      const cy = [r.y, r.y, r.y + r.h, r.y + r.h];
      const ids = [CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR];

      let best = -1;
      let bestD = hit * hit;
      for (let i = 0; i < 4; i++) {
        const dx = e.x - cx[i];
        const dy = e.y - cy[i];
        const d = dx * dx + dy * dy;
        if (d <= bestD) {
          bestD = d;
          best = i;
        }
      }

      if (best >= 0) {
        mode.value = ids[best];
        grab.value = { dx: cx[best] - e.x, dy: cy[best] - e.y };
      } else {
        // Anywhere else moves the rectangle. Because this is a grab offset
        // rather than an absolute jump, starting outside the rectangle is
        // harmless — it just moves from where it is.
        mode.value = MODE_MOVE;
        grab.value = { dx: r.x - e.x, dy: r.y - e.y };
      }
      runOnJS(resetIdleTimer)();
    })
    .onUpdate((e) => {
      const g = geom.value;
      if (!g || mode.value === MODE_NONE) return;

      const fx = e.x + grab.value.dx;
      const fy = e.y + grab.value.dy;

      if (mode.value === MODE_MOVE) {
        const s = startRect.value;
        const p = clampToBounds(fx, fy, s.w, g.aspect, g.bounds);
        rect.value = { x: p.x, y: p.y, w: s.w, h: s.w / g.aspect };
      } else {
        rect.value = resizeFromCorner(
          mode.value,
          startRect.value,
          fx,
          fy,
          g.aspect,
          g.minW,
          g.bounds,
        );
      }
      pingIdleTimer();
    })
    .onFinalize(() => {
      mode.value = MODE_NONE;
      runOnJS(syncZoomFromRect)(rect.value.w);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      const r = rect.value;
      pinchStartW.value = r.w;
      pinchCenter.value = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      // maxPointers(1) makes RNGH cancel the pan when the second finger lands,
      // but the order of pan-cancel vs pinch-activate isn't contractual, so
      // neutralise the pan explicitly.
      mode.value = MODE_NONE;
      runOnJS(resetIdleTimer)();
    })
    .onUpdate((e) => {
      const g = geom.value;
      if (!g) return;
      const c = pinchCenter.value;
      // Spreading the fingers means "zoom in", which is a *tighter* crop and
      // therefore a smaller rectangle — hence dividing, where the old
      // image-scaling code multiplied.
      rect.value = resizeAboutCenter(
        c.x,
        c.y,
        pinchStartW.value / e.scale,
        g.aspect,
        g.minW,
        g.bounds,
      );
      pingIdleTimer();
    })
    .onFinalize(() => {
      runOnJS(syncZoomFromRect)(rect.value.w);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // ── Animated overlay ────────────────────────────────────────────────────
  // Four dim quadrants plus the frame. The corner handles stay static children
  // of the frame, so they ride along without being animated themselves.
  // Every dimension is guarded at 0: float drift at the bounds can land on
  // -0.0001, and a negative width is a hard native error on Android.
  const overlayTopStyle = useAnimatedStyle(() => ({
    height: Math.max(0, rect.value.y),
  }));
  const overlayBottomStyle = useAnimatedStyle(() => ({
    height: Math.max(0, DISPLAY_H - rect.value.y - rect.value.h),
  }));
  const overlayLeftStyle = useAnimatedStyle(() => ({
    top: rect.value.y,
    height: Math.max(0, rect.value.h),
    width: Math.max(0, rect.value.x),
  }));
  const overlayRightStyle = useAnimatedStyle(() => ({
    top: rect.value.y,
    height: Math.max(0, rect.value.h),
    width: Math.max(0, DISPLAY_W - rect.value.x - rect.value.w),
  }));
  const frameStyle = useAnimatedStyle(() => ({
    left: rect.value.x,
    top: rect.value.y,
    width: Math.max(0, rect.value.w),
    height: Math.max(0, rect.value.h),
  }));

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    const g = fitRef.current;
    if (!g) return;
    rect.value = defaultRect(g.bounds, g.aspect);
    zoomReq.value = 1;
    setZoom(1);
    resetIdleTimer();
  };

  const handleApplyCrop = useCallback(async () => {
    const g = fitRef.current;
    if (!g || !sourceUri || imageSize.width === 0 || imageSize.height === 0) {
      Alert.alert('Not Ready', 'Image is still loading. Please wait.');
      return;
    }

    setIsCropping(true);
    try {
      const r = rect.value;

      // Map the rectangle from display pixels into source pixels. The photo is
      // laid out at exactly `bounds`, so this is a single exact scale factor.
      const k = imageSize.width / g.bounds.w;
      const sx = (r.x - g.bounds.x) * k;
      const sy = (r.y - g.bounds.y) * k;

      // Width is the only free variable — height is always derived from it, so
      // the output ratio can't drift the way it could when the two axes were
      // clamped independently.
      let w = Math.min(
        r.w * k,
        imageSize.width - Math.max(0, sx),
        (imageSize.height - Math.max(0, sy)) * ASPECT,
        imageSize.width,
        imageSize.height * ASPECT,
      );
      let h = w / ASPECT;

      const ox = Math.min(Math.max(0, sx), imageSize.width - w);
      const oy = Math.min(Math.max(0, sy), imageSize.height - h);

      // Integerise: floor the origin (only ever creates room), round the
      // width, derive the height, then shrink-only guards for the half pixel
      // rounding can add.
      const originX = Math.max(0, Math.floor(ox));
      const originY = Math.max(0, Math.floor(oy));
      let outW = Math.max(1, Math.round(w));
      let outH = Math.max(1, Math.round(outW / ASPECT));
      if (originX + outW > imageSize.width) {
        outW = imageSize.width - originX;
        outH = Math.round(outW / ASPECT);
      }
      if (originY + outH > imageSize.height) {
        outH = imageSize.height - originY;
        outW = Math.round(outH * ASPECT);
      }

      if (outW <= 0 || outH <= 0) {
        Alert.alert('Crop Error', 'Could not crop that area. Please try again.');
        return;
      }

      const actions: ImageManipulator.Action[] = [
        { crop: { originX, originY, width: outW, height: outH } },
      ];

      // Cap the output at print resolution. Only `width` is passed —
      // ImageManipulator derives the other dimension to preserve the ratio, so
      // the resize can't break the aspect lock. Without this a 12MP crop ends
      // up base64-inlined into the print HTML at several megabytes.
      const maxOutW = Math.ceil(IMAGE_AREA_IN[orientation].w * PRINT_DPI);
      if (outW > maxOutW) actions.push({ resize: { width: maxOutW } });

      const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      if (Math.abs(result.width / result.height - ASPECT) > ASPECT_EPS) {
        console.warn('Crop aspect drift', result.width, result.height, ASPECT);
      }

      applyCrop({
        croppedImage: result.uri,
        originalImage: sourceUri,
        // Saved from the final integer values, so reopening the crop screen
        // restores exactly this rectangle.
        cropRect: {
          x: originX / imageSize.width,
          y: originY / imageSize.height,
          w: outW / imageSize.width,
          h: outH / imageSize.height,
        },
        session: sessionId,
      });
      router.back();
    } catch (err) {
      console.error('Crop failed:', err);
      Alert.alert('Crop Error', 'Failed to crop the image. Please try again.');
    } finally {
      setIsCropping(false);
    }
  }, [sourceUri, imageSize, ASPECT, orientation, applyCrop, sessionId, router]);

  const handleCancel = () => {
    router.back();
  };

  const isReady = !!fit && !!sourceUri;

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
            Drag the frame to move it, or drag a corner to resize. Then tap
            Apply.
          </Text>
        </View>

        {/* Crop area */}
        <View style={styles.cropContainer}>
          <GestureDetector gesture={composedGesture}>
            <View style={styles.displayArea}>
              {sourceError ? (
                <Text style={styles.statusText}>
                  Could not load your photo. Please go back and try again.
                </Text>
              ) : !isReady ? (
                <ActivityIndicator color={COLORS.white} size="large" />
              ) : (
                <>
                  {/* The photo is laid out at exactly its fitted rect, so
                      `bounds` *is* the on-screen photo rect by construction
                      rather than by agreeing with contain-fit rounding. */}
                  <Image
                    source={{ uri: sourceUri! }}
                    style={{
                      position: 'absolute',
                      left: fit!.bounds.x,
                      top: fit!.bounds.y,
                      width: fit!.bounds.w,
                      height: fit!.bounds.h,
                    }}
                    resizeMode="cover"
                  />

                  {/* Dim everything outside the crop rectangle */}
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

                  {/* Crop frame + corner handles */}
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.cropFrame, frameStyle]}
                  >
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </Animated.View>
                </>
              )}
            </View>
          </GestureDetector>
        </View>

        {/* Zoom + reset */}
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>Zoom</Text>
          <Slider
            style={styles.zoomSlider}
            minimumValue={1}
            maximumValue={zMax}
            value={zoom}
            // A source too low-res for MIN_CROP_DPI has no room to zoom at all.
            disabled={!isReady || zMax <= 1.001}
            tapToSeek
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
            onValueChange={(z) => {
              zoomReq.value = z;
              pingIdleTimerJS();
            }}
            onSlidingComplete={(z) => {
              setZoom(z);
              resetIdleTimer();
            }}
          />
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleReset}
            disabled={!isReady}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.applyBtn,
              (isCropping || !isReady) && styles.applyBtnDisabled,
            ]}
            onPress={handleApplyCrop}
            disabled={isCropping || !isReady}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: COLORS.white,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  // Overlay quadrants — geometry follows the crop rectangle, so it's applied
  // by useAnimatedStyle rather than being static here.
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
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  zoomLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  zoomSlider: {
    width: Math.min(SW * 0.4, 420),
    height: 40,
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  resetText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
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
