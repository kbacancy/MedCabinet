import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useMedicalId } from '../hooks/useMedicalId';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function MedicalIdScreen() {
  const router = useRouter();
  const { medicalId, loading, saving, save } = useMedicalId();

  const [editing, setEditing] = useState(false);
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setBloodType(medicalId.blood_type ?? '');
    setAllergies(medicalId.allergies ?? '');
    setContactName(medicalId.emergency_contact_name ?? '');
    setContactPhone(medicalId.emergency_contact_phone ?? '');
    setNotes(medicalId.notes ?? '');
  }, [medicalId]);

  const handleSave = async () => {
    const ok = await save({
      blood_type: bloodType,
      allergies,
      emergency_contact_name: contactName,
      emergency_contact_phone: contactPhone,
      notes,
    });
    if (ok) {
      setEditing(false);
    } else {
      Alert.alert('Error', 'Could not save. Please check your connection.');
    }
  };

  const handleCancel = () => {
    setBloodType(medicalId.blood_type ?? '');
    setAllergies(medicalId.allergies ?? '');
    setContactName(medicalId.emergency_contact_name ?? '');
    setContactPhone(medicalId.emergency_contact_phone ?? '');
    setNotes(medicalId.notes ?? '');
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isEmpty = !bloodType && !allergies && !contactName;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Medical ID</Text>
        {editing ? (
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.navAction}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.navAction}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyIcon}>🆘</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Medical ID</Text>
              <Text style={styles.emergencySubtitle}>
                Visible to first responders. Keep this information up to date.
              </Text>
            </View>
          </View>

          {isEmpty && !editing && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🩺</Text>
              <Text style={styles.emptyTitle}>No Medical ID set</Text>
              <Text style={styles.emptyDesc}>Tap Edit to add your blood type, allergies and emergency contact.</Text>
              <TouchableOpacity style={styles.setupBtn} onPress={() => setEditing(true)}>
                <Text style={styles.setupBtnText}>Set Up Medical ID</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Blood Type */}
          <Text style={styles.sectionLabel}>Blood Type</Text>
          {editing ? (
            <View style={styles.chipsWrap}>
              {BLOOD_TYPES.map(bt => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.chip, bloodType === bt && styles.chipSelected]}
                  onPress={() => setBloodType(bt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, bloodType === bt && styles.chipTextSelected]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Blood Type</Text>
              <Text style={[styles.infoValue, !bloodType && styles.infoEmpty]}>
                {bloodType || 'Not set'}
              </Text>
            </View>
          )}

          {/* Allergies */}
          <Text style={styles.sectionLabel}>Allergies & Medications to Avoid</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. Penicillin, Aspirin, Peanuts..."
              placeholderTextColor={Colors.textMuted}
              value={allergies}
              onChangeText={setAllergies}
              multiline
              numberOfLines={3}
            />
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Allergies</Text>
              <Text style={[styles.infoValue, !allergies && styles.infoEmpty]}>
                {allergies || 'None listed'}
              </Text>
            </View>
          )}

          {/* Emergency Contact */}
          <Text style={styles.sectionLabel}>Emergency Contact</Text>
          {editing ? (
            <>
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Contact name"
                placeholderTextColor={Colors.textMuted}
                value={contactName}
                onChangeText={setContactName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={Colors.textMuted}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Contact Name</Text>
              <Text style={[styles.infoValue, !contactName && styles.infoEmpty]}>
                {contactName || 'Not set'}
              </Text>
              {contactPhone ? (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 10 }]}>Phone</Text>
                  <Text style={styles.infoValue}>{contactPhone}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Notes */}
          <Text style={styles.sectionLabel}>Medical Notes</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. Type 2 Diabetic, pacemaker, on blood thinners..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={[styles.infoValue, !notes && styles.infoEmpty]}>
                {notes || 'None'}
              </Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {editing && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.saveText}>Save Medical ID</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: Colors.primary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  navAction: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  emergencyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.dangerLight, borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#F5C0BF',
  },
  emergencyIcon: { fontSize: 28 },
  emergencyTitle: { fontSize: 15, fontWeight: '700', color: Colors.danger, marginBottom: 2 },
  emergencySubtitle: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  setupBtn: {
    marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  setupBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 8, marginLeft: 2,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.white },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: Colors.textPrimary, marginBottom: 16,
  },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary, lineHeight: 22 },
  infoEmpty: { color: Colors.textMuted, fontStyle: 'italic' },
  footer: {
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  saveText: { fontSize: 15, color: Colors.white, fontWeight: '600' },
});
