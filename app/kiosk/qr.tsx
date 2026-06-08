import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
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
        const data = JSON.parse(e.data as string) as { type?: string; sessionId?: string };
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

  const qrSize = Math.min(SW * 0.28, 300);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <ProgressSteps currentStep={2} />

        <View style={styles.content}>
          <Text style={styles.title}>Scan to upload your photo</Text>

          <View style={styles.qrCard}>
            <View style={styles.qrBorder}>
              <QRCode
                value={mobileUrl || 'https://posta.app'}
                size={qrSize}
                color={COLORS.textPrimary}
                backgroundColor={COLORS.white}
              />
            </View>

            <Text style={styles.primaryLabel}>Use your phone's camera</Text>

            <View style={styles.expireRow}>
              <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.expireText}>code expires in 10 minutes</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <PostaFooter />
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  background: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.lg,
    ...SHADOW.md,
  },
  qrBorder: {
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  primaryLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  expireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expireText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  backButton: {
    paddingHorizontal: SPACING.xxl * 2,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.miscMedium,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});
