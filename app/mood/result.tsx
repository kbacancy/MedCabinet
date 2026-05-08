import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { analyzeMoodAssessment, type MoodAnswers, type MoodAnalysis } from '../../lib/groq';
import { supabase } from '../../lib/supabase';

type IoniconName = keyof typeof Ionicons.glyphMap;

const SEVERITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  mild:     { bg: '#E8F5E9', text: '#388E3C', label: 'Mild' },
  moderate: { bg: '#FFF3E0', text: '#E65100', label: 'Moderate' },
  high:     { bg: '#FFEBEE', text: '#C62828', label: 'High' },
};

const ACTION_MAP: Record<string, { icon: IoniconName; label: string; desc: string; color: string }> = {
  breathing: { icon: 'leaf',          label: 'Breathing Exercise', desc: 'Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 3 times.',           color: '#1D9E75' },
  journal:   { icon: 'journal',       label: 'Write It Out',       desc: 'Journaling helps you process emotions. Open your health journal to get started.', color: '#9B5CF6' },
  walk:      { icon: 'walk',          label: 'Take a Short Walk',  desc: 'Even 10 minutes outside can significantly boost your mood and reduce stress.',    color: '#F58220' },
  music:     { icon: 'musical-notes', label: 'Listen to Music',    desc: 'Put on calming or uplifting music — your nervous system responds to rhythm.',     color: '#4285F4' },
  rest:      { icon: 'moon',          label: 'Rest & Recover',     desc: 'Give yourself permission to slow down. Your body and mind both need recovery.',   color: '#7C5CBF' },
};

export default function ResultScreen() {
  const router = useRouter();
  const { answers: answersJson } = useLocalSearchParams<{ answers: string }>();

  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!answersJson) return;
    const answers: MoodAnswers = JSON.parse(answersJson);
    analyzeMoodAssessment(answers).then(result => {
      setAnalysis(result);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1,  duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0,  duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, [answersJson]);

  const handleSave = async () => {
    if (!analysis || saving) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); Alert.alert('Not signed in'); return; }

    const answers: MoodAnswers = JSON.parse(answersJson!);
    const { error } = await supabase.from('mood_logs').insert({
      user_id:           user.id,
      primary_mood:      analysis.primaryMood,
      severity:          analysis.severity,
      insight:           analysis.insight,
      wellness_message:  analysis.wellnessMessage,
      suggested_action:  analysis.suggestedAction,
      emoji:             analysis.emoji,
      energy_level:      answers.energy,
      emotional_state:   answers.emotionalState,
      physical_symptoms: answers.physical,
      trigger_category:  answers.trigger,
      sleep_rating:      answers.sleep,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Could not save. Please try again.');
    } else {
      setSaved(true);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/mood' as any);
  };

  const action = analysis ? ACTION_MAP[analysis.suggestedAction] ?? ACTION_MAP.rest : null;
  const severity = analysis ? SEVERITY_STYLE[analysis.severity] ?? SEVERITY_STYLE.mild : null;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Analyzing your mood…</Text>
        <Text style={s.loadingSubtext}>This takes just a moment</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingText}>Could not analyze mood.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.retryBtn}>
          <Text style={s.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Your Mood Result</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Mood card */}
          <View style={s.moodCard}>
            <Text style={s.moodEmoji}>{analysis.emoji}</Text>
            <Text style={s.moodName}>{analysis.primaryMood.charAt(0).toUpperCase() + analysis.primaryMood.slice(1)}</Text>
            <View style={[s.severityBadge, { backgroundColor: severity!.bg }]}>
              <Text style={[s.severityText, { color: severity!.text }]}>
                {severity!.label} intensity
              </Text>
            </View>
          </View>

          {/* Insight */}
          <View style={s.insightCard}>
            <Ionicons name="bulb" size={18} color={Colors.warning} style={{ marginBottom: 6 }} />
            <Text style={s.insightLabel}>Insight</Text>
            <Text style={s.insightText}>{analysis.insight}</Text>
          </View>

          {/* Wellness message */}
          <View style={s.wellnessCard}>
            <Text style={s.wellnessLabel}>💬 For You</Text>
            <Text style={s.wellnessText}>{analysis.wellnessMessage}</Text>
          </View>

          {/* Suggested action */}
          {action && (
            <View style={[s.actionCard, { borderLeftColor: action.color }]}>
              <View style={[s.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <View style={s.actionText}>
                <Text style={[s.actionLabel, { color: action.color }]}>{action.label}</Text>
                <Text style={s.actionDesc}>{action.desc}</Text>
              </View>
            </View>
          )}

          {/* Journal shortcut */}
          {analysis.suggestedAction === 'journal' && (
            <TouchableOpacity
              style={s.journalBtn}
              onPress={() => router.push('/journal/add' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="journal-outline" size={18} color={Colors.primary} />
              <Text style={s.journalBtnText}>Open Journal</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {!saved ? (
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnLoading]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.82}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>Save This Entry</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.doneBtn} onPress={handleDone} activeOpacity={0.82}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={s.saveBtnText}>Saved! Go to Mood Tab</Text>
          </TouchableOpacity>
        )}
        {!saved && (
          <TouchableOpacity onPress={handleDone} style={s.skipSaveBtn} activeOpacity={0.7}>
            <Text style={s.skipSaveText}>Skip saving</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, gap: 14, paddingHorizontal: 40,
  },
  loadingText:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loadingSubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn:  { marginTop: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primaryLight, borderRadius: 12 },
  retryText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  moodCard: {
    alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 24, padding: 28, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  moodEmoji: { fontSize: 64, marginBottom: 10 },
  moodName:  { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  severityBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  severityText:  { fontSize: 13, fontWeight: '700' },

  insightCard: {
    backgroundColor: Colors.warningLight, borderRadius: 16,
    padding: 16, marginBottom: 14, alignItems: 'center',
  },
  insightLabel: { fontSize: 11, fontWeight: '700', color: Colors.warning, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  insightText:  { fontSize: 14, color: Colors.textPrimary, lineHeight: 21, textAlign: 'center' },

  wellnessCard: {
    backgroundColor: Colors.primary, borderRadius: 20,
    padding: 20, marginBottom: 16,
  },
  wellnessLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  wellnessText:  { fontSize: 15, color: '#fff', lineHeight: 23 },

  actionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText:  { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  actionDesc:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  journalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14,
    paddingVertical: 12, marginBottom: 12,
  },
  journalBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  footer: {
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    gap: 8,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  saveBtnLoading: { opacity: 0.7 },
  doneBtn: {
    backgroundColor: Colors.primaryDark, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skipSaveBtn:  { alignItems: 'center', paddingVertical: 6 },
  skipSaveText: { fontSize: 13, color: Colors.textMuted },
});
