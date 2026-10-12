import React, { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, CloseIcon } from '@/components/icons';
import { PrimaryButton } from '@/components/palora/ui';
import { colors } from '@/constants/theme';

const MONTHS = [
  { value: 1, label: 'Jan', full: 'January' },
  { value: 2, label: 'Feb', full: 'February' },
  { value: 3, label: 'Mar', full: 'March' },
  { value: 4, label: 'Apr', full: 'April' },
  { value: 5, label: 'May', full: 'May' },
  { value: 6, label: 'Jun', full: 'June' },
  { value: 7, label: 'Jul', full: 'July' },
  { value: 8, label: 'Aug', full: 'August' },
  { value: 9, label: 'Sep', full: 'September' },
  { value: 10, label: 'Oct', full: 'October' },
  { value: 11, label: 'Nov', full: 'November' },
  { value: 12, label: 'Dec', full: 'December' },
];

const ITEM_HEIGHT = 44;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatBirthday(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return isoDate;
  const mObj = MONTHS.find((item) => item.value === m);
  return `${mObj?.full ?? m} ${d}, ${y}`;
}

export function getAgeFromBirthday(isoDate?: string | null): number | null {
  if (!isoDate) return null;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const monthDiff = now.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) {
    age--;
  }
  return age;
}

export type BirthdayPickerSheetProps = {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
};

export function BirthdayPickerSheet({
  visible,
  value,
  onClose,
  onSelect,
}: BirthdayPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const currentYear = now.getFullYear();
  const maxAllowedYear = currentYear - 18;
  const minAllowedYear = currentYear - 100;

  // Generate Year options: descending from maxAllowedYear down to minAllowedYear
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxAllowedYear; y >= minAllowedYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [maxAllowedYear, minAllowedYear]);

  // Initial parsed values or fallback
  const parsed = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
      return { year: y, month: m, day: d };
    }
    return { year: currentYear - 24, month: 6, day: 15 };
  }, [value, currentYear]);

  const [selectedYear, setSelectedYear] = useState(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [selectedDay, setSelectedDay] = useState(parsed.day);

  // Sync state when sheet becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedYear(parsed.year);
      setSelectedMonth(parsed.month);
      setSelectedDay(parsed.day);
    }
  }, [visible, parsed]);

  // Adjust day if month/year changes and day exceeds max
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(d);
    }
    return arr;
  }, [daysInMonth]);

  // Live Age Calculation
  const age = useMemo(() => {
    let a = currentYear - selectedYear;
    const mDiff = now.getMonth() + 1 - selectedMonth;
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < selectedDay)) {
      a--;
    }
    return a;
  }, [selectedYear, selectedMonth, selectedDay, currentYear]);

  const isOldEnough = age >= 18;

  const handleConfirm = () => {
    if (!isOldEnough) return;
    const mm = String(selectedMonth).padStart(2, '0');
    const dd = String(selectedDay).padStart(2, '0');
    onSelect(`${selectedYear}-${mm}-${dd}`);
    onClose();
  };

  const monthObj = MONTHS.find((m) => m.value === selectedMonth);
  const dateFormatted = `${monthObj?.full ?? ''} ${selectedDay}, ${selectedYear}`;

  const monthIndex = MONTHS.findIndex((m) => m.value === selectedMonth);
  const dayIndex = Math.max(0, selectedDay - 1);
  const yearIndex = Math.max(0, years.indexOf(selectedYear));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable onPress={(e) => e.stopPropagation()} className="fz-sheet px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
          <View className="fz-handle" />

          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 pt-1">
            <View>
              <Text className="text-xl font-bold text-fz-ink">Select Birthday</Text>
              <Text className="text-xs text-fz-muted">You must be 18 or older to use Palora</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
              <CloseIcon size={16} color={colors.ink} />
            </Pressable>
          </View>

          {/* Live Preview Card */}
          <View className="my-3 flex-row items-center justify-between rounded-2xl border border-fz-border/60 bg-fz-soft p-4">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-fz-muted">Birth Date</Text>
              <Text className="text-lg font-bold text-fz-ink">{dateFormatted}</Text>
            </View>
            <View
              className={`rounded-full px-3 py-1.5 ${
                isOldEnough ? 'bg-fz-plum' : 'bg-red-500'
              }`}>
              <Text className="text-xs font-bold text-white">
                {isOldEnough ? `${age} years old` : 'Under 18 (Restricted)'}
              </Text>
            </View>
          </View>

          {/* Pickers Header */}
          <View className="mt-1 flex-row border-b border-fz-border/50 pb-2">
            <Text className="flex-[1.2] text-center text-xs font-bold uppercase tracking-wider text-fz-muted">Month</Text>
            <Text className="flex-1 text-center text-xs font-bold uppercase tracking-wider text-fz-muted">Day</Text>
            <Text className="flex-[1.2] text-center text-xs font-bold uppercase tracking-wider text-fz-muted">Year</Text>
          </View>

          {/* 3 Wheel Columns */}
          <View className="h-44 flex-row py-1">
            {/* Month Column */}
            <View className="flex-[1.2] px-1">
              <FlatList
                data={MONTHS}
                keyExtractor={(item) => String(item.value)}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={monthIndex >= 0 ? monthIndex : 0}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const active = item.value === selectedMonth;
                  return (
                    <Pressable
                      onPress={() => setSelectedMonth(item.value)}
                      style={{ height: ITEM_HEIGHT }}
                      className={`items-center justify-center rounded-xl transition-all ${
                        active ? 'bg-fz-plum shadow-xs' : 'active:bg-fz-soft'
                      }`}>
                      <Text
                        className={`text-base font-semibold ${
                          active ? 'text-white' : 'text-fz-ink/80'
                        }`}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* Day Column */}
            <View className="flex-1 border-x border-fz-border/40 px-1">
              <FlatList
                data={days}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={dayIndex >= 0 && dayIndex < days.length ? dayIndex : 0}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const active = item === selectedDay;
                  return (
                    <Pressable
                      onPress={() => setSelectedDay(item)}
                      style={{ height: ITEM_HEIGHT }}
                      className={`items-center justify-center rounded-xl transition-all ${
                        active ? 'bg-fz-plum shadow-xs' : 'active:bg-fz-soft'
                      }`}>
                      <Text
                        className={`text-base font-semibold ${
                          active ? 'text-white' : 'text-fz-ink/80'
                        }`}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* Year Column */}
            <View className="flex-[1.2] px-1">
              <FlatList
                data={years}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={yearIndex >= 0 ? yearIndex : 0}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const active = item === selectedYear;
                  return (
                    <Pressable
                      onPress={() => setSelectedYear(item)}
                      style={{ height: ITEM_HEIGHT }}
                      className={`items-center justify-center rounded-xl transition-all ${
                        active ? 'bg-fz-plum shadow-xs' : 'active:bg-fz-soft'
                      }`}>
                      <Text
                        className={`text-base font-semibold ${
                          active ? 'text-white' : 'text-fz-ink/80'
                        }`}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>

          {/* Action CTA */}
          <View className="mt-4">
            <PrimaryButton
              label={isOldEnough ? 'Confirm Birthday' : 'Must be 18 or older'}
              onPress={handleConfirm}
              disabled={!isOldEnough}
              variant={isOldEnough ? 'plum' : 'ghost'}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type BirthdayFieldProps = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  hint?: string;
  placeholder?: string;
  variant?: 'app' | 'auth';
  disabled?: boolean;
};

