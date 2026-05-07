import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
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
import { logAuditEvent } from '../../lib/audit';
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
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

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

  const handleGeneratePress = () => {
    setConsentChecked(false);
    setShowConsent(true);
  };

  const handleConsentAccept = async () => {
    setShowConsent(false);
    setGenerating(true);
    try {
      await logAuditEvent('READ', 'medicines', undefined, {
        action_detail: 'pdf_report_generated',
        medicines_count: medicines.length,
        includes_medical_id: medicalId !== null,
        includes_contacts: contacts.length > 0,
        consent_given: true,
      });

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
          onPress={handleGeneratePress}
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

      {/* HIPAA Consent Modal */}
      <Modal
        visible={showConsent}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsent(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.consentTitle}>Before You Share</Text>
            <Text style={styles.consentSubtitle}>
              This PDF contains sensitive health information. Please review what will be included.
            </Text>

            <View style={styles.consentList}>
              {[
                `${medicines.length} medicine${medicines.length !== 1 ? 's' : ''} with dosage & schedule`,
                '30-day dose adherence history',
                medicalId ? 'Medical ID (blood type, allergies)' : null,
                contacts.length > 0 ? `${contacts.length} doctor/pharmacist contact${contacts.length !== 1 ? 's' : ''}` : null,
                'Expiry warnings',
              ].filter(Boolean).map((item, i) => (
                <View key={i} style={styles.consentItem}>
                  <Text style={styles.consentBullet}>•</Text>
                  <Text style={styles.consentItemText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Once shared, MedCabinet cannot control how this PDF is stored or forwarded. Only share with trusted healthcare providers.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setConsentChecked(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                {consentChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                I understand this PDF contains my personal health data and I consent to generating and sharing it.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.consentBtn, !consentChecked && styles.consentBtnDisabled]}
              onPress={handleConsentAccept}
              disabled={!consentChecked}
              activeOpacity={0.85}
            >
              <Text style={styles.consentBtnText}>Generate PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConsent(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Consent modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.borderLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  consentTitle: {
    fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6,
  },
  consentSubtitle: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 16,
  },
  consentList: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 14,
  },
  consentItem: {
    flexDirection: 'row', gap: 8, marginBottom: 6,
  },
  consentBullet: { fontSize: 13, color: Colors.primary, marginTop: 1 },
  consentItemText: { fontSize: 13, color: Colors.textPrimary, flex: 1, lineHeight: 19 },
  warningBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFF8EC', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F5DFA0', marginBottom: 20,
  },
  warningIcon: { fontSize: 16 },
  warningText: { fontSize: 12, color: '#8a6000', lineHeight: 18, flex: 1 },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  checkmark: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  checkLabel: {
    fontSize: 13, color: Colors.textPrimary, flex: 1, lineHeight: 19,
  },
  consentBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  consentBtnDisabled: { opacity: 0.4 },
  consentBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, color: Colors.textMuted },
});
