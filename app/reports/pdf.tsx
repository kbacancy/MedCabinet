import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useMedicines } from '../../hooks/useMedicines';
import { useDoseLogRange } from '../../hooks/useDoseLogs';
import { generateHealthReportHTML } from '../../lib/pdfReport';
import type { MedicalId, Contact } from '../../lib/supabase';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function PdfReportScreen() {
  const router = useRouter();
  const { medicines } = useMedicines();
  const [userName, setUserName] = useState('Patient');
  const [medicalId, setMedicalId] = useState<MedicalId | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [generating, setGenerating] = useState(false);

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { logs } = useDoseLogRange(startDate, endDate);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata;
      setUserName(meta?.full_name ?? user.email ?? 'Patient');
      supabase.from('medical_id').select('*').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setMedicalId(data); });
      supabase.from('contacts').select('*').eq('user_id', user.id).order('name')
        .then(({ data }) => setContacts(data ?? []));
    });
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const html = generateHealthReportHTML(medicines, logs, medicalId, contacts, userName);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or share your health report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Report saved', 'PDF saved to app storage.');
      }
    } catch {
      Alert.alert('Error', 'Could not generate the report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Health Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          <Text style={styles.previewIcon}>📄</Text>
          <Text style={styles.previewTitle}>PDF Health Report</Text>
          <Text style={styles.previewDesc}>
            A shareable PDF containing your medicine list, 30-day adherence summary,
            expiry warnings, medical ID, and emergency contacts — ready for your next doctor visit.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What's included</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Medicines" value={`${medicines.length} on file`} />
          <View style={styles.divider} />
          <InfoRow label="Adherence period" value="Last 30 days" />
          <View style={styles.divider} />
          <InfoRow label="Medical ID" value={medicalId ? '✓ On file' : 'Not set'} />
          <View style={styles.divider} />
          <InfoRow label="Contacts" value={contacts.length > 0 ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}` : 'None added'} />
          <View style={styles.divider} />
          <InfoRow label="Expiry warnings" value="≤ 30 days" />
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.generateBtnText}>Generate &amp; Share PDF</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>
          Save to Files or email it to your doctor before your next appointment.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  previewCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  previewIcon: { fontSize: 52, marginBottom: 14 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  previewDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  infoLabel: { fontSize: 14, color: Colors.textPrimary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 16 },
  generateBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
