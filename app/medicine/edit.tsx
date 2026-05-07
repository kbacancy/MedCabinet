import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { scheduleMedicineNotifications } from '../../lib/notifications';
import { SmartKeyboardBar } from '../../components/SmartKeyboardBar';
import type { FocusedField } from '../../components/SmartKeyboardBar';
import { suggestCategory } from '../../lib/groq';
import { useAIConsent } from '../../hooks/useAIConsent';

const CATEGORIES = ['Pain Relief', 'Antibiotics', 'Supplements', 'Vitamins', 'Blood Pressure', 'Diabetes', 'Cholesterol', 'Other'];
const BAR_ID = 'edit-smart-bar';

const REMINDER_SLOTS = [
  { label: 'Morning', time: '08:00', emoji: '🌅' },
  { label: 'Noon', time: '12:00', emoji: '☀️' },
  { label: 'Afternoon', time: '15:00', emoji: '🌤' },
  { label: 'Evening', time: '18:00', emoji: '🌇' },
  { label: 'Night', time: '21:00', emoji: '🌙' },
];

export default function EditMedicineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [expiryDate, setExpiryDate] = useState('');
  const [category, setCategory] = useState('Pain Relief');
  const [refillAt, setRefillAt] = useState('5');
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00']);
  const [doctorName, setDoctorName] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [rxNumber, setRxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showPrescription, setShowPrescription] = useState(false);

  const { aiConsentGranted, AIConsentModal } = useAIConsent();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const isInitialLoad = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (name.trim().length < 3) { setAiSuggestedCategory(null); return; }
    setAiSuggesting(true);
    debounceRef.current = setTimeout(async () => {
      if (aiConsentGranted) {
        const suggestion = await suggestCategory(name);
        if (suggestion) { setCategory(suggestion); setAiSuggestedCategory(suggestion); }
      }
      setAiSuggesting(false);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [name]);

  useEffect(() => {
    if (!id) return;
    supabase.from('medicines').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setName(data.name ?? '');
        setDosage(data.dosage ?? '');
        setQuantity(String(data.quantity ?? 0));
        setExpiryDate(data.expiry_date ?? '');
        setCategory(data.category ?? 'Pain Relief');
        setRefillAt(String(data.refill_alert_at ?? 5));
        const rt: string[] = data.reminder_times ?? ['08:00'];
        setReminderTimes(rt.length ? rt : ['08:00']);
        setDoctorName(data.doctor_name ?? '');
        setPharmacy(data.pharmacy ?? '');
        setRxNumber(data.rx_number ?? '');
        setNotes(data.notes ?? '');
        if (data.doctor_name || data.pharmacy || data.rx_number || data.notes) {
          setShowPrescription(true);
        }
      }
      setLoading(false);
      isInitialLoad.current = false;
    });
  }, [id]);

  const toggleReminderTime = (time: string) => {
    setReminderTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time].sort()
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Medicine name is required.'); return; }
    if (reminderTimes.length === 0) { Alert.alert('Error', 'Select at least one reminder time.'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('medicines').update({
      name: name.trim(),
      dosage: dosage.trim(),
      quantity: parseInt(quantity) || 0,
      expiry_date: expiryDate,
      category,
      refill_alert_at: parseInt(refillAt) || 5,
      times_per_day: reminderTimes.length,
      reminder_times: reminderTimes,
      doctor_name: doctorName.trim() || null,
      pharmacy: pharmacy.trim() || null,
      rx_number: rxNumber.trim() || null,
      notes: notes.trim() || null,
    }).eq('id', id as string).select().single();
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (data) await scheduleMedicineNotifications(data);
      router.back();
    }
  };

  const handleDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      setExpiryDate(`${mm}/${dd}/${yyyy}`);
    }
  };

  const parseStoredDate = (): Date => {
    if (!expiryDate) return new Date();
    const [mm, dd, yyyy] = expiryDate.split('/');
    if (mm && dd && yyyy && yyyy.length === 4) {
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    }
    return new Date();
  };

  const barId = Platform.OS === 'ios' ? BAR_ID : undefined;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {AIConsentModal}

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Edit Medicine</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Medicine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Paracetamol"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              inputAccessoryViewID={barId}
              onFocus={() => setFocusedField('name')}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500mg"
                placeholderTextColor={Colors.textMuted}
                value={dosage}
                onChangeText={setDosage}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                inputAccessoryViewID={barId}
                onFocus={() => setFocusedField('dosage')}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                inputAccessoryViewID={barId}
                onFocus={() => setFocusedField('quantity')}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Expiry Date</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.inputFlex, !expiryDate && { color: Colors.textMuted }]}>
                {expiryDate || 'mm/dd/yyyy'}
              </Text>
              <Text style={styles.inputAddon}>📅</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={parseStoredDate()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.categoryLabelRow}>
              <Text style={styles.label}>Category</Text>
              {aiSuggesting && (
                <View style={styles.aiBadge}>
                  <ActivityIndicator size={10} color={Colors.primary} />
                  <Text style={styles.aiBadgeText}>AI suggesting...</Text>
                </View>
              )}
              {!aiSuggesting && aiSuggestedCategory && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>⚡ AI suggested</Text>
                </View>
              )}
            </View>
            <View style={styles.chipsWrap}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    category === cat && styles.chipSelected,
                    category === cat && aiSuggestedCategory === cat && styles.chipAI,
                  ]}
                  onPress={() => { setCategory(cat); setAiSuggestedCategory(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reminder Times */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reminder Times</Text>
            <Text style={styles.subLabel}>Select all times you take this medicine</Text>
            <View style={styles.chipsWrap}>
              {REMINDER_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot.time}
                  style={[styles.chip, reminderTimes.includes(slot.time) && styles.chipSelected]}
                  onPress={() => toggleReminderTime(slot.time)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, reminderTimes.includes(slot.time) && styles.chipTextSelected]}>
                    {slot.emoji} {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Refill Alert (tablets remaining)</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={Colors.textMuted}
              value={refillAt}
              onChangeText={setRefillAt}
              keyboardType="number-pad"
              inputAccessoryViewID={barId}
              onFocus={() => setFocusedField('refill')}
            />
          </View>

          {/* Prescription Info (collapsible) */}
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setShowPrescription(!showPrescription)}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionToggleText}>Prescription Info (optional)</Text>
            <Text style={styles.sectionToggleArrow}>{showPrescription ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showPrescription && (
            <View style={styles.prescriptionSection}>
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Doctor</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dr. Smith"
                    placeholderTextColor={Colors.textMuted}
                    value={doctorName}
                    onChangeText={setDoctorName}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Rx Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="RX-12345"
                    placeholderTextColor={Colors.textMuted}
                    value={rxNumber}
                    onChangeText={setRxNumber}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Pharmacy</Text>
                <TextInput
                  style={styles.input}
                  placeholder="CVS, Walgreens..."
                  placeholderTextColor={Colors.textMuted}
                  value={pharmacy}
                  onChangeText={setPharmacy}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Take with food, avoid alcohol..."
                  placeholderTextColor={Colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SmartKeyboardBar
        nativeID={BAR_ID}
        focusedField={focusedField}
        dosage={dosage}
        quantity={quantity}
        refill={refillAt}
        onDosageChange={setDosage}
        onQuantityChange={setQuantity}
        onRefillChange={setRefillAt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  subLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: 10,
  },
  inputFlex: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  inputAddon: { paddingHorizontal: 14, fontSize: 18 },
  twoCol: { flexDirection: 'row', gap: 12 },
  datePickerWrapper: {
    marginTop: 4, backgroundColor: Colors.inputBg, borderRadius: 10, overflow: 'hidden',
  },
  datePickerDone: {
    alignItems: 'flex-end', padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  datePickerDoneText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.white },
  chipAI: { borderWidth: 2, borderColor: Colors.primary },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  aiBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  sectionToggleText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  sectionToggleArrow: { fontSize: 12, color: Colors.textMuted },
  prescriptionSection: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16,
    paddingVertical: 16, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  saveButton: {
    flex: 2, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', backgroundColor: Colors.primary,
  },
  saveText: { fontSize: 15, color: Colors.white, fontWeight: '600' },
});
