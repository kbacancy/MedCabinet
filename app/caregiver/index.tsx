import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useCaregiverLinks, type CaregiverLink } from '../../hooks/useCaregiverLinks';
import { getInitials } from '../../hooks/useFamilyMembers';
import PlusIcon from '../../components/PlusIcon';

function statusBadge(status: string) {
  if (status === 'accepted') return { label: 'Active', bg: Colors.primaryLight, color: Colors.primary };
  return { label: 'Pending', bg: Colors.warningLight, color: Colors.warning };
}

function MemberAvatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{getInitials(name)}</Text>
    </View>
  );
}

export default function CaregiverScreen() {
  const router = useRouter();
  const { sentInvites, myAccess, loading, revokeInvite } = useCaregiverLinks();

  const handleRevoke = (link: CaregiverLink) => {
    Alert.alert(
      'Remove caregiver?',
      `${link.invited_email} will lose access to ${link.family_members?.name ?? 'this member'}'s medicines.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => revokeInvite(link.id) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Caregiver Mode</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* My caregiver access (I'm the caregiver for someone else) */}
          <Text style={styles.sectionLabel}>People I Care For</Text>
          {myAccess.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No caregiver access yet.</Text>
              <TouchableOpacity onPress={() => router.push('/caregiver/accept' as any)}>
                <Text style={styles.emptyCardLink}>I have an invite code →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listCard}>
              {myAccess.map((link, i) => (
                <View key={link.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.memberRow}
                    onPress={() => router.push(`/caregiver/dashboard?memberId=${link.member_id}` as any)}
                    activeOpacity={0.75}
                  >
                    <MemberAvatar
                      name={link.family_members?.name ?? '?'}
                      color={link.family_members?.color ?? Colors.primary}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{link.family_members?.name ?? '—'}</Text>
                      <Text style={styles.memberRel}>{link.family_members?.relationship ?? '—'}</Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Invites I've sent (I'm the guardian) */}
          <Text style={styles.sectionLabel}>My Family's Caregivers</Text>
          {sentInvites.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No caregivers added yet.</Text>
              <Text style={styles.emptyCardSub}>
                Invite a trusted person to monitor a family member's medicines.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {sentInvites.map((link, i) => {
                const badge = statusBadge(link.status);
                return (
                  <View key={link.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.inviteRow}
                      onLongPress={() => handleRevoke(link)}
                      activeOpacity={0.8}
                    >
                      <MemberAvatar
                        name={link.family_members?.name ?? '?'}
                        color={link.family_members?.color ?? Colors.primary}
                        size={38}
                      />
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteEmail} numberOfLines={1}>{link.invited_email}</Text>
                        <Text style={styles.inviteMember}>
                          for {link.family_members?.name ?? '—'}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          {sentInvites.length > 0 && (
            <Text style={styles.hint}>Long-press an invite to revoke access</Text>
          )}

          {/* Accept code */}
          <TouchableOpacity
            style={styles.codeRow}
            onPress={() => router.push('/caregiver/accept' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.codeIcon}>🔑</Text>
            <Text style={styles.codeText}>I have an invite code</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>ℹ️</Text>
            <Text style={styles.noteText}>
              Deep links require a development build. In Expo Go, caregivers can accept invites by entering the code manually.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/caregiver/invite' as any)}
        activeOpacity={0.85}
      >
        <PlusIcon size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, gap: 6,
  },
  emptyCardText: { fontSize: 14, color: Colors.textSecondary },
  emptyCardSub: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  emptyCardLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  listCard: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  memberRel: { fontSize: 12, color: Colors.textSecondary },
  inviteRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  inviteInfo: { flex: 1 },
  inviteEmail: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 2 },
  inviteMember: { fontSize: 12, color: Colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  hint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: 20, marginTop: -4 },
  arrow: { fontSize: 20, color: Colors.textMuted },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  codeIcon: { fontSize: 20 },
  codeText: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  noteCard: {
    flexDirection: 'row', gap: 10, backgroundColor: Colors.warningLight,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  noteIcon: { fontSize: 16, marginTop: 1 },
  noteText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
