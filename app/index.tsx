import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import PostaFooter from '../components/PostaFooter';
import { useCreateSession } from '../hooks/useCreateSession';
import { COLORS, SPACING } from '../constants/theme';

const POSTCARD_RATIO = 1944 / 2080;
const FOOTER_HEIGHT_EST = 84;

export default function HomeScreen() {
  const router = useRouter();
  const { width: SW, height: SH } = useWindowDimensions();
  const [isStarting, setIsStarting] = useState(false);
  const [rowLayout, setRowLayout] = useState({ width: 0, height: 0 });
  const createSessionMutation = useCreateSession();

  const btnSize = Math.min(SW * 0.4, 380);
  const imgW = Math.min(SW * 1, 500);
  const imgH = Math.min(SH * 0.55, 420);

  const isPortrait = SH >= SW;
  const headlineFontSizeEst = Math.min(SW * 0.045, 48);
  const headlineBlockH = headlineFontSizeEst * 2.4 + SPACING.xxl + SPACING.xl;
  const availableRowH = Math.max(SH - FOOTER_HEIGHT_EST - headlineBlockH, 320);
  const imgHPortrait = Math.min(availableRowH * 0.58, (SW * 0.62) / POSTCARD_RATIO);
  const imgWPortrait = imgHPortrait * POSTCARD_RATIO;
  // Landscape image size is derived from the row's real measured height (via onLayout)
  // rather than the availableRowH estimate, so it can never overflow past the row's
  // actual on-screen bounds.
  const measuredRowH = rowLayout.height || availableRowH;
  const measuredRowW = rowLayout.width || SW;
  const maxImgWLandscape = measuredRowW * 0.5;
  const imgHLandscape = Math.min(measuredRowH, maxImgWLandscape / POSTCARD_RATIO);
  const imgWLandscape = imgHLandscape * POSTCARD_RATIO;
  const btnSizePortrait = Math.max(160, Math.min(SW * 0.55, 340));
  const activeBtnSize = isPortrait ? btnSizePortrait : btnSize;

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);

    try {
      const data = await createSessionMutation.mutateAsync();

      if (!data?.token) {
        Alert.alert(
          'Error',
          'Something went wrong starting your session. Please try again.',
        );
        return;
      }

      router.push(`/kiosk/qr?session=${data.token}`);
    } catch(e) {
      console.log('error :',e)
      Alert.alert(
        'Connection Error',
        'Unable to connect to the kiosk service. Please call a staff member.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.content}>
          <Text style={[styles.headline, { fontSize: Math.min(SW * 0.045, 48) }]}>
            Turn your photo into a postcard!
          </Text>

          <View
            style={[styles.row, isPortrait && styles.rowPortrait]}
            onLayout={(e) => setRowLayout(e.nativeEvent.layout)}
          >
            {/* Left: postcard image */}
            <Image
              source={require('../assets/images/postcard_pic.png')}
              style={
                isPortrait
                  ? { width: imgWPortrait, height: imgHPortrait, resizeMode: 'contain', borderWidth: 0 }
                  : { width: imgWLandscape, height: imgHLandscape, resizeMode: 'contain', borderWidth: 0, alignSelf: 'flex-end' }
              }
              resizeMode="contain"
            />

            {/* Right: start button + price */}
            <View style={styles.rightCol}>
              {isStarting ? (
                <View style={[styles.loadingContainer, { width: activeBtnSize, height: activeBtnSize }]}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Starting session…</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleStart}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../assets/images/start_button.png')}
                    style={{ width: activeBtnSize, height: activeBtnSize }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}

              <Text style={[styles.price, { fontSize: Math.min(SW * 0.03, 32) }]}>
                Price: $3.50
              </Text>
            </View>
          </View>
        </View>

        <PostaFooter />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md ,
  },
  headline: {
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flex:1,
  // paddingHorizontal:'1%',
  // borderWidth:1
  },
  rowPortrait: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  rightCol: {
    alignItems: 'center',
    gap: SPACING.lg,
  },
  price: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
