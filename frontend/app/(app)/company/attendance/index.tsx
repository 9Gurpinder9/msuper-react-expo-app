// frontend/app/(app)/company/attendance/index.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, Animated } from 'react-native';
import {
  Text,
  Button,
  Card,
  useTheme,
  Portal,
  IconButton,
  FAB,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { fetchJson } from '@utils/network';
import { API_BASE_URL } from '@config';
import type { AppTheme } from '../../../../src/theme/types';

interface CalendarModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  theme: AppTheme;
  styles: any;
}

function CalendarModal({
  visible,
  onDismiss,
  selectedDate,
  onSelectDate,
  theme,
  styles,
}: CalendarModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (visible) {
      setCurrentYear(selectedDate.getFullYear());
      setCurrentMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonthDays = Array.from({ length: firstDayIndex }, () => null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allDays = [...prevMonthDays, ...monthDays];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const maxNext = new Date(currentYear, currentMonth + 1, 1);
    if (maxNext > today) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isNextMonthDisabled = new Date(currentYear, currentMonth + 1, 1) > today;

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.calendarDialog}>
        <Dialog.Title style={{ textAlign: 'center', fontWeight: '800' }}>Select Date</Dialog.Title>
        <Dialog.Content>
          <View style={styles.calendarHeader}>
            <IconButton icon="chevron-left" onPress={handlePrevMonth} />
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <IconButton icon="chevron-right" onPress={handleNextMonth} disabled={isNextMonthDisabled} />
          </View>
          <View style={styles.calendarGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <View key={idx} style={styles.calendarDayHeaderCell}>
                <Text style={styles.calendarDayHeaderLabel}>{day}</Text>
              </View>
            ))}
            {allDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return <View key={`empty-${idx}`} style={styles.calendarCellEmpty} />;
              }
              const thisDate = new Date(currentYear, currentMonth, dayNum);
              thisDate.setHours(0, 0, 0, 0);
              const isFuture = thisDate > today;
              const isSelected =
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear;

              return (
                <Pressable
                  key={`day-${dayNum}`}
                  disabled={isFuture}
                  onPress={() => {
                    onSelectDate(thisDate);
                    onDismiss();
                  }}
                  style={({ pressed }) => [
                    styles.calendarCell,
                    isSelected && { backgroundColor: theme.colors.primary },
                    isFuture && { opacity: 0.25 },
                    pressed && !isFuture && { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarCellText,
                      isSelected && { color: theme.colors.onPrimary, fontWeight: '700' },
                      isFuture && { color: theme.colors.onSurfaceDisabled },
                    ]}
                  >
                    {dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

interface CollapsibleAddressProps {
  expanded: boolean;
  address: string;
  style: any;
}

function CollapsibleAddress({ expanded, address, style }: CollapsibleAddressProps) {
  const animatedHeight = React.useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = React.useState(0);

  React.useEffect(() => {
    // Add a 16px safety buffer to account for margins/padding and prevent text clipping
    const targetHeight = expanded ? (measuredHeight > 0 ? measuredHeight + 16 : 0) : 0;
    Animated.timing(animatedHeight, {
      toValue: targetHeight,
      duration: 600, // Smooth slow slide animation (600ms)
      useNativeDriver: false,
    }).start();
  }, [expanded, measuredHeight]);

  return (
    <View style={{ width: '100%', overflow: 'hidden' }}>
      {measuredHeight === 0 && (
        <Text
          onLayout={(e) => setMeasuredHeight(Math.ceil(e.nativeEvent.layout.height))}
          style={[style, { position: 'absolute', opacity: 0, marginTop: 0 }]}
        >
          {address}
        </Text>
      )}
      <Animated.View style={{ height: animatedHeight, width: '100%' }}>
        <Text style={style}>{address}</Text>
      </Animated.View>
    </View>
  );
}

export default function AttendanceScreen() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchedOut, setPunchedOut] = useState(false);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateRecords, setSelectedDateRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  const toggleLocation = (key: string) => {
    setExpandedLocations((prev) => {
      const isExpanding = !prev[key];
      if (isExpanding) {
        setTimeout(() => {
          setExpandedLocations((curr) => ({ ...curr, [key]: false }));
        }, 10000);
      }
      return { ...prev, [key]: isExpanding };
    });
  };

  // Fetch selected date logs and shift status
  useEffect(() => {
    initScreen();
  }, []);

  useEffect(() => {
    fetchDateHistory(selectedDate);
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (isToday) {
      fetchTodayStatus();
    }
  }, [selectedDate]);

  const initScreen = async () => {
    setLoading(true);
    try {
      await fetchTodayStatus();
    } catch (err: any) {
      showError('Failed to initialize status.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/attendance/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        setPunchedIn(res.data.punchedIn);
        setPunchedOut(res.data.punchedOut);
      }
    } catch (err) {
      console.error('Failed to get status', err);
    }
  };

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDateHistory = async (date: Date) => {
    setLoadingHistory(true);
    try {
      const formattedDate = getLocalDateString(date);
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/attendance/history?date=${formattedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data && res.data.data) {
        setSelectedDateRecords(res.data.data);
      } else {
        setSelectedDateRecords([]);
      }
    } catch (err) {
      showError('Failed to load history for selected date.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (next > today) return;
    setSelectedDate(next);
  };

  const isNextDayDisabled = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return next > today;
  };

  const formatSelectedDateStr = () => {
    const today = new Date();
    const formatted = selectedDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (selectedDate.toDateString() === today.toDateString()) {
      return `Today (${formatted})`;
    }
    return formatted;
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <TopAppBar title="Attendance" showBack onBackPress={() => router.back()} />
        <AppLoader message="Loading attendance profile..." icon="clock-outline" />
      </View>
    );
  }

  const themeCardBg = theme.dark ? theme.colors.surface : '#FFFFFF';
  const isTodaySelected = selectedDate.toDateString() === new Date().toDateString();

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Attendance"
        showBack
        onBackPress={() => router.back()}
      />

      {/* Date filter strip */}
      <View style={styles.dateFilterBar}>
        <IconButton icon="chevron-left" onPress={handlePrevDay} />
        <Pressable onPress={() => setShowCalendarModal(true)} style={styles.dateLabelButton}>
          <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
          <Text style={styles.dateLabelText}>{formatSelectedDateStr()}</Text>
        </Pressable>
        <IconButton icon="chevron-right" onPress={handleNextDay} disabled={isNextDayDisabled()} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.centeredContent}>
          {loadingHistory ? (
            <AppLoader message="Retrieving logs..." icon="clock-outline" />
          ) : selectedDateRecords && selectedDateRecords.length > 0 ? (
            selectedDateRecords.map((record, index) => {
              const isActive = !record.punch_out_time;
              return (
                <Card
                  key={record.id}
                  style={[styles.card, { backgroundColor: themeCardBg, marginBottom: 12 }]}
                  mode="outlined"
                >
                  <Card.Content style={styles.cardContent}>
                    <Text variant="titleMedium" style={[styles.logsCardTitle, { color: theme.colors.primary, fontWeight: '700' }]}>
                      Shift {selectedDateRecords.length - index}
                    </Text>
                  <View style={styles.logBoxContainer}>
                    <View style={styles.historyRow}>
                      <View
                        style={[
                          styles.historyCol,
                          isActive && {
                            borderColor: theme.colors.primary,
                            borderWidth: 1.5,
                            backgroundColor: theme.dark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.08)',
                          },
                        ]}
                      >
                        <Text style={[styles.historyLabel, isActive && { color: theme.colors.primary }]}>PUNCH IN {isActive && '(ACTIVE)'}</Text>
                        <Text style={styles.historyTime}>
                          {new Date(record.punch_in_time).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </Text>
                        {record.punch_in_location_address && (
                          <>
                            <Pressable
                              onPress={() => toggleLocation(`${record.id}-in`)}
                              style={styles.locationToggleBtn}
                            >
                              <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.primary} />
                              <Text style={styles.locationToggleText}>Location</Text>
                            </Pressable>
                            <CollapsibleAddress
                              expanded={!!expandedLocations[`${record.id}-in`]}
                              address={record.punch_in_location_address}
                              style={styles.logAddressText}
                            />
                          </>
                        )}
                      </View>
                      <View style={styles.historyCol}>
                        <Text style={styles.historyLabel}>PUNCH OUT</Text>
                        {record.punch_out_time ? (
                          <>
                            <Text style={styles.historyTime}>
                              {new Date(record.punch_out_time).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
                            {record.punch_out_location_address && (
                              <>
                                <Pressable
                                  onPress={() => toggleLocation(`${record.id}-out`)}
                                  style={styles.locationToggleBtn}
                                >
                                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.primary} />
                                  <Text style={styles.locationToggleText}>Location</Text>
                                </Pressable>
                                <CollapsibleAddress
                                  expanded={!!expandedLocations[`${record.id}-out`]}
                                  address={record.punch_out_location_address}
                                  style={styles.logAddressText}
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Text style={[styles.historyTime, { color: theme.colors.secondary, fontStyle: 'italic', fontSize: 14, marginTop: 4 }]}>
                              Pending...
                            </Text>
                            <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                              Active shift in progress
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    {record.punch_out_time && (
                      <View style={styles.durationRow}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.durationText}>
                          Shift Duration: {record.total_minutes} mins
                        </Text>
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
              );
            })
          ) : (
            <Card style={[styles.card, { backgroundColor: themeCardBg }]} mode="outlined">
              <Card.Content style={[styles.cardContent, { alignItems: 'center', paddingVertical: 48 }]}>
                <MaterialCommunityIcons name="calendar-alert" size={48} color={theme.colors.outline} />
                <Text variant="titleMedium" style={{ fontWeight: '700', marginTop: 16 }}>
                  No Records Logged
                </Text>
                <Text variant="bodyMedium" style={{ opacity: 0.7, textAlign: 'center', marginTop: 8 }}>
                  There are no punch logs registered for this date.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Dynamic bottom-left Reports FAB with glassmorphism */}
      <View style={styles.fabContainerLeft}>
        <FAB
          style={styles.glassFabSmall}
          size="small"
          icon="file-chart-outline"
          testID="view-reports-fab"
          color={theme.colors.primary}
          onPress={() => router.push('/company/attendance/reports')}
        />
      </View>

      {/* Dynamic bottom-right Mark Attendance FAB with glassmorphism */}
      {isTodaySelected && (
        <View style={styles.fabContainerRight}>
          <FAB
            style={styles.glassFab}
            label={punchedIn && !punchedOut ? 'Punch Out' : 'Punch In'}
            icon={punchedIn && !punchedOut ? 'logout' : 'login'}
            color={theme.colors.primary}
            onPress={() => router.push('/company/attendance/mark')}
          />
        </View>
      )}

      {/* Render calendar grid dialog */}
      <CalendarModal
        visible={showCalendarModal}
        onDismiss={() => setShowCalendarModal(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        theme={theme}
        styles={styles}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dateFilterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    dateLabelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
    },
    dateLabelText: {
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    scrollContent: {
      padding: 16,
    },
    centeredContent: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 500,
      gap: 16,
    },
    card: {
      borderRadius: 24,
      borderColor: theme.colors.outline,
      borderWidth: 1,
    },
    cardContent: {
      padding: 24,
    },
    logsCardTitle: {
      fontWeight: '800',
      marginBottom: 20,
      color: theme.colors.onSurface,
      letterSpacing: -0.5,
    },
    logBoxContainer: {
      gap: 16,
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    historyCol: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
      alignItems: 'center',
      gap: 6,
    },
    historyLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    historyTime: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    logAddressText: {
      fontSize: 11,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
      marginTop: 8,
    },
    locationToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    locationToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
    durationText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },
    fabContainerLeft: {
      position: 'absolute',
      left: 24,
      bottom: 80,
      zIndex: 1000,
    },
    fabContainerRight: {
      position: 'absolute',
      right: 24,
      bottom: 80,
      zIndex: 1000,
    },
    glassFab: {
      backgroundColor: theme.dark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    glassFabSmall: {
      backgroundColor: theme.dark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 12,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    calendarDialog: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarDayHeaderCell: {
      width: '14.28%',
      alignItems: 'center',
      marginVertical: 4,
    },
    calendarDayHeaderLabel: {
      fontWeight: '700',
      opacity: 0.6,
      fontSize: 12,
    },
    calendarCellEmpty: {
      width: '14.28%',
    },
    calendarCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 100,
      marginVertical: 4,
    },
    calendarCellText: {
      fontSize: 13,
    },
  });
