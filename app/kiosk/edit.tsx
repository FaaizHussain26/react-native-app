import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, FilterType } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SW } = Dimensions.get('window');

const CARD_W = Math.min(SW * 0.3, 310);

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Original', value: 'original' },
  { label: 'Warm', value: 'warm' },
  { label: 'Cool', value: 'cool' },
  { label: 'Pastel', value: 'pastel' },
  { label: 'Mono', value: 'mono' },
  { label: 'Sepia', value: 'sepia' },
  { label: 'Kodak Gold', value: 'kodakgold' },
  { label: 'Portra 160 Light', value: 'portra160light' },
  { label: 'Portra 160 Dark', value: 'portra160dark' },
];

export default function EditScreen() {
  const router = useRouter();

  const params = useLocalSearchParams();
  const sessionId =
    typeof params.session === 'string' ? params.session : '';

  const {
    croppedImage,
    brightness,
    selectedFilter,
    orientation,
    setBrightness,
    setSelectedFilter,
    setOrientation,
    resetFilters,
    resetAll,
  } = useCropStore();

  const safeBrightness = typeof brightness === 'number' ? brightness : 100;
  const safeFilter = selectedFilter || 'original';

  const [isFlipped, setIsFlipped] = useState(false);
  const flipProgress = useSharedValue(0);

  const remoteImageUrl = sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : null;
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (croppedImage || !remoteImageUrl) return;
    const dest = `${FileSystem.cacheDirectory}session_image_${sessionId}.jpg`;
    FileSystem.downloadAsync(remoteImageUrl, dest)
      .then((res) => setCachedImageUri(res.uri))
      .catch(() => setCachedImageUri(remoteImageUrl));
  }, [remoteImageUrl, croppedImage, sessionId]);

  const imageUrl = croppedImage ?? cachedImageUri;

  // Card height changes with orientation
  const cardH =
    orientation === 'landscape'
      ? CARD_W * (4.25 / 6)
      : CARD_W * (6 / 4.25);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: CARD_W,
    height: cardH,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180 + 180}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: CARD_W,
    height: cardH,
  }));

  const handleFlip = () => {
    const next = isFlipped ? 0 : 1;
    setIsFlipped(!isFlipped);
    flipProgress.value = withTiming(next, { duration: 600 });
  };

  const handleCrop = () => {
    const cropSource = croppedImage ?? remoteImageUrl;
    if (!cropSource) return;
    const encodedUrl = encodeURIComponent(cropSource);
    router.push(`/kiosk/crop?image=${encodedUrl}&session=${sessionId}`);
  };

  const handleNext = () => {
    router.push(`/kiosk/review?session=${sessionId}`);
  };

  const handleBack = async () => {
    resetAll();
    await AsyncStorage.removeItem('lastSessionId');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <ProgressSteps currentStep={3} />

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.mainRow}>

            {/* CARD */}
            <View style={[styles.cardWrapper, { width: CARD_W + 36, height: cardH + 36 }]}>
              <View style={{ width: CARD_W, height: cardH }}>

                {/* FRONT */}
                <Animated.View style={frontStyle}>
                  <PostcardPreview
                    uri={imageUrl}
                    filter={safeFilter}
                    brightness={safeBrightness}
                    width={CARD_W}
                    orientation={orientation}
                  />
                </Animated.View>

                {/* BACK */}
                <Animated.View style={[styles.postcard, backStyle]}>
                  <Image
                    source={require('../../assets/images/back-side-1.png')}
                    style={{ width: CARD_W - 16, height: cardH - 16, borderRadius: 6 }}
                    resizeMode="stretch"
                  />
                </Animated.View>
              </View>

              {/* FLIP button */}
              <TouchableOpacity onPress={handleFlip} style={styles.flipButton}>
                <MaterialCommunityIcons name="book-open-outline" size={26} color={COLORS.textPrimary} />
                <Text style={styles.flipLabel}>
                  {isFlipped ? 'View Front' : 'View Back'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PANEL */}
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Edit Your Photo</Text>

              {/* ORIENTATION */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>Orientation</Text>
                </View>
                <View style={styles.orientRow}>
                  {(['portrait', 'landscape'] as const).map((o) => (
                    <TouchableOpacity
                      key={o}
                      style={[
                        styles.orientBtn,
                        orientation === o ? styles.orientBtnActive : styles.orientBtnInactive,
                      ]}
                      onPress={() => setOrientation(o)}
                    >
                      <Text
                        style={[
                          styles.orientLabel,
                          orientation === o ? styles.orientLabelActive : styles.orientLabelInactive,
                        ]}
                      >
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* FILTERS */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Ionicons name="sparkles" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>Filters</Text>
                </View>
                <View style={styles.filterGrid}>
                  {FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f.value}
                      style={[
                        styles.filterBtn,
                        safeFilter === f.value
                          ? styles.filterBtnActive
                          : styles.filterBtnInactive,
                      ]}
                      onPress={() => setSelectedFilter(f.value)}
                    >
                      <Text
                        style={[
                          styles.filterLabel,
                          safeFilter === f.value
                            ? styles.filterLabelActive
                            : styles.filterLabelInactive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BRIGHTNESS */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Feather name="sun" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>
                    Brightness: {safeBrightness}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={150}
                  step={1}
                  value={safeBrightness}
                  onValueChange={(val) =>
                    typeof val === 'number' && setBrightness(val)
                  }
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor="#FFFFFF"
                />
              </View>

              {/* QUICK ACTIONS */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Quick Actions</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCrop}>
                    <Feather name="crop" size={15} color={COLORS.textPrimary} />
                    <Text style={styles.actionLabel}>Crop Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={resetFilters}>
                    <Feather name="refresh-cw" size={15} color={COLORS.textPrimary} />
                    <Text style={styles.actionLabel}>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.separator} />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Save and Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <PostaFooter />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scroll: { padding: 20, alignItems: 'center' },
  mainRow: { flexDirection: 'row', gap: 20 },

  cardWrapper: { position: 'relative' },
  postcard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  flipButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  flipLabel: { fontSize: 9, color: COLORS.textPrimary, fontWeight: '500', marginTop: 3 },

  panel: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  section: { marginBottom: 14 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  orientRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orientBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  orientBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  orientBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
  },
  orientLabel: { fontSize: 14, fontWeight: '600' },
  orientLabelActive: { color: '#FFFFFF' },
  orientLabelInactive: { color: COLORS.muted },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
  },
  filterLabel: { fontSize: 13, fontWeight: '500' },
  filterLabelActive: { color: '#FFFFFF' },
  filterLabelInactive: { color: COLORS.muted },

  slider: { width: '100%', height: 36, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryBtn: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
