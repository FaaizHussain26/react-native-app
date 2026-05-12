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

export default function HomeScreen() {
  const router = useRouter();
  const { width: SW, height: SH } = useWindowDimensions();
  const [isStarting, setIsStarting] = useState(false);
  const createSessionMutation = useCreateSession();

  const btnSize = Math.min(SW * 0.32, 300);
  const imgW = Math.min(SW * 0.38, 420);
  const imgH = Math.min(SH * 0.55, 420);

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
            Upload Your Favorite Photo,{'\n'}Personalize & Print!
          </Text>

          <View style={styles.row}>
            {/* Left: postcard image */}
            <Image
              source={require('../assets/images/postcard_pic.png')}
              style={{ width: imgW, height: imgH }}
              resizeMode="contain"
            />

            {/* Right: start button + price */}
            <View style={styles.rightCol}>
              {isStarting ? (
                <View style={[styles.loadingContainer, { width: btnSize, height: btnSize }]}>
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
                    style={{ width: btnSize, height: btnSize }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}

              {/* <Text style={[styles.price, { fontSize: Math.min(SW * 0.03, 32) }]}>
                Price: $3.50
              </Text> */}
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
  },
  headline: {
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxl,
    width: '100%',
    maxWidth: 900,
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
