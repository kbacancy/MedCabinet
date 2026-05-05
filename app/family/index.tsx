import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useFamilyMembers, getInitials, type FamilyMember } from '../../hooks/useFamilyMembers';
import PlusIcon from '../../components/PlusIcon';

function MemberCard({
  member,
  medicineCount,
  onPress,
  onLongPress,
}: {
  member: FamilyMember;
  medicineCount: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: member.color }]}>
        <Text style={styles.avatarInitials}>{getInitials(member.name)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberRelation}>{member.relationship}</Text>
      </View>
      <View style={styles.memberRight}>
        <View style={styles.medCountBadge}>
          <Text style={styles.medCountText}>{medicineCount} med{medicineCount !== 1 ? 's' : ''}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FamilyScreen() {
  const router = useRouter();
  const { members, loading, refetch, deleteMember } = useFamilyMembers();
  const [refreshing, setRefreshing] = useState(false);
  const [medicineCounts, setMedicineCounts] = useState<Record<string, number>>({});

  const loadMedicineCounts = useCallback(async () => {
    if (members.length === 0) return;
    const ids = members.map(m => m.id);
    const { data } = await supabase
      .from('medicines')
      .select('member_id')
      .in('member_id', ids);
    if (!data) return;
    const counts: Record<string, number> = {};
    for (const row of data) {
      if (row.member_id) counts[row.member_id] = (counts[row.member_id] ?? 0) + 1;
    }
    setMedicineCounts(counts);
  }, [members]);

  useEffect(() => { loadMedicineCounts(); }, [loadMedicineCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLongPress = (member: FamilyMember) => {
    Alert.alert(member.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => router.push(`/family/add?id=${member.id}` as any) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Remove Family Member',
            `Remove ${member.name}? Their medicines and dose history will also be deleted.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => deleteMember(member.id) },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Family Members</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyDesc}>
              Add family members to manage their medicines, track doses, and monitor their health alongside yours.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/family/add' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>Add Family Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHint}>Long-press a member to edit or remove</Text>
            <View style={styles.list}>
              {members.map((member, i) => (
                <View key={member.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <MemberCard
                    member={member}
                    medicineCount={medicineCounts[member.id] ?? 0}
                    onPress={() => router.push(`/family/${member.id}` as any)}
                    onLongPress={() => handleLongPress(member)}
                  />
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {members.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/family/add' as any)}
          activeOpacity={0.85}
        >
          <PlusIcon size={22} color="#fff" />
        </TouchableOpacity>
      )}
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 12 },
  list: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 16, fontWeight: '700', color: Colors.white },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  memberRelation: { fontSize: 13, color: Colors.textSecondary },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medCountBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  medCountText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  arrow: { fontSize: 20, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 78 },
  centerBox: { paddingVertical: 60, alignItems: 'center' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
