import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  StatusBar, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useSymptomLogs, RATING_FACES, RATING_LABELS } from '../../hooks/useSymptomLogs';
import type { Medicine } from '../../hooks/useMedicines';

export default function AddSymptomScreen() {
  const router = useRouter();
  const { medicineId: prefillId } = useLocalSearchParams<{ medicineId?: string }>();
  const { addLog } = useSymptomLogs();

  const [rating, setRating] = useState(0);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(prefillId ?? null);
  const [note, setNote] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('medicines')
        .select('id, name, dosage, quantity, expiry_date, category, refill_alert_at, created_at, user_id')
        .eq('user_id', user.id)
        .is('member_id', null)
        .order('name')
        .then(({ data }) => setMedicines((data as Medicine[]) ?? []));
    });
  }, []);

  const handleSave = async () => {
    if (rating === 0) { Alert.alert('Select how you feel first'); return; }
    setSaving(true);
    const result = await addLog({ medicine_id: selectedMedId, rating, note });
    setSaving(false);
    if (result) router.back();
    else Alert.alert('Error', 'Could not save. Please try again.');
  };

  const canSave = rating > 0 && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Feeling</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={!canSave}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.ratingCard}>
          <View style={styles.facesRow}>
            {[1, 2, 3, 4, 5].map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setRating(r)}
                style={[styles.faceBtn, rating === r && styles.faceBtnSelected]}
                activeOpacity={0.75}
              >
                <Text style={styles.faceEmoji}>{RATING_FACES[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.ratingLabel, rating === 0 && { color: Colors.textMuted }]}>
            {rating > 0 ? RATING_LABELS[rating] : 'Tap a face to rate'}
          </Text>
        </View>

        {medicines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Medicine (optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipContent}
            >
              <TouchableOpacity
                style={[styles.chip, selectedMedId === null && styles.chipActive]}
                onPress={() => setSelectedMedId(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selectedMedId === null && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {medicines.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, selectedMedId === m.id && styles.chipActive]}
                  onPress={() => setSelectedMedId(prev => prev === m.id ? null : m.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selectedMedId === m.id && styles.chipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Side effects, improvements, anything worth noting…"
          placeholderTextColor={Colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  cancelBtn: { minWidth: 64, padding: 4 },
  cancelText: { fontSize: 16, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { minWidth: 64, padding: 4, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  saveTextDisabled: { color: Colors.textMuted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 10, marginLeft: 2,
  },
  ratingCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  facesRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  faceBtn: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.inputBg,
  },
  faceBtnSelected: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.primary,
  },
  faceEmoji: { fontSize: 28 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  chipScroll: { marginBottom: 24 },
  chipContent: { gap: 8, paddingRight: 4 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  noteInput: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    fontSize: 14, color: Colors.textPrimary, minHeight: 110,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
});
