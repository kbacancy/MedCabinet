import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Keyboard, KeyboardEvent, InputAccessoryView,
} from 'react-native';
import { Colors } from '../constants/colors';

export type FocusedField = 'name' | 'dosage' | 'quantity' | 'refill' | null;

interface Props {
  nativeID: string;
  focusedField: FocusedField;
  dosage: string;
  quantity: string;
  refill: string;
  onDosageChange: (v: string) => void;
  onQuantityChange: (v: string) => void;
  onRefillChange: (v: string) => void;
}

const DOSAGE_UNITS = ['mg', 'ml', 'mcg', 'g', 'IU', '%'];
const DOSAGE_VALUES = ['100', '250', '500', '1000'];
const QUANTITY_CHIPS = ['1', '5', '10', '20', '30', '60', '100'];
const REFILL_CHIPS = ['3', '5', '7', '10', '14', '30'];

const UNIT_RE = /(mg|ml|mcg|g|IU|%)$/i;

function applyUnit(current: string, unit: string): string {
  return UNIT_RE.test(current) ? current.replace(UNIT_RE, unit) : current + unit;
}

function applyValue(current: string, value: string): string {
  const match = current.match(UNIT_RE);
  return match ? value + match[0] : value;
}

function BarContent({
  focusedField, dosage, quantity, refill,
  onDosageChange, onQuantityChange, onRefillChange,
}: Omit<Props, 'nativeID'>) {
  const chips = () => {
    if (focusedField === 'dosage') {
      return (
        <>
          {DOSAGE_UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={styles.chipUnit}
              onPress={() => onDosageChange(applyUnit(dosage, u))}
              activeOpacity={0.65}
            >
              <Text style={styles.chipUnitText}>{u}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.chipSep} />
          {DOSAGE_VALUES.map(v => (
            <TouchableOpacity
              key={v}
              style={styles.chipValue}
              onPress={() => onDosageChange(applyValue(dosage, v))}
              activeOpacity={0.65}
            >
              <Text style={styles.chipValueText}>{v}</Text>
            </TouchableOpacity>
          ))}
        </>
      );
    }
    if (focusedField === 'quantity') {
      return QUANTITY_CHIPS.map(v => (
        <TouchableOpacity
          key={v}
          style={styles.chipValue}
          onPress={() => onQuantityChange(v)}
          activeOpacity={0.65}
        >
          <Text style={styles.chipValueText}>{v}</Text>
        </TouchableOpacity>
      ));
    }
    if (focusedField === 'refill') {
      return REFILL_CHIPS.map(v => (
        <TouchableOpacity
          key={v}
          style={styles.chipValue}
          onPress={() => onRefillChange(v)}
          activeOpacity={0.65}
        >
          <Text style={styles.chipValueText}>{v}</Text>
        </TouchableOpacity>
      ));
    }
    return null;
  };

  const chipsContent = chips();

  return (
    <View style={styles.bar}>
      {chipsContent ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="always"
          style={styles.chipsScroll}
          bounces={false}
        >
          {chipsContent}
        </ScrollView>
      ) : (
        <View style={styles.chipsScroll} />
      )}
      <View style={styles.doneArea}>
        <View style={styles.vertLine} />
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={Keyboard.dismiss}
          activeOpacity={0.75}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SmartKeyboardBar(props: Props) {
  if (Platform.OS === 'ios') {
    return (
      <InputAccessoryView nativeID={props.nativeID}>
        <BarContent {...props} />
      </InputAccessoryView>
    );
  }
  return <AndroidBar {...props} />;
}

function AndroidBar(props: Props) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setVisible(true);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.androidWrap, { bottom: keyboardHeight }]}>
      <BarContent {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
    minHeight: 48,
  },
  androidWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
  },
  chipsScroll: { flex: 1 },
  chipsRow: {
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipUnit: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipUnitText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  chipValue: {
    backgroundColor: '#EBEBEB',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipValueText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  chipSep: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#C7C7CC',
    marginHorizontal: 4,
  },
  doneArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 4,
  },
  vertLine: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#C7C7CC',
    marginRight: 12,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
