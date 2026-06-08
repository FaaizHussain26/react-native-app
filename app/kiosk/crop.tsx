import React, { useCallback, useState } from 'react';
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
  clamp,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCropStore } from '../../stores/cropStore';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

const CROP_FRAME_W = Math.min(SW * 0.35, 320);
const DISPLAY_W    = SW * 0.65;
const DISPLAY_H    = SH * 0.75;

// Inner image area ratios per orientation
// Portrait : 3.25in × 4.75in
// Landscape: 5in × 3in
const PORTRAIT_RATIO  = 4.75 / 3.25;
const LANDSCAPE_RATIO = 3 / 5;

export default function CropScreen() {
  const router = useRouter();
  const { image: encodedImageUrl = '', session: sessionId = '' } =
    useLocalSearchParams<{ image: string; session: string }>();

  const imageUrl = decodeURIComponent(encodedImageUrl);
  const { setCroppedImage, orientation } = useCropStore();

  const cropFrameH =
    CROP_FRAME_W * (orientation === 'landscape' ? LANDSCAPE_RATIO : PORTRAIT_RATIO);

  const frameLeft = (DISPLAY_W - CROP_FRAME_W) / 2;
  const frameTop  = (DISPLAY_H - cropFrameH) / 2;

  const [isCropping, setIsCropping] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => { startScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, 0.5, 4);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

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

      const displayAspect = DISPLAY_W / DISPLAY_H;
      const imageAspect = naturalW / naturalH;
      let baseRenderedW: number;
      let baseRenderedH: number;
      if (imageAspect > displayAspect) {
        baseRenderedW = DISPLAY_W;
        baseRenderedH = DISPLAY_W / imageAspect;
      } else {
        baseRenderedH = DISPLAY_H;
        baseRenderedW = DISPLAY_H * imageAspect;
      }

      const displayedImgW = baseRenderedW * scale.value;
      const displayedImgH = baseRenderedH * scale.value;

      const imgLeft = DISPLAY_W / 2 - displayedImgW / 2 + translateX.value;
      const imgTop  = DISPLAY_H / 2 - displayedImgH / 2 + translateY.value;

      const relX = frameLeft - imgLeft;
      const relY = frameTop  - imgTop;

      const scaleToNatural = naturalW / displayedImgW;
      const cropX = Math.max(0, Math.round(relX * scaleToNatural));
      const cropY = Math.max(0, Math.round(relY * scaleToNatural));
      const cropW = Math.min(Math.round(CROP_FRAME_W * scaleToNatural), naturalW - cropX);
      const cropH = Math.min(Math.round(cropFrameH * scaleToNatural), naturalH - cropY);

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
  }, [imageUrl, imageSize, translateX, translateY, scale, frameLeft, frameTop, cropFrameH, setCroppedImage, router]);

  const handleCancel = () => router.back();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Crop Your Photo</Text>
          <Text style={styles.subtitle}>
            Pan and pinch to position your photo within the frame, then tap Apply.
          </Text>
        </View>

        <View style={styles.cropContainer}>
          <GestureDetector gesture={composedGesture}>
            <View style={[styles.displayArea, { width: DISPLAY_W, height: DISPLAY_H }]}>
              <Animated.Image
                source={{ uri: imageUrl }}
                style={[{ width: DISPLAY_W, height: DISPLAY_H, position: 'absolute' }, imageStyle]}
                resizeMode="contain"
                onLoad={(e) =>
                  setImageSize({
                    width: e.nativeEvent.source.width,
                    height: e.nativeEvent.source.height,
                  })
                }
              />

              {/* Dark overlays around crop frame */}
              <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: frameTop }]} />
              <View style={[styles.overlay, { bottom: 0, left: 0, right: 0, height: DISPLAY_H - frameTop - cropFrameH }]} />
              <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: cropFrameH }]} />
              <View style={[styles.overlay, { top: frameTop, right: 0, width: DISPLAY_W - frameLeft - CROP_FRAME_W, height: cropFrameH }]} />

              {/* Crop frame */}
              <View
                style={[
                  styles.cropFrame,
                  { top: frameTop, left: frameLeft, width: CROP_FRAME_W, height: cropFrameH },
                ]}
              >
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
          </GestureDetector>
        </View>

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
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
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
  applyBtnDisabled: { opacity: 0.6 },
  applyText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
