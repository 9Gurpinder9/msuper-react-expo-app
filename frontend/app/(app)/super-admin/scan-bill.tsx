// frontend/app/(app)/super-admin/scan-bill.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  FAB,
  IconButton,
  Portal,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { extractInvoiceData, formatMoney } from '@utils/invoiceParser';
import { runOcrFromUri } from '@utils/ocrEngine';
import {
  deleteScanBillRecord,
  listScanBillRecords,
  saveScanBillRecord,
  type ScanBillRecord,
} from '@utils/scanBillStorage';

export default function ScanBillScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const styles = makeStyles(theme, width);

  const [history, setHistory] = useState<ScanBillRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isFocused = useIsFocused();

  const toastRef = React.useRef({ showError, showInfo, showSuccess });
  React.useEffect(() => {
    toastRef.current = { showError, showInfo, showSuccess };
  }, [showError, showInfo, showSuccess]);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const records = await listScanBillRecords();
      setHistory(records);
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
    async (mode: 'camera' | 'library') => {
      try {
        setMenuVisible(false);
        if (mode === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            toastRef.current.showInfo('Camera permission is required');
            return;
          }
        }

        const result =
          mode === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: [ImagePicker.MediaType.Images],
                quality: 1,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: [ImagePicker.MediaType.Images],
                quality: 1,
              });

        if (result.canceled || !result.assets?.[0]?.uri) return;
        await processImage(result.assets[0].uri);
      } catch (error) {
        toastRef.current.showError('Unable to open camera or gallery');
      }
    },
    []
  );

  const processImage = useCallback(
    async (uri: string) => {
      try {
        if (Platform.OS !== 'web' && Constants.appOwnership === 'expo') {
          toastRef.current.showError(
            'OCR needs a dev build. Expo Go cannot load the ML Kit module.'
          );
          return;
        }
        setProcessing(true);
        const ocr = await runOcrFromUri(uri);
        if (!ocr.text.trim()) {
          toastRef.current.showError('No text detected. Try a clearer photo.');
          return;
        }

        const data = extractInvoiceData(ocr.text);
        const record = await saveScanBillRecord({
          imageUri: uri,
          data,
          ocrEngine: ocr.engine,
        });

        setHistory((prev) => [record, ...prev]);
        setExpandedId(record.id);
        toastRef.current.showSuccess('Invoice scanned and saved');
      } catch (error) {
        toastRef.current.showError('Failed to scan invoice');
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const selectedRecord = useMemo(
    () => history.find((item) => item.id === selectedId),
    [history, selectedId]
  );

  const handleDelete = useCallback(() => {
    if (!selectedRecord) return;
    Alert.alert(
      'Delete scan?',
      'This removes the JSON file and the saved image from local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScanBillRecord(selectedRecord);
              setHistory((prev) => prev.filter((item) => item.id !== selectedRecord.id));
              setSelectedId(null);
              toastRef.current.showSuccess('Deleted scan');
            } catch {
              toastRef.current.showError('Delete failed');
            }
          },
        },
      ]
    );
  }, [selectedRecord]);

  const renderCard = ({ item }: { item: ScanBillRecord }) => {
    const isSelected = item.id === selectedId;
    const isExpanded = item.id === expandedId;
    const total = formatMoney(item.data.total, item.data.currency);
    const subtitle = item.data.vendor || 'Unknown vendor';
    const date = item.data.date || 'Date not found';

    return (
      <Pressable
        onLongPress={() => setSelectedId(item.id)}
        onPress={() => {
          if (selectedId && selectedId !== item.id) {
            setSelectedId(item.id);
          } else if (selectedId && selectedId === item.id) {
            setSelectedId(null);
          } else {
            setExpandedId(isExpanded ? null : item.id);
          }
        }}
      >
        <Card style={[styles.card, isSelected && styles.cardSelected]}>
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
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                {date}
              </Text>
            </View>
            <View style={styles.cardRight}>
              {total ? (
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  {total}
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                  Total N/A
                </Text>
              )}
              <Badge style={styles.engineBadge}>{item.ocrEngine.toUpperCase()}</Badge>
            </View>
          </Card.Content>
          {isExpanded && (
            <View style={styles.cardDetails}>
              <Text variant="labelMedium" style={{ marginBottom: 6 }}>
                Extracted JSON
              </Text>
              <Text selectable style={styles.jsonText}>
                {JSON.stringify(item, null, 2)}
              </Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Scan Bill" showBack onBackPress={() => router.back()} />

      <View style={styles.header}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="barcode-scan" size={26} color={theme.colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={styles.heroTitle}>
                Local OCR for invoices
              </Text>
              <Text variant="bodySmall" style={styles.heroSubtitle}>
                Capture, extract, and store structured JSON on-device.
              </Text>
            </View>
          </View>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="shield-check" size={14} color={theme.colors.onPrimary} />
              <Text variant="labelSmall" style={styles.heroChipText}>
                Local only
              </Text>
            </View>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="cloud-off-outline" size={14} color={theme.colors.onPrimary} />
              <Text variant="labelSmall" style={styles.heroChipText}>
                No cloud
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {selectedRecord && (
        <Surface style={styles.selectionBar} elevation={2}>
          <View style={styles.selectionLeft}>
            <MaterialCommunityIcons
              name="checkbox-marked-circle-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text variant="labelMedium" style={{ marginLeft: 8 }}>
              1 selected
            </Text>
          </View>
          <View style={styles.selectionActions}>
            <IconButton
              icon={(props) => <MaterialCommunityIcons name="delete" size={props.size} color={props.color} />}
              onPress={handleDelete}
              accessibilityLabel="Delete selected scan"
            />
            <IconButton
              icon={(props) => <MaterialCommunityIcons name="close" size={props.size} color={props.color} />}
              onPress={() => setSelectedId(null)}
              accessibilityLabel="Cancel selection"
            />
          </View>
        </Surface>
      )}

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
              Tap the menu button to scan a bill or upload a photo.
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
              label: 'Upload',
              onPress: () => handleImagePick('library'),
            },
          ]}
        />
      </Portal>

      {processing && (
        <View style={styles.processingOverlay}>
          <Surface style={styles.processingCard} elevation={3}>
            <ActivityIndicator animating color={theme.colors.primary} />
            <Text variant="labelMedium" style={{ marginTop: 8 }}>
              Reading invoice…
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
    selectionBar: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
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
    cardSelected: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
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
    engineBadge: {
      marginTop: 6,
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.secondaryContainer,
      color: theme.colors.onSecondaryContainer,
    },
    cardDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
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
  });
