import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL, WS_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');

const INSTRUCTIONS = [
  {
    num: 1,
    title: 'Open your camera app',
    desc: "Point your phone's camera at the QR code",
  },
  {
    num: 2,
    title: 'Tap the notification',
    desc: 'Your phone will show a link to open',
  },
  {
    num: 3,
    title: 'Select your photo',
    desc: 'Choose from your photo library',
  },
];

export default function QRScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();
  const { resetAll } = useCropStore();

  const mobileUrl = useMemo(() => {
    if (!sessionId) return '';
    return `${'https://kiosk-app-frontend.vercel.app'}/mobile/upload?session=${sessionId}`;
  }, [sessionId]);

  const { showModal, resetIdleTimer } = useIdleActivity(() => {
    resetAll();
    router.replace('/');
  });

  // Clear store when new session starts
  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async () => {
      const last = await AsyncStorage.getItem('lastSessionId');
      if (last !== sessionId) {
        resetAll();
        await AsyncStorage.setItem('lastSessionId', sessionId);
      }
    };
    checkSession();
  }, [sessionId, resetAll]);

  // WebSocket — listen for image_ready event
  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = `${WS_BASE_URL}/ws?sessionId=${encodeURIComponent(sessionId)}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Failed to open WebSocket:', err);
      return;
    }

    ws.onopen = () => console.log('WS connected:', sessionId);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as {
          type?: string;
          sessionId?: string;
        };
        if (data.type === 'image_ready' && data.sessionId === sessionId) {
          router.push(`/kiosk/edit?session=${sessionId}`);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = (e) => console.error('WS error:', e);
    ws.onclose = () => console.log('WS closed');

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [sessionId, router]);

  const handleBack = async () => {
    resetAll();
    await AsyncStorage.removeItem('lastSessionId');
    router.replace('/');
  };

  const qrSize = Math.min(SW * 0.22, 240);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <ProgressSteps currentStep={2} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Scan to Upload Your Photo</Text>
          <Text style={styles.subtitle}>
            Use your phone&apos;s camera to scan the QR code below and upload
            your favorite photo.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              {/* QR Code column */}
              <View style={styles.qrCol}>
                <View style={styles.qrBorder}>
                  <QRCode
                    value={mobileUrl || 'https://posta.app'}
                    size={qrSize}
                    color={COLORS.textPrimary}
                    backgroundColor={COLORS.white}
                  />
                </View>
                <View style={styles.expireRow}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.expireText}>Code expires in 10 minutes</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Instructions column */}
              <View style={styles.instructCol}>
                <Text style={styles.howTitle}>How to Upload:</Text>
                {INSTRUCTIONS.map((item) => (
                  <View key={item.num} style={styles.instructRow}>
                    <View style={styles.numCircle}>
                      <Text style={styles.numText}>{item.num}</Text>
                    </View>
                    <View style={styles.instructText}>
                      <Text style={styles.instructTitle}>{item.title}</Text>
                      <Text style={styles.instructDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.helpRow}>
                  <Text style={styles.helpText}>
                    Having trouble? Ask a staff member for assistance
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>

        <PostaFooter />
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  background: { flex: 1 },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    maxWidth: 600,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 720,
    ...SHADOW.sm,
  },
  cardRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
  },
  qrCol: {
    alignItems: 'center',
    flex: 1,
  },
  qrBorder: {
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  expireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 4,
  },
  expireText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    alignSelf: 'stretch',
  },
  instructCol: {
    flex: 1,
    gap: SPACING.lg,
  },
  howTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  instructRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  numCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  instructText: { flex: 1 },
  instructTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  instructDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  helpRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  helpText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  backButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xxl * 2,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.miscMedium,
    borderRadius: RADIUS.sm,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});
