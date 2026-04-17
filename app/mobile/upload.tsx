import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useUploadSessionImage } from '../../hooks/useUploadSessionImage';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const { width: SW } = Dimensions.get('window');

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function MobileUploadScreen() {
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();
  const uploadMutation = useUploadSessionImage();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in Settings to upload photos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      await handleUpload(asset.uri, asset.mimeType || 'image/jpeg');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow camera access in Settings to take photos.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      await handleUpload(asset.uri, asset.mimeType || 'image/jpeg');
    }
  };

  const handleUpload = async (uri: string, mimeType: string) => {
    if (!sessionId) {
      setErrorMsg('Session not found. Please scan the QR code again.');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setErrorMsg('');

    try {
      await uploadMutation.mutateAsync({
        sessionId,
        imageUri: uri,
        mimeType,
      });
      setUploadState('success');
    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMsg('Upload failed. Please try again.');
      setUploadState('error');
    }
  };

  const handleRetry = () => {
    setUploadState('idle');
    setSelectedImage(null);
    setErrorMsg('');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/posta-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Upload Your Photo</Text>
      </View>

      {uploadState === 'success' ? (
        /* ── Success state ── */
        <View style={styles.successBox}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.successIcon}
            resizeMode="contain"
          />
          <Text style={styles.successTitle}>Photo Uploaded!</Text>
          <Text style={styles.successBody}>
            Your photo has been sent to the kiosk. Head back to the kiosk
            screen to continue editing.
          </Text>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.thumbPreview}
              resizeMode="cover"
            />
          )}
        </View>
      ) : (
        /* ── Upload state ── */
        <View style={styles.uploadBox}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.uploadIcon}
            resizeMode="contain"
          />
          <Text style={styles.uploadTitle}>Select a Photo</Text>
          <Text style={styles.uploadSubtitle}>
            Choose a photo from your library or take a new one with your camera.
          </Text>

          {uploadState === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {uploadState === 'uploading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Uploading your photo…</Text>
            </View>
          ) : (
            <View style={styles.btnStack}>
              <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.btnIcon}
                />
                <Text style={styles.primaryBtnText}>Choose from Library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={takePhoto}
              >
                <Text style={styles.secondaryBtnText}>Take a Photo</Text>
              </TouchableOpacity>

              {uploadState === 'error' && (
                <TouchableOpacity style={styles.retryLink} onPress={handleRetry}>
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Need helpssss? Ask a staff member at the kiosk.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    minHeight: '100%',
  } as never,
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  logo: { width: 80, height: 80, borderRadius: 12 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  uploadBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    width: '100%',
    maxWidth: 420,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
    ...SHADOW.sm,
  },
  uploadIcon: { width: 64, height: 64 },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
  },
  errorText: { color: COLORS.destructive, fontSize: 13, textAlign: 'center' },
  loadingContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  btnStack: { width: '100%', gap: SPACING.md },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOW.md,
  },
  btnIcon: { width: 20, height: 20, tintColor: COLORS.white },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  retryLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  retryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    width: '100%',
    maxWidth: 420,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
    ...SHADOW.sm,
  },
  successIcon: { width: 72, height: 72 },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  thumbPreview: {
    width: 180,
    height: 180,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
