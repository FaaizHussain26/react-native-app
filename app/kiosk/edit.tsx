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
import { analyzePhoto } from '../../services/session';
import { COLORS, FilterType } from '../../constants/theme';
import { CARD_FRAME } from '../../constants/postcard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SW } = Dimensions.get('window');

const CARD_W = Math.min(SW * 0.42, 430);
const CARD_H = CARD_W * (6 / 4.25);

const FILTERS = [
  { label: 'Original', value: 'original' },
  { label: 'Warm', value: 'warm' },
  { label: 'Cool', value: 'cool' },
  { label: 'Pastel', value: 'pastel' },
  { label: 'Mono', value: 'mono' },
  { label: 'Sepia', value: 'sepia' },
];

export default function EditScreen() {
  const router = useRouter();

  // ✅ SAFE PARAM HANDLING
  const params = useLocalSearchParams();
  const sessionId =
    typeof params.session === 'string' ? params.session : '';

  const {
    croppedImage,
    brightness,
    contrast,
    saturation,
    warmth,
    selectedFilter,
    setBrightness,
    setContrast,
    setSaturation,
    setWarmth,
    setSelectedFilter,
    resetFilters,
    resetAll,
  } = useCropStore();

  const safeBrightness = typeof brightness === 'number' ? brightness : 100;
  const safeContrast = typeof contrast === 'number' ? contrast : 100;
  const safeSaturation = typeof saturation === 'number' ? saturation : 100;
  const safeWarmth = typeof warmth === 'number' ? warmth : 0;
  const safeFilter = selectedFilter || 'original';

  const [isFlipped, setIsFlipped] = useState(false);
  const flipProgress = useSharedValue(0);

  // Remote URL for the session image
  const remoteImageUrl = sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : null;

  // Local cached URI — SvgImage on Android doesn't reliably load remote HTTPS URLs
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (croppedImage || !remoteImageUrl) return;
    const dest = `${FileSystem.cacheDirectory}session_image_${sessionId}.jpg`;
    FileSystem.downloadAsync(remoteImageUrl, dest)
      .then((res) => setCachedImageUri(res.uri))
      .catch(() => setCachedImageUri(remoteImageUrl)); // fall back to remote on error
  }, [remoteImageUrl, croppedImage, sessionId]);

  const imageUrl = croppedImage ?? cachedImageUri;

  // AI-recommended filter — customer taps a button to analyze the photo,
  // and the suggestion is applied automatically once the response comes back.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendedFilter, setAiRecommendedFilter] = useState<FilterType | null>(null);

  const handleAnalyzePhoto = () => {
    if (!sessionId || isAnalyzing) return;

    setIsAnalyzing(true);
    analyzePhoto(sessionId)
      .then((result) => {
        console.log('AI recommendation received:', result);
        setSelectedFilter(result.filter);
        setBrightness(result.brightness);
        setContrast(result.contrast);
        setSaturation(result.saturation);
        setWarmth(result.warmth);
        setAiRecommendedFilter(result.filter);
      })
      .catch((err) => console.error('Photo analysis failed:', err))
      .finally(() => setIsAnalyzing(false));
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180 + 180}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
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

console.log("imgUrl:",imageUrl) 
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
            <View style={[styles.cardWrapper, { width: CARD_W + 36, height: CARD_H + 36 }]}>
              <View style={{ width: CARD_W, height: CARD_H }}>

                {/* FRONT */}
                <Animated.View style={[styles.postcard, frontStyle]}>
                  <PostcardPreview
                    uri={imageUrl}
                    filter={safeFilter}
                    brightness={safeBrightness}
                    contrast={safeContrast}
                    saturation={safeSaturation}
                    warmth={safeWarmth}
                    width={CARD_W - 16}
                  />
                </Animated.View>

                {/* BACK */}
                <Animated.View style={[styles.postcard, backStyle]}>
                  <Image
                    source={require('../../assets/images/back-side-1.png')}
                    style={styles.backImage}
                    resizeMode="stretch"
                  />
                </Animated.View>
              </View>

              {/* FLIP — floating circle bottom-right */}
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

              {/* FILTERS */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Ionicons name="sparkles" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>Filters</Text>
                </View>

                <TouchableOpacity
                  style={[styles.aiRecommendBtn, isAnalyzing && styles.btnDisabled]}
                  onPress={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                  <Text style={styles.aiRecommendText}>
                    {isAnalyzing ? 'Analyzing photo…' : 'Get AI Filter Recommendation'}
                  </Text>
                </TouchableOpacity>

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
                      onPress={() => setSelectedFilter(f.value as FilterType)}
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
                      {aiRecommendedFilter === f.value && (
                        <Text
                          style={[
                            styles.aiBadge,
                            safeFilter === f.value && styles.aiBadgeActive,
                          ]}
                        >
                          AI Recommended
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ADJUSTMENTS */}
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
                  onValueChange={(val) => {
                    if (typeof val !== 'number') return;
                    setBrightness(val);
                  }}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor="#FFFFFF"
                />

                <View style={[styles.sectionLabelRow, styles.adjustmentLabelRow]}>
                  <Feather name="circle" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>
                    Contrast: {safeContrast}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={150}
                  step={1}
                  value={safeContrast}
                  onValueChange={(val) => {
                    if (typeof val !== 'number') return;
                    setContrast(val);
                  }}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor="#FFFFFF"
                />

                <View style={[styles.sectionLabelRow, styles.adjustmentLabelRow]}>
                  <Feather name="droplet" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>
                    Saturation: {safeSaturation}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={200}
                  step={1}
                  value={safeSaturation}
                  onValueChange={(val) => {
                    if (typeof val !== 'number') return;
                    setSaturation(val);
                  }}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor="#FFFFFF"
                />

                <View style={[styles.sectionLabelRow, styles.adjustmentLabelRow]}>
                  <Feather name="thermometer" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>
                    Warmth: {safeWarmth > 0 ? `+${safeWarmth}` : safeWarmth}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={-30}
                  maximumValue={30}
                  step={1}
                  value={safeWarmth}
                  onValueChange={(val) => {
                    if (typeof val !== 'number') return;
                    setWarmth(val);
                  }}
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
  scroll: { flexGrow: 1, padding: 36, alignItems: 'center', justifyContent: 'center' },
  mainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 36 },

  cardWrapper: { position: 'relative' },
  postcard: CARD_FRAME,

  imageArea: { justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888' },

  logoRow: { alignItems: 'center', marginTop: 8, paddingBottom: 4 },
  dbgLogo: { width: 80, height: 30 },

  backImage: { width: CARD_W - 16, height: CARD_H - 16, borderRadius: 6 },

  flipButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
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
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 22,
  },

  section: { marginBottom: 22 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  adjustmentLabelRow: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  aiRecommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  aiRecommendText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  btnDisabled: { opacity: 0.6 },
  aiBadge: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  aiBadgeActive: {
    color: '#FFFFFF',
  },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterBtn: {
    width: '30%',
    paddingVertical: 13,
    borderRadius: 10,
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
  filterLabel: { fontSize: 14, fontWeight: '500' },
  filterLabelActive: { color: '#FFFFFF' },
  filterLabelInactive: { color: COLORS.muted },

  slider: { width: '100%', height: 36, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
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
    marginVertical: 22,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 10,
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