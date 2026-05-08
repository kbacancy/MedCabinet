import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ProgressDots } from '../../components/mood/ProgressDots';
import { EmojiSlider } from '../../components/mood/EmojiSlider';
import { MoodCardGrid } from '../../components/mood/MoodCardGrid';
import { PhysicalToggle } from '../../components/mood/PhysicalToggle';
import { TriggerPicker } from '../../components/mood/TriggerPicker';
import { SleepRating } from '../../components/mood/SleepRating';

type Answers = {
  energy: number;
  emotionalState: string;
  physical: string[];
  trigger: string | null;
  sleep: number;
};

const TOTAL = 5;

const STEPS = [
  { title: "How's your energy right now?",   subtitle: 'Tap the level that matches how you feel' },
  { title: 'How are you feeling emotionally?', subtitle: 'Choose the mood that fits best' },
  { title: 'Any physical sensations?',        subtitle: 'Select all that apply — completely optional' },
  { title: 'Did anything trigger this?',      subtitle: 'Knowing the cause helps us support you better' },
  { title: 'How did you sleep last night?',   subtitle: 'Sleep deeply affects how we feel' },
];

export default function AssessmentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    energy: 0,
    emotionalState: '',
    physical: [],
    trigger: null,
    sleep: 0,
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const canContinue = () => {
    if (step === 0) return answers.energy > 0;
    if (step === 1) return answers.emotionalState !== '';
    if (step === 4) return answers.sleep > 0;
    return true;
  };

  const transition = (fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    if (step < TOTAL - 1) {
      transition(() => setStep(s => s + 1));
    } else {
      router.push({ pathname: '/mood/result', params: { answers: JSON.stringify(answers) } } as any);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      transition(() => setStep(s => s - 1));
    } else {
      router.back();
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mood Check-In</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots total={TOTAL} current={step} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={s.stepCount}>Step {step + 1} of {TOTAL}</Text>
          <Text style={s.question}>{STEPS[step].title}</Text>
          <Text style={s.subtitle}>{STEPS[step].subtitle}</Text>

          <View style={s.widgetArea}>
            {step === 0 && (
              <EmojiSlider
                value={answers.energy}
                onChange={v => setAnswers(a => ({ ...a, energy: v }))}
              />
            )}
            {step === 1 && (
              <MoodCardGrid
                selected={answers.emotionalState}
                onSelect={v => setAnswers(a => ({ ...a, emotionalState: v }))}
              />
            )}
            {step === 2 && (
              <PhysicalToggle
                selected={answers.physical}
                onToggle={v => setAnswers(a => ({ ...a, physical: v }))}
              />
            )}
            {step === 3 && (
              <TriggerPicker
                value={answers.trigger}
                onChange={v => setAnswers(a => ({ ...a, trigger: v }))}
              />
            )}
            {step === 4 && (
              <SleepRating
                value={answers.sleep}
                onChange={v => setAnswers(a => ({ ...a, sleep: v }))}
              />
            )}
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, !canContinue() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canContinue()}
          activeOpacity={0.82}
        >
          <Text style={s.nextBtnText}>
            {step === TOTAL - 1 ? 'Analyze My Mood ✨' : 'Continue'}
          </Text>
          {step < TOTAL - 1 && (
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
        {(step === 2 || step === 3) && (
          <TouchableOpacity onPress={handleNext} style={s.skipBtn} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip this step</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20, paddingTop: 8 },

  stepCount: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  question:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, lineHeight: 30, marginBottom: 6 },
  subtitle:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 28 },

  widgetArea: { minHeight: 200 },

  footer: {
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    gap: 8,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 16, gap: 4,
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skipBtn:  { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontSize: 13, color: Colors.textMuted },
});
