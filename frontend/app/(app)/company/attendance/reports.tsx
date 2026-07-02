// frontend/app/(app)/company/attendance/reports.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  Portal,
  FAB,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { fetchJson } from '@utils/network';
import { API_BASE_URL } from '@config';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import type { AppTheme } from '../../../../src/theme/types';

interface UserRecord {
  id: number;
  name: string;
  role: string;
}

interface AttendanceRecord {
  user_id: number;
  attendance_date: string;
  total_minutes: number;
  punch_in_time: string;
  punch_out_time: string;
}

export default function AttendanceReports() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const isFocused = useIsFocused();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [savedFile, setSavedFile] = useState<{ uri: string; type: string; name: string } | null>(null);

  const handleOpenSavedFile = async () => {
    if (!savedFile) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(savedFile.uri, {
          mimeType: savedFile.type,
          dialogTitle: 'Open Report With...',
          UTI: savedFile.type === 'application/pdf'
            ? 'com.adobe.pdf'
            : 'public.comma-separated-values-text',
        });
      } else {
        showError('File sharing is not available on this device.');
      }
    } catch (err) {
      showError('Could not open the file.');
    } finally {
      setSavedFile(null);
    }
  };

  const getDayName = (dayNum: number) => {
    return new Date(year, month - 1, dayNum).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  const handleExportExcel = async () => {
    try {
      const headers = ['Name', 'Role', ...daysArray.map((d) => `${d} ${getDayName(d)}`)].join(',');
      const rows = users.map((user) => {
        const dayStatuses = daysArray.map((d) => {
          const { text } = getDayStatus(user.id, d);
          return `"${text.replace(/"/g, '""')}"`;
        });
        return [`"${user.name.replace(/"/g, '""')}"`, `"${user.role.replace(/"/g, '""')}"`, ...dayStatuses].join(',');
      });

      const csvContent = '\uFEFF' + [headers, ...rows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Report_${MONTHS[month - 1]}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const filename = `Attendance_Report_${MONTHS[month - 1]}_${year}`;
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'text/csv'
          );
          await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

          // Save a local copy in documentDirectory so expo-sharing can share it
          const localCacheUri = `${FileSystem.documentDirectory}${filename}.csv`;
          await FileSystem.writeAsStringAsync(localCacheUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

          showSuccess('Report saved successfully to your selected folder.');
          setSavedFile({
            uri: localCacheUri,
            type: 'text/csv',
            name: `${filename}.csv`,
          });
        } else {
          showError('Storage permission is required to save files.');
        }
      } else {
        const filename = `${FileSystem.documentDirectory}Attendance_Report_${MONTHS[month - 1]}_${year}.csv`;
        await FileSystem.writeAsStringAsync(filename, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(filename, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Excel Report',
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch (err) {
      showError('Failed to generate Excel export.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const title = `Attendance Report - ${MONTHS[month - 1]} ${year}`;
      const headerCols = ['Name', 'Role', ...daysArray.map((d) => `${d} ${getDayName(d)}`)];
      const headerHtml = headerCols.map((col) => `<th>${col}</th>`).join('');
      const rowsHtml = users.map((user) => {
        const cols = daysArray.map((d) => {
          const { status, text } = getDayStatus(user.id, d);
          const className = status === 'P' ? 'present' : status === 'OFF' ? 'off' : 'absent';
          return `<td class="${className}">${text}</td>`;
        }).join('');
        return `
          <tr>
            <td class="name-col">${user.name}</td>
            <td class="role-col">${user.role}</td>
            ${cols}
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: A4 landscape; margin: 8mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: center; }
              th { background-color: #f8f9fa; font-weight: bold; }
              .name-col { text-align: left; font-weight: 600; min-width: 100px; }
              .role-col { text-transform: uppercase; font-size: 8px; font-weight: 600; }
              .present { background-color: #e6f4ea; color: #137333; font-weight: bold; }
              .absent { background-color: #fce8e6; color: #c5221f; font-weight: bold; }
              .off { background-color: #f1f3f4; color: #5f6368; }
              @media print {
                body { padding: 0; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <table>
              <thead>
                <tr>${headerHtml}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showError('Popup blocked! Please allow popups to export PDF.');
          return;
        }
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else if (Platform.OS === 'android') {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const filename = `Attendance_Report_${MONTHS[month - 1]}_${year}`;
          const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/pdf'
          );
          await FileSystem.writeAsStringAsync(fileUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });

          // Save a local copy in documentDirectory so expo-sharing can share it
          const localCacheUri = `${FileSystem.documentDirectory}${filename}.pdf`;
          await FileSystem.copyAsync({ from: uri, to: localCacheUri });

          showSuccess('PDF Report saved successfully to your selected folder.');
          setSavedFile({
            uri: localCacheUri,
            type: 'application/pdf',
            name: `${filename}.pdf`,
          });
        } else {
          showError('Storage permission is required to save files.');
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export PDF Report',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      showError('Failed to generate PDF export.');
    }
  };

  // Generate days in active month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/attendance/report?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        setUsers(res.data.data.users || []);
        setRecords(res.data.data.records || []);
      } else {
        showError('Failed to load report data.');
      }
    } catch (err) {
      showError('Network error occurred while fetching report.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Helper: Find day status for a user
  const getDayStatus = (userId: number, dayNum: number) => {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayRecords = records.filter(
      (r) => r.user_id === userId && r.attendance_date === dayStr
    );

    if (dayRecords.length === 0) {
      const dateObj = new Date(year, month - 1, dayNum);
      const isSunday = dateObj.getDay() === 0;
      return isSunday
        ? { status: 'OFF', hours: 0, text: 'OFF' }
        : { status: 'A', hours: 0, text: 'A' };
    }
    const totalMins = dayRecords.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
    const hours = Math.round((totalMins / 60) * 10) / 10;
    return { status: 'P', hours, text: `P (${hours}h)` };
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <TopAppBar title="Attendance Reports" />
        <AppLoader message="Compiling report metrics..." icon="chart-bar" />
      </View>
    );
  }

  const themeCardBg = theme.dark ? theme.colors.surface : '#FFFFFF';

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Attendance Reports" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Month Selector bar */}
        <View style={styles.filterBar}>
          <Button mode="outlined" compact onPress={handlePrevMonth} icon="chevron-left">
            Prev
          </Button>
          <Text variant="titleMedium" style={styles.monthHeader}>
            {MONTHS[month - 1]} {year}
          </Text>
          <Button mode="outlined" compact onPress={handleNextMonth} contentStyle={{ flexDirection: 'row-reverse' }} icon="chevron-right">
            Next
          </Button>
        </View>

        {/* Scrollable grid structure */}
        <Card style={[styles.card, { backgroundColor: themeCardBg }]} mode="outlined">
          <ScrollView horizontal>
            <View>
              {/* Header row */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.headerCell, styles.nameCol]}>
                  <Text style={styles.headerText}>Name</Text>
                </View>
                <View style={[styles.headerCell, styles.roleCol]}>
                  <Text style={styles.headerText}>Role</Text>
                </View>
                {daysArray.map((day) => {
                  const dateObj = new Date(year, month - 1, day);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  const isSunday = dateObj.getDay() === 0;
                  return (
                    <View key={day} style={[styles.headerCell, styles.dayCol, isSunday && styles.sundayHeaderCell]}>
                      <Text style={[styles.headerText, { textAlign: 'center' }, isSunday && styles.sundayHeaderText]}>
                        {day}{'\n'}{dayName}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* User rows */}
              {users.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ textAlign: 'center', marginVertical: 24, opacity: 0.7 }}>
                    No users/records found for this selection.
                  </Text>
                </View>
              ) : (
                users.map((user) => (
                  <View key={user.id} style={styles.tableRow}>
                    <View style={[styles.bodyCell, styles.nameCol]}>
                      <Text style={styles.bodyText} numberOfLines={1}>{user.name}</Text>
                    </View>
                    <View style={[styles.bodyCell, styles.roleCol]}>
                      <Text style={styles.roleText}>{user.role}</Text>
                    </View>
                    {daysArray.map((day) => {
                      const { status, text } = getDayStatus(user.id, day);
                      const isPresent = status === 'P';
                      const isOff = status === 'OFF';
                      return (
                        <View
                          key={day}
                          style={[
                            styles.bodyCell,
                            styles.dayCol,
                            isPresent
                              ? styles.presentCell
                              : isOff
                                ? styles.offCell
                                : styles.absentCell
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isPresent
                                ? styles.presentText
                                : isOff
                                  ? styles.offText
                                  : styles.absentText
                            ]}
                          >
                            {text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </Card>
      </ScrollView>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={isFocused}
          icon={fabOpen ? 'close' : 'dots-vertical'}
          testID="reports-fab-group"
          actions={[
            {
              icon: 'file-excel',
              label: 'Excel Export',
              onPress: handleExportExcel,
              testID: 'export-excel-action',
            },
            {
              icon: 'file-pdf-box',
              label: 'PDF Export',
              onPress: handleExportPDF,
              testID: 'export-pdf-action',
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={{ backgroundColor: theme.colors.secondary, borderRadius: 12 }}
          color={theme.colors.onSecondary}
          style={{ paddingBottom: 80, paddingRight: 24 }}
        />

        <Dialog visible={!!savedFile} onDismiss={() => setSavedFile(null)} style={{ borderRadius: 12 }}>
          <Dialog.Title style={{ textAlign: 'center' }}>File Saved</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              Your report has been saved successfully. Would you like to open it now?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
              {savedFile?.name}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'column', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button
              mode="contained"
              onPress={handleOpenSavedFile}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={{ width: '100%', borderRadius: 8 }}
            >
              Open File
            </Button>
            <Button
              mode="text"
              onPress={() => setSavedFile(null)}
              textColor={theme.colors.primary}
              style={{ width: '100%' }}
            >
              Dismiss
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
      gap: 16,
    },
    filterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    monthHeader: {
      fontWeight: '800',
      color: theme.colors.onBackground,
    },
    card: {
      borderRadius: 16,
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    headerCell: {
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    bodyCell: {
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      height: 48,
    },
    headerText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    bodyText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    roleText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
      textTransform: 'uppercase',
    },
    nameCol: {
      width: 140,
    },
    roleCol: {
      width: 90,
    },
    dayCol: {
      width: 65,
      alignItems: 'center',
    },
    presentCell: {
      backgroundColor: theme.dark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    },
    absentCell: {
      backgroundColor: theme.dark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    },
    offCell: {
      backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    presentText: {
      color: theme.dark ? '#4ADE80' : '#15803D',
    },
    absentText: {
      color: theme.dark ? '#F87171' : '#B91C1C',
    },
    offText: {
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
    },
    sundayHeaderCell: {
      backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
    },
    sundayHeaderText: {
      color: theme.colors.error,
    },
    dayText: {
      fontSize: 10,
      fontWeight: '800',
    },
    emptyContainer: {
      width: 600,
    },
  });
