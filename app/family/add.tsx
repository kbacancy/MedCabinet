import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useFamilyMembers, getInitials } from '../../hooks/useFamilyMembers';

const AVATAR_COLORS = [
  '#1D9E75', '#4A90D9', '#E24B4A', '#F58220',
  '#9B59B6', '#E91E63', '#607D8B', '#795548',
];

const RELATIONSHIPS = [
  'Spouse', 'Partner', 'Mom', 'Dad', 'Son', 'Daughter',
  'Brother', 'Sister', 'Grandma', 'Grandpa', 'Other',
];

export default function AddFamilyMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addMember, updateMember } = useFamilyMembers();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    setLoadingExisting(true);
    supabase
      .from('family_members')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? '');
          setRelationship(data.relationship ?? 'Spouse');
          setColor(data.color ?? AVATAR_COLORS[0]);
          setNotes(data.notes ?? '');
        }
        setLoadingExisting(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    setLoading(true);
    const payload = { name: name.trim(), relationship, color, notes: notes.trim() || undefined };

    let ok = false;
    if (isEdit) {
      ok = await updateMember(id!, payload);
    } else {
      const result = await addMember(payload);
      ok = !!result;
    }

    setLoading(false);
    if (ok) {
      router.back();
    } else {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  if (loadingExisting) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEdit ? 'Edit Member' : 'Add Family Member'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar preview */}
          <View style={styles.previewRow}>
            <View style={[styles.avatarPreview, { backgroundColor: color }]}>
              <Text style={styles.avatarInitials}>
                {name.trim() ? getInitials(name) : '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.previewName}>{name.trim() || 'New Member'}</Text>
              <Text style={styles.previewRelation}>{relationship}</Text>
            </View>
          </View>

          {/* Color picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Colour</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.8}
                >
                  {color === c && <Text style={styles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emma"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoFocus={!isEdit}
            />
          </View>

          {/* Relationship */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.chipsWrap}>
              {RELATIONSHIPS.map(rel => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.chip, relationship === rel && styles.chipSelected]}
                  onPress={() => setRelationship(rel)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, relationship === rel && styles.chipTextSelected]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Any additional info..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Add Member'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarPreview: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '700', color: Colors.white },
  previewName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  previewRelation: { fontSize: 14, color: Colors.textSecondary },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3, borderColor: Colors.textPrimary,
  },
  colorCheck: { fontSize: 16, color: Colors.white, fontWeight: '700' },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary,
  },
  inputMultiline: { height: 80 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.white },
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16,
    paddingVertical: 16, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  saveButton: {
    flex: 2, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', backgroundColor: Colors.primary,
  },
  saveText: { fontSize: 15, color: Colors.white, fontWeight: '600' },
});
