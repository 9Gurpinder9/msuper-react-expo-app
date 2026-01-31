// frontend/app/(app)/super-admin/online-scan-bill.tsx
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Dialog,
  FAB,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { formatMoney } from '@utils/invoiceParser';
import { fetchJson } from '@utils/network';
import { API_BASE_URL } from '@config';
import {
  deleteScanBillRecord,
  listScanBillRecords,
  saveScanBillRecord,
  type ScanBillRecord,
} from '@utils/scanBillStorage';
import {
  pickScanBillFile,
  readScanBillFileBase64,
} from '@utils/scanBillFilePicker';

type ImageAsset = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
};

type UploadPayload = {
  uri: string;
  base64: string;
  mimeType: string;
};

export default function OnlineScanBillScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const styles = makeStyles(theme, width);

  const [history, setHistory] = useState<ScanBillRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuRecordId, setMenuRecordId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalRecord, setModalRecord] = useState<ScanBillRecord | null>(null);
  const isFocused = useIsFocused();

  const toastRef = React.useRef({ showError, showInfo, showSuccess });
  React.useEffect(() => {
    toastRef.current = { showError, showInfo, showSuccess };
  }, [showError, showInfo, showSuccess]);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const records = await listScanBillRecords();
      setHistory(records.filter((item) => item.ocrEngine === 'documentai'));
    } catch {
      toastRef.current.showError('Failed to load scan history');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    if (isFocused) {
      loadHistory();
    }
  }, [isFocused, loadHistory]);

  const handleImagePick = useCallback(
    async (mode: 'camera') => {
      try {
        setMenuVisible(false);
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          toastRef.current.showInfo('Camera permission is required');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
          base64: true,
        });

        if (result.canceled || !result.assets?.[0]?.uri) return;
        const asset = result.assets[0] as ImageAsset;
        if (!asset.base64) {
          toastRef.current.showError('Failed to read image data');
          return;
        }
        await processUpload({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      } catch {
        toastRef.current.showError('Unable to open camera');
      }
    },
    []
  );

  const handleUploadPick = useCallback(async () => {
    try {
      setMenuVisible(false);
      const file = await pickScanBillFile();
      if (!file) return;
      const base64 = await readScanBillFileBase64(file.uri);
      await processUpload({
        uri: file.uri,
        base64,
        mimeType: file.mimeType,
      });
    } catch {
      toastRef.current.showError('Unable to open the file picker');
    }
  }, []);

  const processUpload = useCallback(async (payload: UploadPayload) => {
    try {
      setProcessing(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        toastRef.current.showError('Please log in again');
        return;
      }

      const res = await fetchJson(`${API_BASE_URL}/super-admin/online-scan-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: payload.base64,
          mimeType: payload.mimeType || 'image/jpeg',
        }),
      });

      if (!res.ok || !res.data?.data) {
        const message = (res.data as any)?.message || 'Failed to scan invoice';
        toastRef.current.showError(message);
        return;
      }

      const record = await saveScanBillRecord({
        imageUri: payload.uri,
        data: (res.data as any).data,
        ocrEngine: 'documentai',
      });

      setHistory((prev) => [record, ...prev]);
      setModalRecord(record);
      setModalVisible(true);
      toastRef.current.showSuccess('Invoice scanned and saved');
    } catch {
      toastRef.current.showError('Failed to scan invoice');
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleDelete = useCallback((record: ScanBillRecord) => {
    Alert.alert(
      'Delete scan?',
      'This removes the JSON file and the saved document from local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScanBillRecord(record);
              setHistory((prev) => prev.filter((item) => item.id !== record.id));
              toastRef.current.showSuccess('Deleted scan');
            } catch {
              toastRef.current.showError('Delete failed');
            }
          },
        },
      ]
    );
  }, []);

  const handleShare = useCallback(async (record: ScanBillRecord) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toastRef.current.showInfo('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(record.jsonPath, {
        mimeType: 'application/json',
        dialogTitle: 'Share scan JSON',
      });
    } catch {
      toastRef.current.showError('Share failed');
    }
  }, []);

  const getFileName = useCallback((path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }, []);

  const renderCard = ({ item }: { item: ScanBillRecord }) => {
    const total = formatMoney(item.data?.total, item.data?.currency);
    const subtitle = item.data?.vendor || 'Unknown vendor';
    const date = item.data?.date || '';
    const fileName = getFileName(item.jsonPath);

    return (
      <Pressable
        onPress={() => {
          setModalRecord(item);
          setModalVisible(true);
        }}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">{subtitle}</Text>
              {date ? (
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                  {date}
                </Text>
              ) : null}
              <Text variant="bodySmall" style={styles.fileName}>
                {fileName}
              </Text>
            </View>
            <View style={styles.cardRight}>
              {total ? (
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  {total}
                </Text>
              ) : null}
              <View style={styles.cardActions}>
                <Badge style={styles.engineBadge}>{item.ocrEngine.toUpperCase()}</Badge>
                <Menu
                  visible={menuRecordId === item.id}
                  onDismiss={() => setMenuRecordId(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={18}
                      onPress={() => setMenuRecordId(item.id)}
                      accessibilityLabel="Open scan actions"
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setMenuRecordId(null);
                      handleShare(item);
                    }}
                    title="Share"
                    leadingIcon="share-variant"
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuRecordId(null);
                      handleDelete(item);
                    }}
                    title="Delete"
                    leadingIcon="delete-outline"
                  />
                </Menu>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Online Scan Bill" showBack onBackPress={() => router.back()} />

      <View style={styles.header}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="cloud-search-outline" size={26} color={theme.colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={styles.heroTitle}>
                Document AI invoice parsing
              </Text>
              <Text variant="bodySmall" style={styles.heroSubtitle}>
                Securely send invoices to Google Document AI and store JSON on-device.
              </Text>
            </View>
          </View>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="cloud-check-outline" size={14} color={theme.colors.onPrimary} />
              <Text variant="labelSmall" style={styles.heroChipText}>
                Document AI
              </Text>
            </View>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="shield-check" size={14} color={theme.colors.onPrimary} />
              <Text variant="labelSmall" style={styles.heroChipText}>
                Auth required
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <View style={styles.listHeader}>
          <Text variant="titleMedium">History</Text>
          <Button mode="text" onPress={loadHistory}>
            Refresh
          </Button>
        </View>

        {loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={36} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ marginTop: 8 }}>
              No scans yet
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7, textAlign: 'center', marginTop: 4 }}>
              Tap the menu button to scan a bill or upload a photo/PDF.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {history.map((item) => (
              <View key={item.id}>{renderCard({ item })}</View>
            ))}
          </View>
        )}
      </View>

      <Portal>
        <FAB.Group
          open={menuVisible}
          visible
          icon="dots-vertical"
          color={theme.colors.onPrimary}
          style={styles.fabGroup}
          fabStyle={{ backgroundColor: theme.colors.primary }}
          onStateChange={({ open }) => setMenuVisible(open)}
          actions={[
            {
              icon: 'camera-outline',
              label: 'Camera',
              onPress: () => handleImagePick('camera'),
            },
            {
              icon: 'upload',
              label: 'Upload (Image/PDF)',
              onPress: handleUploadPick,
            },
          ]}
        />
      </Portal>

      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)} style={styles.modal}>
          <Dialog.Title>Extracted JSON</Dialog.Title>
          <Dialog.ScrollArea style={styles.modalScrollArea}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text selectable style={styles.jsonText}>
                {modalRecord ? JSON.stringify(modalRecord, null, 2) : ''}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {processing && (
        <View style={styles.processingOverlay}>
          <Surface style={styles.processingCard} elevation={3}>
            <ActivityIndicator animating color={theme.colors.primary} />
            <Text variant="labelMedium" style={{ marginTop: 8 }}>
              Processing invoice...
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
              Keep the app open for best accuracy
            </Text>
          </Surface>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: any, width: number) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    hero: {
      borderRadius: 18,
      padding: 16,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      color: theme.colors.onPrimary,
    },
    heroSubtitle: {
      color: theme.colors.onPrimary,
      opacity: 0.9,
      marginTop: 4,
    },
    heroChips: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    heroChipText: {
      color: theme.colors.onPrimary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 100,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    card: {
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRight: {
      alignItems: 'flex-end',
    },
    cardActions: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    engineBadge: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.secondaryContainer,
      color: theme.colors.onSecondaryContainer,
    },
    fileName: {
      opacity: 0.65,
      marginTop: 2,
    },
    jsonText: {
      fontSize: 12,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      color: theme.colors.onSurfaceVariant,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    fabGroup: {
      paddingBottom: 12,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    processingCard: {
      width: Math.min(300, width * 0.8),
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    modal: {
      borderRadius: 16,
    },
    modalScrollArea: {
      maxHeight: Math.min(420, width * 0.9),
    },
    modalScrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
  });