export function BirthdayField({
  label = 'Birthday',
  value,
  onChange,
  hint,
  placeholder = 'Select your birth date',
  variant = 'app',
  disabled = false,
}: BirthdayFieldProps) {
  const [open, setOpen] = useState(false);
  const formatted = formatBirthday(value);
  const age = getAgeFromBirthday(value);

  const isAuth = variant === 'auth';

  return (
    <View className={isAuth ? 'w-full gap-1' : 'mb-4'}>
      {label ? (
        <Text
          className={`text-xs font-semibold uppercase tracking-wider ${
            isAuth ? 'text-auth-muted' : 'text-fz-muted mb-1.5'
          }`}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`h-14 flex-row items-center justify-between rounded-2xl border px-4 transition-colors ${
          isAuth ? 'border-auth-border bg-white' : 'border-fz-border bg-white active:bg-fz-soft'
        } ${disabled ? 'opacity-60' : ''}`}>
        <View className="flex-row items-center gap-2">
          {formatted ? (
            <>
              <Text className={`text-base font-medium ${isAuth ? 'text-auth-ink' : 'text-fz-ink'}`}>
                {formatted}
              </Text>
              {age !== null ? (
                <View className="rounded-full bg-fz-soft px-2.5 py-0.5 border border-fz-border/40">
                  <Text className="text-xs font-bold text-fz-plum">{age} yrs</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text className="text-base text-[#9EA3AE]">{placeholder}</Text>
          )}
        </View>

        <CalendarIcon size={20} color={isAuth ? '#9EA3AE' : colors.plum} />
      </Pressable>

      {hint ? <Text className="mt-1 text-xs text-fz-muted">{hint}</Text> : null}

      <BirthdayPickerSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={onChange}
      />
    </View>
  );
}
