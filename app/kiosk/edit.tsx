import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { PostcardBack } from '../../components/PostcardBack';
import { BubbleOption } from '../../components/BubbleOption';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { analyzePhoto } from '../../services/session';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { COLORS, FilterType } from '../../constants/theme';
import { CARD_FRAME, CARD_W_IN, CARD_H_IN } from '../../constants/postcard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SW, height: SH } = Dimensions.get('window');

// ProgressSteps (~88: paddingVertical 16*2 + border1 + 36 circle + 4 + ~15
// label line) + PostaFooter (~84: paddingVertical 16*2 + 52 logo), rounded up
// for font-metric slack — there is no ScrollView here, so this has to be
// right rather than an approximation the scroll could paper over.
const CHROME_H = 180;
// Fixed (not scale-dependent, to avoid a circular AVAIL_H <-> PANEL_SCALE
// dependency) vertical padding around the card+panel row.
const CONTENT_PAD_V = 20;
const AVAIL_H = SH - CHROME_H - CONTENT_PAD_V * 2;

// -36 accounts for cardWrapper's own padding (width/height: CARD_W/H + 36).
const SHORT_SIDE_PX = Math.min(SW * 0.42, 430, (AVAIL_H - 36) * (CARD_W_IN / CARD_H_IN));

// The panel's natural height at full spacing (padding + title + 3 sections +
// separator + 2 buttons, measured against the static styles below) — scale
// its internal spacing down on shorter screens so it always fits alongside
// the card within AVAIL_H instead of overflowing with no scroll to fall
// back on.
const PANEL_NATURAL_H = 650;
const PANEL_SCALE = Math.max(0.6, Math.min(1, AVAIL_H / PANEL_NATURAL_H));

const FILTERS = [
  { label: 'Original', value: 'original' },
  { label: 'Warm', value: 'warm' },
  { label: 'Cool', value: 'cool' },
  { label: 'Pastel', value: 'pastel' },
  { label: 'Mono', value: 'mono' },
  { label: 'Sepia', value: 'sepia' },
];

