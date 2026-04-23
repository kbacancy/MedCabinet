import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
  Keyboard, TouchableWithoutFeedback, InputAccessoryView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

const NUMPAD_ACCESSORY_ID = 'otp-numpad-done';

export default function OTPScreen() {
  const router = useRouter();
  const { phone, email } = useLocalSearchParams<{ phone: string; email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    else if (digit && index === 5) Keyboard.dismiss();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Please enter the 6-digit code.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email ?? '', token: code, type: 'signup' });
    setLoading(false);
    if (error) Alert.alert('Verification Failed', error.message);
    else router.replace('/(tabs)');
  };

  const handleResend = async () => {
    setTimer(30);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email ?? '' });
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Code Sent', 'A new code has been sent.');
  };

  const maskedPhone = phone ? `+91 ${phone.slice(-10, -5)} XXXXX` : '+91 98765 XXXXX';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceAlt} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <View style={styles.phoneCard}>
            <Text style={styles.phoneEmoji}>📱</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>💬</Text>
          </View>
        </View>

        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to <Text style={styles.bold}>{maskedPhone}</Text></Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={t => handleChange(t, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor={Colors.primary}
              inputAccessoryViewID={Platform.OS === 'ios' ? NUMPAD_ACCESSORY_ID : undefined}
            />
          ))}
        </View>

        <View style={styles.timerRow}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              🕐 {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
            </Text>
          ) : null}
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>Resend code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.verifyText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Alert.alert('Support', 'Contact support@medcabinet.com')}>
          <Text style={styles.supportText}>Having trouble? <Text style={styles.supportLink}>Contact Support</Text></Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={NUMPAD_ACCESSORY_ID}>
            <View style={styles.keyboardAccessory}>
              <TouchableOpacity onPress={Keyboard.dismiss} style={styles.doneButton}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 36 },
  backButton: { marginBottom: 32 },
  backArrow: { fontSize: 22, color: Colors.textPrimary },
  iconContainer: { alignItems: 'center', marginBottom: 32, position: 'relative', height: 120 },
  phoneCard: {
    width: 96, height: 96, borderRadius: 20, backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  phoneEmoji: { fontSize: 44 },
  badge: {
    position: 'absolute', top: 0, right: '30%',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: 14 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  otpBox: {
    width: 48, height: 56, borderRadius: 10,
    backgroundColor: Colors.surface, fontSize: 20, fontWeight: '600',
    color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  timerRow: { alignItems: 'center', gap: 6 },
  timerText: { fontSize: 13, color: Colors.textSecondary },
  resendText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  resendDisabled: { color: Colors.textMuted },
  spacer: { flex: 1 },
  verifyButton: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  verifyText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  supportText: { textAlign: 'center', fontSize: 13, color: Colors.textSecondary },
  supportLink: { color: Colors.primary, fontWeight: '600' },
  keyboardAccessory: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#f1f1f1', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#c7c7cc',
  },
  doneButton: { paddingHorizontal: 4, paddingVertical: 4 },
  doneText: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
});
