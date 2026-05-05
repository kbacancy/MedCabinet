import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useContacts, Contact } from '../hooks/useContacts';

const ROLES = ['Doctor', 'Pharmacy', 'Specialist', 'Emergency', 'Other'];

const ROLE_EMOJIS: Record<string, string> = {
  Doctor: '👨‍⚕️',
  Pharmacy: '🏥',
  Specialist: '🩺',
  Emergency: '🚨',
  Other: '📋',
};

type FormState = {
  name: string;
  role: string;
  phone: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: FormState = { name: '', role: 'Doctor', phone: '', address: '', notes: '' };

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts, loading, addContact, updateContact, deleteContact } = useContacts();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (c: Contact) => {
    setForm({ name: c.name, role: c.role, phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
    setSaving(true);
    if (editingId) {
      await updateContact(editingId, {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
    } else {
      await addContact({
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (c: Contact) => {
    Alert.alert('Delete Contact', `Remove ${c.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteContact(c.id) },
    ]);
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Contacts</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Inline Add/Edit Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editingId ? 'Edit Contact' : 'New Contact'}</Text>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Dr. John Smith"
                placeholderTextColor={Colors.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.chipsWrap}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, form.role === r && styles.chipSelected]}
                    onPress={() => setForm(f => ({ ...f, role: r }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, form.role === r && styles.chipTextSelected]}>
                      {ROLE_EMOJIS[r]} {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                placeholderTextColor={Colors.textMuted}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Address (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main St, City"
                placeholderTextColor={Colors.textMuted}
                value={form.address}
                onChangeText={v => setForm(f => ({ ...f, address: v }))}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Additional notes..."
                placeholderTextColor={Colors.textMuted}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                multiline
                numberOfLines={2}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Text style={styles.saveText}>{editingId ? 'Save Changes' : 'Add Contact'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contact List */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : contacts.length === 0 && !showForm ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptyDesc}>Add your doctors, pharmacies and specialists for quick access.</Text>
              <TouchableOpacity style={styles.setupBtn} onPress={openAdd}>
                <Text style={styles.setupBtnText}>Add First Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            contacts.map(c => (
              <View key={c.id} style={styles.contactCard}>
                <View style={styles.contactLeft}>
                  <View style={styles.roleIcon}>
                    <Text style={styles.roleEmoji}>{ROLE_EMOJIS[c.role] ?? '📋'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactRole}>{c.role}</Text>
                    {c.address ? <Text style={styles.contactAddress}>{c.address}</Text> : null}
                    {c.notes ? <Text style={styles.contactNotes}>{c.notes}</Text> : null}
                  </View>
                </View>
                <View style={styles.contactActions}>
                  {c.phone ? (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall(c.phone)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.callBtnText}>📞 Call</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconAction}>
                    <Text style={styles.iconActionText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(c)} style={styles.iconAction}>
                    <Text style={styles.iconActionText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { paddingVertical: 48, alignItems: 'center' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: Colors.primary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14 },
  addBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  formCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.textPrimary, marginBottom: 12,
  },
  inputMultiline: { height: 70, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.white },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  saveButton: {
    flex: 2, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', backgroundColor: Colors.primary,
  },
  saveText: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  setupBtn: {
    marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  setupBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  contactCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  contactLeft: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  roleIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  roleEmoji: { fontSize: 22 },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  contactRole: { fontSize: 12, color: Colors.primary, fontWeight: '500', marginBottom: 2 },
  contactAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  contactNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  contactActions: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },
  callBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  callBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  iconAction: { padding: 6 },
  iconActionText: { fontSize: 18 },
});
