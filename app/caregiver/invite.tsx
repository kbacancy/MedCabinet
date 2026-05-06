import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  StatusBar, ScrollView, Alert, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useFamilyMembers, getInitials, type FamilyMember } from '../../hooks/useFamilyMembers';
import { useCaregiverLinks, type CaregiverLink } from '../../hooks/useCaregiverLinks';

export default function InviteCaregiverScreen() {
  const router = useRouter();
  const { members } = useFamilyMembers();
  const { createInvite } = useCaregiverLinks();

  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CaregiverLink | null>(null);
  const [copied, setCopied] = useState(false);

  const deepLink = createdLink
    ? `medcabinet://caregiver/accept?token=${createdLink.invite_token}`
    : '';

  const handleCreate = async () => {
    if (!selectedMember) { Alert.alert('Select a family member first'); return; }
    if (!email.trim()) { Alert.alert('Enter the caregiver\'s email'); return; }
    setCreating(true);
    const result = await createInvite(selectedMember.id, email.trim());
    setCreating(false);
    if (result) setCreatedLink(result);
    else Alert.alert('Error', 'Could not create invite. Please try again.');
  };

  const handleShare = async () => {
    await Share.share({
      message: `You've been invited to be a caregiver for ${selectedMember?.name ?? 'a family member'} on MedCabinet.\n\nTap this link to accept:\n${deepLink}\n\nOr enter code: ${createdLink?.invite_token}`,
      title: 'Caregiver Invite — MedCabinet',
    });
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdLink) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Created</Text>
          <View style={{ width: 64 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Invite ready!</Text>
          <Text style={styles.successDesc}>
            Share this link with{' '}
            <Text style={{ fontWeight: '700' }}>{createdLink.invited_email}</Text>.
            They'll get access to {createdLink.family_members?.name ?? 'the member'}'s medicines after accepting.
          </Text>

          <Text style={styles.sectionLabel}>Share Link</Text>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={2}>{deepLink}</Text>
          </View>
          <View style={styles.linkActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>{copied ? '✓ Copied' : 'Copy Link'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleShare} activeOpacity={0.85}>
              <Text style={[styles.actionBtnText, { color: Colors.white }]}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Or share the code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{createdLink.invite_token}</Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>ℹ️</Text>
            <Text style={styles.noteText}>
              Deep links require a development build. In Expo Go, the caregiver can go to
              Profile → Caregiver Mode → I have an invite code, and paste the code above.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Invite Caregiver</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {members.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyDesc}>
              Add a family member first, then invite a caregiver to monitor their medicines.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.replace('/family' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Add Family Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Which family member?</Text>
            <View style={styles.membersGrid}>
              {members.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, selectedMember?.id === m.id && styles.memberChipSelected]}
                  onPress={() => setSelectedMember(prev => prev?.id === m.id ? null : m)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.chipAvatar, { backgroundColor: m.color }]}>
                    <Text style={styles.chipAvatarText}>{getInitials(m.name)}</Text>
                  </View>
                  <Text style={[styles.chipName, selectedMember?.id === m.id && styles.chipNameSelected]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Caregiver's email (for your records)</Text>
            <TextInput
              style={styles.input}
              placeholder="caregiver@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.createBtn, (!selectedMember || !email.trim() || creating) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!selectedMember || !email.trim() || creating}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>{creating ? 'Creating…' : 'Create Invite'}</Text>
            </TouchableOpacity>

            <Text style={styles.createHint}>
              A unique link will be generated. Share it with the caregiver — they'll need a MedCabinet account to accept.
            </Text>
          </>
        )}
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
  cancelBtn: { minWidth: 64 },
  cancelText: { fontSize: 16, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, marginLeft: 2 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2, marginTop: 20,
  },
  membersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 12, padding: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  memberChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  chipAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 11 },
  chipName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  chipNameSelected: { color: Colors.primary, fontWeight: '700' },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20,
  },
  createBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  createHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  // Success state
  successEmoji: { fontSize: 52, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  successDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  linkBox: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  linkText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  codeBox: {
    backgroundColor: Colors.inputBg, borderRadius: 10, padding: 12,
    alignItems: 'center',
  },
  codeText: { fontSize: 13, color: Colors.textPrimary, fontFamily: 'monospace', letterSpacing: 1 },
  noteCard: {
    flexDirection: 'row', gap: 10, backgroundColor: Colors.warningLight,
    borderRadius: 12, padding: 12, marginTop: 4,
  },
  noteIcon: { fontSize: 16, marginTop: 1 },
  noteText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