const COMING_SOON_FILTERS = ['Filter 1', 'Filter 2', 'Filter 3'];

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
    orientation,
    comingSoonFilter,
    setBrightness,
    setContrast,
    setSaturation,
    setWarmth,
    setSelectedFilter,
    setOrientation,
    setAutoDetectedOrientation,
    setComingSoonFilter,
    resetFilters,
    resetAll,
  } = useCropStore();

  const { showModal, resetIdleTimer } = useIdleActivity(() => {
    resetAll();
    router.replace('/');
  });

  const safeBrightness = typeof brightness === 'number' ? brightness : 100;
  const safeContrast = typeof contrast === 'number' ? contrast : 100;
  const safeSaturation = typeof saturation === 'number' ? saturation : 100;
  const safeWarmth = typeof warmth === 'number' ? warmth : 0;
  const LONG_SIDE_PX = SHORT_SIDE_PX * (CARD_H_IN / CARD_W_IN);
  const CARD_W = orientation === 'landscape' ? LONG_SIDE_PX : SHORT_SIDE_PX;
  const CARD_H = orientation === 'landscape' ? SHORT_SIDE_PX : LONG_SIDE_PX;
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

  // Auto-detect the photo's real orientation from its actual pixel
  // dimensions as soon as it's available, so a landscape photo doesn't
  // sit in the default portrait frame until the customer manually flips it.
  // Uses the guarded setter so this can't fire again later (e.g. on a
  // remount, or after a fresh crop) and silently stomp a manual choice.
  useEffect(() => {
    if (!imageUrl) return;
    Image.getSize(
      imageUrl,
      (width, height) => {
        setAutoDetectedOrientation(width > height ? 'landscape' : 'portrait');
      },
      (err) => console.error('Failed to read image size for orientation:', err),
    );
  }, [imageUrl, setAutoDetectedOrientation]);

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

  // Only the rotation belongs in an animated style. Width/height must stay in
  // a plain style so React lays the card out on the same commit as the
  // children that are sized from CARD_W/CARD_H — when the size lived in here,
  // Reanimated applied it on the UI thread a frame behind the children, so the
  // first frame of a flip had a portrait-sized container clipping
  // landscape-sized contents and sliced the photo and caption off on the right.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flipProgress.value * 180 + 180}deg` }],
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
        <ProgressSteps currentStep={3} />

        <View style={styles.scroll}>
          <View style={styles.mainRow}>

            {/* CARD */}
            <View style={[styles.cardWrapper, { width: CARD_W + 36, height: CARD_H + 36 }]}>
              <View style={{ width: CARD_W, height: CARD_H }}>

                {/* FRONT */}
                <Animated.View
                  style={[styles.postcard, styles.cardFace, { width: CARD_W, height: CARD_H }, frontStyle]}
                >
                  <PostcardPreview
                    uri={imageUrl}
                    filter={safeFilter}
                    brightness={safeBrightness}
                    contrast={safeContrast}
                    saturation={safeSaturation}
                    warmth={safeWarmth}
                    width={CARD_W - 16}
                    height={CARD_H - 16}
                    orientation={orientation}
                  />
                </Animated.View>

                {/* BACK */}
                <Animated.View
                  style={[styles.postcard, styles.cardFace, { width: CARD_W, height: CARD_H }, backStyle]}
                >
                  <PostcardBack
                    width={CARD_W - 16}
                    height={CARD_H - 16}
                    orientation={orientation}
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

              {/* ORIENTATION */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <MaterialCommunityIcons name="crop-portrait" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>Orientation</Text>
                </View>
                <View style={styles.bubbleRow}>
                  <BubbleOption
                    label="Portrait"
                    selected={orientation === 'portrait'}
                    onPress={() => setOrientation('portrait')}
                  />
                  <BubbleOption
                    label="Landscape"
                    selected={orientation === 'landscape'}
                    onPress={() => setOrientation('landscape')}
                  />
                </View>
              </View>

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

              {/* POSTCARD FILTERS (COMING SOON) */}
              {/* <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Ionicons name="color-palette-outline" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sectionLabel}>Postcard Filters</Text>
                </View>
                <View style={styles.bubbleRow}>
                  {COMING_SOON_FILTERS.map((f) => (
                    <BubbleOption
                      key={f}
                      label={f}
                      selected={comingSoonFilter === f}
                      onPress={() => setComingSoonFilter(f)}
                      badge="Coming Soon"
                    />
                  ))}
                </View>
              </View> */}

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
        </View>

        <PostaFooter />
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 36,
    paddingVertical: CONTENT_PAD_V,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 36 },

  cardWrapper: { position: 'relative' },
  postcard: CARD_FRAME,
  // Both faces stack on the same spot; only the rotateY differs (see frontStyle).
  cardFace: { position: 'absolute', backfaceVisibility: 'hidden' },

  imageArea: { justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888' },

  logoRow: { alignItems: 'center', marginTop: 8, paddingBottom: 4 },
  dbgLogo: { width: 80, height: 30 },

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
    padding: 28 * PANEL_SCALE,
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
    marginBottom: 22 * PANEL_SCALE,
  },

  section: { marginBottom: 22 * PANEL_SCALE },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10 * PANEL_SCALE,
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
    paddingVertical: 10 * PANEL_SCALE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
    marginBottom: 10 * PANEL_SCALE,
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

  bubbleRow: {
    flexDirection: 'row',
    gap: 24,
  },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10 * PANEL_SCALE,
  },
  filterBtn: {
    width: '30%',
    paddingVertical: 13 * PANEL_SCALE,
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

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 * PANEL_SCALE },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13 * PANEL_SCALE,
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
    marginVertical: 22 * PANEL_SCALE,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 17 * PANEL_SCALE,
    alignItems: 'center',
    marginBottom: 10 * PANEL_SCALE,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryBtn: {
    borderRadius: 9999,
    paddingVertical: 14 * PANEL_SCALE,
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