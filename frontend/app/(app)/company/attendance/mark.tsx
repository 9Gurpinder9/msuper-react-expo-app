import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, BackHandler, Image, useWindowDimensions, Animated, Easing } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
import {
  Text,
  Button,
  useTheme,
  Portal,
  IconButton,
  Surface,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { fetchJson } from '@utils/network';
import { API_BASE_URL } from '@config';
import type { AppTheme } from '../../../../src/theme/types';

export default function MarkAttendanceScreen() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showError, showSuccess, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchedOut, setPunchedOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);

  // Cooldown status
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Location details
  const [locationStr, setLocationStr] = useState('Detecting current live location...');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocationOverlay, setLoadingLocationOverlay] = useState(false);

  // Camera capture modal state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPhotoReview, setShowPhotoReview] = useState(false);
  const cameraRef = useRef<any>(null);

  // Face tracking & auto-capture states
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetectionSupported, setFaceDetectionSupported] = useState(true);

  // Scanline animation loop
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showCamera) {
      scanAnim.setValue(0);
      return;
    }

    const startScanlineAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 340, // Height of guide frame minus scanline height
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startScanlineAnimation();
  }, [showCamera]);

  // Face Verification Progress Animation & State
  const verificationProgress = useRef(new Animated.Value(0)).current;
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const listenerId = verificationProgress.addListener(({ value }) => {
      setProgressPercent(Math.round(value));
    });
    return () => {
      verificationProgress.removeListener(listenerId);
    };
  }, []);

  useEffect(() => {
    if (!showCamera) {
      verificationProgress.setValue(0);
      return;
    }

    if (faceCount === 1) {
      Animated.timing(verificationProgress, {
        toValue: 100,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && faceCount === 1) {
          takePicture();
        }
      });
    } else {
      Animated.timing(verificationProgress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [faceCount, showCamera]);

  const strokeDashoffset = verificationProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [1008, 0],
  });

  // Intercept hardware back button
  useEffect(() => {
    const backAction = () => {
      if (showCamera) {
        setShowCamera(false);
        return true;
      }
      if (showPhotoReview) {
        setShowPhotoReview(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showCamera, showPhotoReview]);

  // Live face tracking loop using Google ML Kit on-device face detector
  useEffect(() => {
    if (!showCamera || Platform.OS === 'web' || !faceDetectionSupported) {
      setFaceCount(null);
      return;
    }

    let isSubscribed = true;
    let timerId: any = null;

    const runDetectionLoop = async () => {
      if (!isSubscribed || !cameraRef.current || isCapturing) return;

      try {
        // Fast low-quality temporary snapshot for face scanning
        const snapshot = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          skipProcessing: true,
          shutterSound: false,
        });

        if (snapshot && snapshot.uri && isSubscribed) {
          const FaceDetection = require('@react-native-ml-kit/face-detection').default;
          const faces = await FaceDetection.detect(snapshot.uri, {
            performanceMode: 'fast',
          });

          if (isSubscribed) {
            const count = faces.length;
            setFaceCount(count);
          }
        }
      } catch (err: any) {
        console.warn('[FaceDetection] Native module not available/failed. Auto-capture disabled.', err?.message || err);
        if (isSubscribed) {
          setFaceDetectionSupported(false);
          setFaceCount(null);
        }
        return; // Exit and do not reschedule the loop
      }

      // Schedule the next detection pass
      if (isSubscribed) {
        timerId = setTimeout(runDetectionLoop, 1000);
      }
    };

    // Delay start slightly to let the camera view layout render and settle
    timerId = setTimeout(runDetectionLoop, 1200);

    return () => {
      isSubscribed = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [showCamera, isCapturing]);

  useEffect(() => {
    initScreen();
  }, []);

  // Cooldown timer logic: prevents instant punch out within 1 minute of punch-in
  useEffect(() => {
    if (!punchedIn || punchedOut || !todayRecord?.punch_in_time) return;

    const checkCooldown = () => {
      const punchInMs = new Date(todayRecord.punch_in_time).getTime();
      const diffMs = Date.now() - punchInMs;
      const remaining = Math.max(0, Math.ceil((60 * 1000 - diffMs) / 1000));
      setSecondsRemaining(remaining);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [punchedIn, punchedOut, todayRecord]);

  const initScreen = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/attendance/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        setPunchedIn(res.data.punchedIn);
        setPunchedOut(res.data.punchedOut);
        setTodayRecord(res.data.data);
      }

      await resolveLocation();
    } catch (err: any) {
      showError('Failed to initialize location or check status.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const resolveLocation = async () => {
    setLoadingLocationOverlay(true);
    setLocationStr('Detecting current live location...');
    try {
      if (Platform.OS !== 'web') {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showError('Location permission is required to log attendance.');
          setLocationStr('Location Access Denied');
          return;
        }

        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          showError('Please turn on your device GPS/location services.');
          setLocationStr('GPS Location Disabled');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        setCoords({ latitude, longitude });

        const addressObj = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addressObj && addressObj.length > 0) {
          const addr = addressObj[0];
          const formattedAddress = [
            addr.name,
            addr.streetNumber,
            addr.street,
            addr.district,
            addr.city,
            addr.subregion,
            addr.region,
            addr.postalCode,
            addr.country,
          ]
            .filter(Boolean)
            .join(', ');
          setLocationStr(formattedAddress || `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
        } else {
          setLocationStr(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
        }
      } else {
        // Web mock delay simulation
        await new Promise((resolve) => setTimeout(resolve, 800));
        const mockLat = 28.6139;
        const mockLng = 77.209;
        setCoords({ latitude: mockLat, longitude: mockLng });
        setLocationStr('Connaught Place, New Delhi, Delhi, 110001, India');
      }
    } catch (err) {
      showError('Failed to detect current location.');
      setLocationStr('Location unavailable');
    } finally {
      setLoadingLocationOverlay(false);
    }
  };

  const openCameraFlow = async () => {
    if (Platform.OS !== 'web') {
      const { Camera } = require('expo-camera');
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const requestResult = await Camera.requestCameraPermissionsAsync();
        if (requestResult.status !== 'granted') {
          showError('Camera permission is required to snap a photo.');
          return;
        }
      }
    }
    setFaceCount(null);
    setCapturedPhoto(null);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          base64: true,
          shutterSound: true,
        });
        if (photo && photo.base64) {
          setCapturedPhoto(photo.base64);
          setShowCamera(false);
        } else {
          showError('Failed to capture photo.');
        }
      } catch (err) {
        showError('Error capturing image.');
      } finally {
        setIsCapturing(false);
      }
    } else {
      setIsCapturing(false);
    }
  };

  const handlePunchSubmit = async () => {
    if (!coords) {
      showError('Location coordinates are not resolved.');
      return;
    }
    if (!capturedPhoto) {
      showWarning('Photo verification is required. Opening camera...');
      await openCameraFlow();
      return;
    }

    setSaving(true);
    try {
      const isPunchOut = punchedIn && !punchedOut;
      const endpoint = isPunchOut ? '/company/attendance/punch-out' : '/company/attendance/punch-in';
      const token = await AsyncStorage.getItem('companyToken');

      const res = await fetchJson(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          photo: capturedPhoto,
          locationAddress: locationStr,
        }),
      });

      if (res.ok) {
        showSuccess(res.data?.message || 'Attendance logged successfully.');
        setCapturedPhoto(null);
        router.replace('/company/attendance');
      } else {
        showError(res.data?.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      showError('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <TopAppBar title="Mark Attendance" showBack onBackPress={() => router.back()} />
        <AppLoader message="Retrieving GPS and status..." icon="crosshairs-gps" />
      </View>
    );
  }

  const isPunchOut = punchedIn && !punchedOut;
  const headingText = isPunchOut ? 'Shift Punch Out' : 'Shift Punch In';
  const buttonText = isPunchOut ? 'Punch Out Now' : 'Punch In Now';
  const isMobile = width < 768;

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Mark Attendance" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 500, gap: 16 }}>
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.formTitle}>
              {headingText}
            </Text>

            {/* Premium auto-height location card container */}
            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Detected Live Address
              </Text>
              
              <Surface style={styles.locationDisplayBox} elevation={1}>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker-radius"
                    size={22}
                    color={theme.colors.primary}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={styles.locationText}>
                      {locationStr}
                    </Text>
                  </View>
                </View>
              </Surface>

              {/* Compact & light-styled Location Refresh Button */}
              <Button
                mode="text"
                compact
                icon="refresh"
                onPress={resolveLocation}
                disabled={loadingLocationOverlay}
                style={styles.refreshLocBtn}
                labelStyle={styles.refreshLocBtnLabel}
              >
                Refresh Location
              </Button>
            </View>

            {/* Live Photo Capture View */}
            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                Live Photo Verification
              </Text>
              {capturedPhoto ? (
                <View style={styles.photoContainer}>
                  <Pressable onPress={() => setShowPhotoReview(true)} style={styles.photoPreviewCard}>
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${capturedPhoto}` }}
                      style={styles.photoPreviewImage}
                    />
                    {/* View overlay badge */}
                    <View style={styles.photoEditBadge}>
                      <MaterialCommunityIcons name="eye-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.photoBadgeText}>Tap to View</Text>
                    </View>
                  </Pressable>
                  <Button
                    mode="outlined"
                    icon="camera-flip-outline"
                    onPress={openCameraFlow}
                    style={styles.retakeButton}
                    labelStyle={{ fontSize: 12 }}
                  >
                    Retake Photo
                  </Button>
                </View>
              ) : (
                <Pressable onPress={openCameraFlow} style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-outline" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.photoPlaceholderText}>Tap to Capture Live Photo</Text>
                </Pressable>
              )}
            </View>

            {/* Actions Stack */}
            <View style={styles.actionContainer}>
              {secondsRemaining > 0 && (
                <Text style={styles.cooldownText}>
                  * Punch out is locked. Please wait {secondsRemaining} seconds...
                </Text>
              )}
              <Button
                mode="contained"
                onPress={handlePunchSubmit}
                disabled={saving || !coords || loadingLocationOverlay || secondsRemaining > 0}
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                style={styles.saveBtn}
              >
                {buttonText}
              </Button>
              <Button
                onPress={() => router.back()}
                disabled={saving}
                mode="text"
                textColor={theme.colors.onSurfaceVariant + 'B3'}
                style={styles.closeBtn}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Full Photo Review Modal */}
      <Portal>
        <Dialog
          visible={showPhotoReview}
          onDismiss={() => setShowPhotoReview(false)}
          style={[styles.reviewDialog, { width: isMobile ? '95%' : 400, maxWidth: '95%' }]}
        >
          <Dialog.Title style={{ textAlign: 'center', fontWeight: '800' }}>Review Photo</Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', paddingBottom: 8 }}>
            {capturedPhoto && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${capturedPhoto}` }}
                style={styles.fullReviewImage}
                resizeMode="contain"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Button
              mode="outlined"
              textColor={theme.colors.primary}
              onPress={() => {
                setShowPhotoReview(false);
                openCameraFlow();
              }}
            >
              Retake
            </Button>
            <Button mode="contained" onPress={() => setShowPhotoReview(false)}>
              Looks Good
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Full Screen Camera Capture Overlay */}
      {showCamera && (
        <Portal>
          <View style={StyleSheet.absoluteFillObject}>
            {Platform.OS === 'web' ? (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', gap: 16 },
                ]}
              >
                <MaterialCommunityIcons name="image-filter-center-focus" size={64} color="#38BDF8" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Web Environment Camera Simulation</Text>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
                  Since native camera modules run on device hardware, we will simulate a high-quality capture for testing.
                </Text>
                <Button
                  mode="contained"
                  buttonColor="#38BDF8"
                  textColor="#0F172A"
                  onPress={() => {
                    setCapturedPhoto(
                      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                    );
                    setShowCamera(false);
                  }}
                >
                  Snap Simulated Photo
                </Button>
                <Button textColor="#F87171" onPress={() => setShowCamera(false)}>
                  Cancel
                </Button>
              </View>
            ) : (
              (() => {
                const { CameraView } = require('expo-camera');
                return (
                  <View style={StyleSheet.absoluteFillObject}>
                    <CameraView style={StyleSheet.absoluteFillObject} facing={cameraFacing} ref={cameraRef} />
                    <View style={[StyleSheet.absoluteFillObject, styles.cameraOverlay]}>
                      <View style={styles.cameraHeaderActions}>
                        <IconButton
                          icon="camera-flip-outline"
                          iconColor="#FFFFFF"
                          size={28}
                          style={styles.flipCameraBtn}
                          onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                        />
                        <IconButton
                          icon="close"
                          iconColor="#FFFFFF"
                          size={28}
                          style={styles.closeCameraBtn}
                          onPress={() => setShowCamera(false)}
                        />
                      </View>

                      {/* Face Focus Guide Frame */}
                      <View style={styles.faceGuideContainer}>
                        <View style={styles.viewfinderWrapper}>
                          {/* Inner Oval Frame (clips the scanline) */}
                          <View
                            style={[
                              styles.faceGuideFrame,
                              {
                                borderColor:
                                  faceCount === 1
                                    ? 'rgba(16, 185, 129, 0.2)' // Light green when progress active
                                    : faceCount !== null && faceCount > 1
                                    ? '#EF4444'
                                    : 'rgba(255, 255, 255, 0.45)',
                                borderStyle: faceCount === 1 ? 'solid' : 'dashed',
                              },
                            ]}
                          >
                            {/* Scanline Laser */}
                            <Animated.View
                              style={[
                                styles.scanline,
                                {
                                  transform: [{ translateY: scanAnim }],
                                  backgroundColor:
                                    faceCount === 1
                                      ? '#10B981'
                                      : faceCount !== null && faceCount > 1
                                      ? '#EF4444'
                                      : '#38BDF8',
                                  shadowColor:
                                    faceCount === 1
                                      ? '#10B981'
                                      : faceCount !== null && faceCount > 1
                                      ? '#EF4444'
                                      : '#38BDF8',
                                },
                              ]}
                            />
                          </View>

                          {/* SVG Progress Ring Overlay */}
                          {faceCount === 1 && (
                            <View style={styles.svgOverlay}>
                              <Svg width={280} height={350} viewBox="0 0 280 350">
                                <AnimatedRect
                                  x="2"
                                  y="2"
                                  width="276"
                                  height="346"
                                  rx="138"
                                  ry="138"
                                  stroke="#10B981"
                                  strokeWidth="4"
                                  fill="transparent"
                                  strokeDasharray="1008"
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                />
                              </Svg>
                            </View>
                          )}

                          {/* Outer Corner Brackets */}
                          {(() => {
                            const bracketColor =
                              faceCount === 1
                                ? '#10B981'
                                : faceCount !== null && faceCount > 1
                                ? '#EF4444'
                                : 'rgba(255, 255, 255, 0.8)';
                            return (
                              <>
                                <View style={[styles.bracket, styles.topLeft, { borderColor: bracketColor }]} />
                                <View style={[styles.bracket, styles.topRight, { borderColor: bracketColor }]} />
                                <View style={[styles.bracket, styles.bottomLeft, { borderColor: bracketColor }]} />
                                <View style={[styles.bracket, styles.bottomRight, { borderColor: bracketColor }]} />
                              </>
                            );
                          })()}

                          {/* Face lock percentage readout */}
                          {faceCount === 1 && progressPercent > 0 && (
                            <View style={styles.percentageContainer}>
                              <Text style={styles.percentageText}>{progressPercent}%</Text>
                              <Text style={styles.percentageSubtext}>VERIFYING</Text>
                            </View>
                          )}
                        </View>

                        {/* Pill-shaped status badge */}
                        {(() => {
                          let badgeBg = 'rgba(15, 23, 42, 0.75)';
                          let badgeText = 'Initializing face scanner...';
                          let badgeIcon = 'refresh';
                          let iconColor = '#FFFFFF';

                          if (faceCount === 0) {
                            badgeBg = 'rgba(15, 23, 42, 0.75)';
                            badgeText = 'Align your face within the frame';
                            badgeIcon = 'face-recognition';
                            iconColor = '#38BDF8';
                          } else if (faceCount === 1) {
                            badgeBg = 'rgba(16, 185, 129, 0.2)';
                            badgeText = progressPercent === 100 ? 'Capturing photo...' : 'Hold still...';
                            badgeIcon = 'face-recognition';
                            iconColor = '#10B981';
                          } else if (faceCount !== null && faceCount > 1) {
                            badgeBg = 'rgba(239, 68, 68, 0.2)';
                            badgeText = 'Multiple faces! Keep only one';
                            badgeIcon = 'alert-circle-outline';
                            iconColor = '#EF4444';
                          }

                          return (
                            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                              <MaterialCommunityIcons name={badgeIcon as any} size={18} color={iconColor} />
                              <Text style={[styles.statusBadgeText, { color: iconColor }]}>
                                {badgeText}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>

                      <View style={styles.cameraActions}>
                        {faceCount === 1 && (
                          <IconButton icon="circle-slice-8" iconColor="#FFFFFF" size={72} onPress={takePicture} />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()
            )}
          </View>
        </Portal>
      )}

      {/* Global Loader Portal for Saving or Resolving location */}
      {(saving || loadingLocationOverlay) && (
        <Portal>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                zIndex: 9999,
                backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <AppLoader
              message={saving ? 'Submitting attendance...' : 'Detecting live location...'}
              icon={saving ? 'cloud-upload-outline' : 'crosshairs-gps'}
              transparent
            />
          </View>
        </Portal>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    formContainer: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      gap: 16,
    },
    formTitle: {
      fontWeight: '700',
      textAlign: 'center',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    fieldRow: {
      gap: 6,
    },
    fieldLabel: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    locationDisplayBox: {
      padding: 14,
      borderRadius: 10,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    locationText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    refreshLocBtn: {
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    refreshLocBtnLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginVertical: 4,
    },
    photoPlaceholder: {
      height: 120,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
      gap: 8,
    },
    photoPlaceholderText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
    photoContainer: {
      alignItems: 'center',
      gap: 12,
    },
    photoPreviewCard: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    photoPreviewImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    photoEditBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    photoBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    retakeButton: {
      borderRadius: 8,
      alignSelf: 'center',
      minWidth: 120,
    },
    actionContainer: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      marginTop: 16,
    },
    cooldownText: {
      color: theme.colors.error,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 4,
    },
    saveBtn: {
      borderRadius: 8,
      alignSelf: 'center',
      minWidth: 140,
    },
    closeBtn: {
      alignSelf: 'center',
    },
    cameraOverlay: {
      flex: 1,
      justifyContent: 'space-between',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    cameraHeaderActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginTop: Platform.OS === 'ios' ? 44 : 16,
    },
    flipCameraBtn: {
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    closeCameraBtn: {
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    faceGuideContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    viewfinderWrapper: {
      position: 'relative',
      width: 280,
      height: 350,
      justifyContent: 'center',
      alignItems: 'center',
    },
    faceGuideFrame: {
      width: 280,
      height: 350,
      borderRadius: 140,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255, 255, 255, 0.75)',
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    scanline: {
      width: '100%',
      height: 4,
      position: 'absolute',
      top: 0,
      left: 0,
      opacity: 0.85,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 6,
    },
    bracket: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderWidth: 3,
    },
    topLeft: {
      top: -6,
      left: -6,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 6,
    },
    topRight: {
      top: -6,
      right: -6,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 6,
    },
    bottomLeft: {
      bottom: -6,
      left: -6,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 6,
    },
    bottomRight: {
      bottom: -6,
      right: -6,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 6,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      marginTop: 8,
    },
    statusBadgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
    svgOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 280,
      height: 350,
      zIndex: 5,
    },
    percentageContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      zIndex: 10,
    },
    percentageText: {
      color: '#10B981',
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 28,
    },
    percentageSubtext: {
      color: '#E2E8F0',
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginTop: 2,
    },
    cameraActions: {
      alignItems: 'center',
      marginBottom: 16,
    },
    reviewDialog: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      alignSelf: 'center',
    },
    fullReviewImage: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: 8,
    },
  });
