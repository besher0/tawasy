import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import theme from '../theme';

const arabicMonths = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

const arabicWeekdays = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const shortWeekdays = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

const quickTimes = [
  { value: '10:00', label: '10:00 صباحاً' },
  { value: '12:00', label: '12:00 ظهراً' },
  { value: '16:00', label: '04:00 مساءً' },
  { value: '18:00', label: '06:00 مساءً' },
];

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date();
  }

  return date;
}

function serializeDate(date: Date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-');
}

function parseTimeValue(value: string) {
  const [parsedHour, parsedMinute] = value.split(':').map(Number);

  return {
    hour:
      Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23
        ? parsedHour
        : 16,
    minute:
      Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59
        ? parsedMinute
        : 0,
  };
}

export function formatDeliveryDate(value: string) {
  const date = parseDateValue(value);

  return `${arabicWeekdays[date.getDay()]}، ${date.getDate()} ${
    arabicMonths[date.getMonth()]
  } ${date.getFullYear()}`;
}

export function formatDeliveryTime(value: string) {
  const { hour, minute } = parseTimeValue(value);
  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? 'صباحاً' : 'مساءً';

  return `${padNumber(displayHour)}:${padNumber(minute)} ${period}`;
}

function PickerShell({
  visible,
  title,
  subtitle,
  onClose,
  onConfirm,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableOpacity
          accessibilityLabel="إغلاق"
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={styles.modalCard}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            </View>

            {children}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                <Text style={styles.confirmButtonText}>تأكيد الاختيار</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function DeliveryDatePicker({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const [draftDate, setDraftDate] = useState(value);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseDateValue(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    const selectedDate = parseDateValue(value);
    setDraftDate(serializeDate(selectedDate));
    setVisibleMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
  }, [value, visible]);

  const weeks = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayOffset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let index = 0; index < firstDayOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const calendarWeeks: Array<Array<Date | null>> = [];
    for (let index = 0; index < cells.length; index += 7) {
      calendarWeeks.push(cells.slice(index, index + 7));
    }

    return calendarWeeks;
  }, [visibleMonth]);

  const today = serializeDate(new Date());
  const selectedDate = parseDateValue(draftDate);

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const selectToday = () => {
    const date = new Date();
    setDraftDate(serializeDate(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  return (
    <PickerShell
      visible={visible}
      title="اختيار تاريخ التسليم"
      subtitle={formatDeliveryDate(draftDate)}
      onClose={onClose}
      onConfirm={() => onConfirm(draftDate)}
    >
      <View style={styles.monthNavigation}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => changeMonth(-1)}
        >
          <Text style={styles.navigationButtonText}>السابق</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {arabicMonths[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => changeMonth(1)}
        >
          <Text style={styles.navigationButtonText}>التالي</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {shortWeekdays.map((day) => (
          <Text key={day} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <View
                    key={`blank-${weekIndex}-${dayIndex}`}
                    style={styles.dayCell}
                  />
                );
              }

              const dateValue = serializeDate(date);
              const isSelected = dateValue === draftDate;
              const isToday = dateValue === today;

              return (
                <View key={dateValue} style={styles.dayCell}>
                  <TouchableOpacity
                    accessibilityLabel={formatDeliveryDate(dateValue)}
                    style={[
                      styles.dayButton,
                      isToday ? styles.todayButton : null,
                      isSelected ? styles.selectedDayButton : null,
                    ]}
                    onPress={() => setDraftDate(dateValue)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday ? styles.todayText : null,
                        isSelected ? styles.selectedDayText : null,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.calendarFooter}>
        <TouchableOpacity style={styles.todayShortcut} onPress={selectToday}>
          <Text style={styles.todayShortcutText}>العودة إلى اليوم</Text>
        </TouchableOpacity>
        <Text style={styles.selectedDateHint}>
          {selectedDate.getDate()} {arabicMonths[selectedDate.getMonth()]}
        </Text>
      </View>
    </PickerShell>
  );
}

function TimeUnit({
  label,
  value,
  onIncrease,
  onDecrease,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View style={styles.timeUnit}>
      <Text style={styles.timeUnitLabel}>{label}</Text>
      <TouchableOpacity style={styles.timeControlButton} onPress={onIncrease}>
        <Text style={styles.timeControlButtonText}>+</Text>
      </TouchableOpacity>
      <Text style={styles.timeUnitValue}>{value}</Text>
      <TouchableOpacity style={styles.timeControlButton} onPress={onDecrease}>
        <Text style={styles.timeControlButtonText}>-</Text>
      </TouchableOpacity>
    </View>
  );
}

export function DeliveryTimePicker({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const [hour, setHour] = useState(parsedValue.hour);
  const [minute, setMinute] = useState(parsedValue.minute);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const parsed = parseTimeValue(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
  }, [value, visible]);

  const draftTime = `${padNumber(hour)}:${padNumber(minute)}`;

  const changeMinute = (offset: number) => {
    const totalMinutes = hour * 60 + minute + offset;
    const normalizedMinutes = (totalMinutes + 24 * 60) % (24 * 60);
    setHour(Math.floor(normalizedMinutes / 60));
    setMinute(normalizedMinutes % 60);
  };

  const selectQuickTime = (time: string) => {
    const parsed = parseTimeValue(time);
    setHour(parsed.hour);
    setMinute(parsed.minute);
  };

  return (
    <PickerShell
      visible={visible}
      title="اختيار وقت التسليم"
      subtitle={formatDeliveryTime(draftTime)}
      onClose={onClose}
      onConfirm={() => onConfirm(draftTime)}
    >
      <View style={styles.timePicker}>
        <TimeUnit
          label="الساعة"
          value={padNumber(hour)}
          onIncrease={() => setHour((current) => (current + 1) % 24)}
          onDecrease={() => setHour((current) => (current + 23) % 24)}
        />

        <Text style={styles.timeSeparator}>:</Text>

        <TimeUnit
          label="الدقائق"
          value={padNumber(minute)}
          onIncrease={() => changeMinute(5)}
          onDecrease={() => changeMinute(-5)}
        />
      </View>

      <View style={styles.quickSection}>
        <Text style={styles.quickSectionTitle}>أوقات سريعة</Text>
        <View style={styles.quickTimeGrid}>
          {quickTimes.map((time) => {
            const active = draftTime === time.value;

            return (
              <TouchableOpacity
                key={time.value}
                style={[
                  styles.quickTimeButton,
                  active ? styles.quickTimeButtonActive : null,
                ]}
                onPress={() => selectQuickTime(time.value)}
              >
                <Text
                  style={[
                    styles.quickTimeText,
                    active ? styles.quickTimeTextActive : null,
                  ]}
                >
                  {time.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </PickerShell>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 27, 41, 0.58)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  modalContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  modalTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  modalSubtitle: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  monthNavigation: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  navigationButton: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  navigationButtonText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  monthTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  calendar: {
    gap: theme.spacing.xs,
  },
  weekRow: {
    flexDirection: 'row-reverse',
  },
  weekdayText: {
    width: `${100 / 7}%`,
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectedDayButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  todayText: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_700Bold',
  },
  selectedDayText: {
    color: theme.colors.onPrimary,
    fontFamily: 'Cairo_700Bold',
  },
  calendarFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayShortcut: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  todayShortcutText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  selectedDateHint: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  confirmButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  confirmButtonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  timeUnit: {
    width: 112,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeUnitLabel: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  timeControlButton: {
    width: 48,
    height: 38,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  timeControlButtonText: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  timeUnitValue: {
    minWidth: 92,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    fontFamily: 'Cairo_700Bold',
    fontSize: 32,
    lineHeight: 42,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  timeSeparator: {
    marginTop: theme.spacing.lg,
    fontFamily: 'Cairo_700Bold',
    fontSize: 32,
    color: theme.colors.primary,
  },
  quickSection: {
    gap: theme.spacing.sm,
  },
  quickSectionTitle: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  quickTimeGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickTimeButton: {
    width: '48%',
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  quickTimeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  quickTimeText: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  quickTimeTextActive: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_700Bold',
  },
});
