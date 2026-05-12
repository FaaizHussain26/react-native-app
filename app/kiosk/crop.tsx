import React, { useCallback, useRef, useState } from 'react';
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
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCropStore } from '../../stores/cropStore';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Crop frame matches the inner image area ratio: 3.25 × 4.75 inches
const CROP_FRAME_W = Math.min(SW * 0.35, 320);
const CROP_FRAME_H = CROP_FRAME_W * (4.75 / 3.25);

// The display area behind the crop frame
const DISPLAY_W = SW * 0.65;
const DISPLAY_H = SH * 0.75;

export default function CropScreen() {
  const router = useRouter();
  const { image: encodedImageUrl = '', session: sessionId = '' } =
    useLocalSearchParams<{ image: string; session: string }>();

  const imageUrl = decodeURIComponent(encodedImageUrl);
  const { setCroppedImage } = useCropStore();

  const [isCropping, setIsCropping] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Pan offset of the image within the display area
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Store initial values at gesture start for pan
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
    .onBegin(() => {
      startScale.value = scale.value;
    })
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

      // Calculate the actual rendered size under resizeMode="contain":
      // the image is scaled to fit DISPLAY_W x DISPLAY_H while keeping aspect ratio,
      // then centered. Ignoring this makes the crop coordinates wrong.
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

      // Apply user pinch scale on top of the base rendered size
      const displayedImgW = baseRenderedW * scale.value;
      const displayedImgH = baseRenderedH * scale.value;

      // Image top-left in display coords (centered, then shifted by pan)
      const imgLeft = DISPLAY_W / 2 - displayedImgW / 2 + translateX.value;
      const imgTop = DISPLAY_H / 2 - displayedImgH / 2 + translateY.value;

      // Crop frame is centered in the display area
      const frameLeft = (DISPLAY_W - CROP_FRAME_W) / 2;
      const frameTop = (DISPLAY_H - CROP_FRAME_H) / 2;

      // Where the frame sits inside the displayed image
      const relX = frameLeft - imgLeft;
      const relY = frameTop - imgTop;

      // Map from display pixels to natural image pixels
      const scaleToNatural = naturalW / displayedImgW;
      const cropX = Math.max(0, Math.round(relX * scaleToNatural));
      const cropY = Math.max(0, Math.round(relY * scaleToNatural));
      const cropW = Math.min(Math.round(CROP_FRAME_W * scaleToNatural), naturalW - cropX);
      const cropH = Math.min(Math.round(CROP_FRAME_H * scaleToNatural), naturalH - cropY);

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
  }, [imageUrl, imageSize, translateX, translateY, scale, setCroppedImage, router]);

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
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
              <View style={styles.overlayTop} />
              <View style={styles.overlayBottom} />
              <View style={styles.overlayLeft} />
              <View style={styles.overlayRight} />

              {/* Crop frame border */}
              <View style={styles.cropFrame}>
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
    </View>
  );
}

const frameLeft = (DISPLAY_W - CROP_FRAME_W) / 2;
const frameTop = (DISPLAY_H - CROP_FRAME_H) / 2;

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
  // Overlay quadrants
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: frameTop,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DISPLAY_H - frameTop - CROP_FRAME_H,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayLeft: {
    position: 'absolute',
    top: frameTop,
    left: 0,
    width: frameLeft,
    height: CROP_FRAME_H,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayRight: {
    position: 'absolute',
    top: frameTop,
    right: 0,
    width: DISPLAY_W - frameLeft - CROP_FRAME_W,
    height: CROP_FRAME_H,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropFrame: {
    position: 'absolute',
    top: frameTop,
    left: frameLeft,
    width: CROP_FRAME_W,
    height: CROP_FRAME_H,
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
