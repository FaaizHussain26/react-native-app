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

  const qrSize = Math.min(SW * 0.35, 300);

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
          <Text style={styles.title}>Scan to upload your photo</Text>

          <View style={styles.card}>
            <View style={styles.qrCol}>
              <View style={styles.qrBorder}>
                <QRCode
                  value={mobileUrl || 'https://posta.app'}
                  size={qrSize}
                  color={COLORS.textPrimary}
                  backgroundColor={COLORS.white}
                />
              </View>
              <Text style={styles.cameraText}>Use your phone&apos;s camera</Text>
              <Text style={styles.expireText}>code expires in 10 minutes</Text>
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
    paddingBottom: SPACING.lg,
    gap:SPACING.lg
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOW.md,
  },
  qrCol: {
    alignItems: 'center',
  },
  qrBorder: {
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  cameraText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  expireText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
