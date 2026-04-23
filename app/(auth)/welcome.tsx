import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import PlusIcon from '../../components/PlusIcon';

function MedBagIcon() {
  return (
    <View style={styles.medBagOuter}>
      <PlusIcon size={22} color="#fff" />
    </View>
  );
}

function NatureIllustration() {
  return (
    <View style={styles.illustrationCard}>
      {/* Background blobs */}
      <View style={styles.blobLeft} />
      <View style={styles.blobRight} />

      {/* Plant left */}
      <View style={styles.plantLeft}>
        <Text style={styles.plantEmoji}>🌿</Text>
      </View>

      {/* Center bottle */}
      <View style={styles.bottleCenter}>
        <Text style={styles.bottleEmoji}>💊</Text>
        <View style={styles.bottleBody}>
          <View style={styles.bottleCap} />
          <View style={styles.bottleGlass} />
        </View>
      </View>

      {/* Plant right */}
      <View style={styles.plantRight}>
        <Text style={styles.plantEmojiLg}>🌱</Text>
      </View>

      {/* Small bottle left */}
      <View style={styles.smallBottleLeft}>
        <View style={styles.smallBottleBody} />
        <View style={styles.smallBottleCap} />
      </View>

      {/* Small bottle right */}
      <View style={styles.smallBottleRight}>
        <View style={styles.smallBottleBodyAlt} />
        <View style={styles.smallBottleCapAlt} />
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceAlt} />

      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <MedBagIcon />
        </View>
        <Text style={styles.appName}>MedCabinet</Text>
        <Text style={styles.tagline}>Your family's medicine cabinet,{'\n'}smarter.</Text>
      </View>

      <View style={styles.imageContainer}>
        <NatureIllustration />
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 44,
  },

  /* Logo */
  logoSection: { alignItems: 'center', marginTop: 16 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#D4E8E1',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  medBagOuter: {
    width: 52, height: 48, borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  appName: {
    fontSize: 30, fontWeight: '800', color: Colors.primary,
    letterSpacing: -0.5, marginBottom: 10,
  },
  tagline: {
    fontSize: 16, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 24,
  },

  /* Illustration */
  imageContainer: {
    flex: 1, justifyContent: 'center',
    marginVertical: 28,
  },
  illustrationCard: {
    width: '100%', height: 220,
    backgroundColor: '#E8EEEB',
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  blobLeft: {
    position: 'absolute', width: 160, height: 160,
    borderRadius: 80, backgroundColor: '#D8EAE4',
    top: -40, left: -40,
  },
  blobRight: {
    position: 'absolute', width: 130, height: 130,
    borderRadius: 65, backgroundColor: '#DDF0E8',
    top: -10, right: -20,
  },
  plantLeft: { position: 'absolute', left: 16, bottom: 20 },
  plantEmoji: { fontSize: 56 },
  plantRight: { position: 'absolute', right: 20, bottom: 16 },
  plantEmojiLg: { fontSize: 64 },
  bottleCenter: { position: 'absolute', bottom: 20, alignItems: 'center' },
  bottleEmoji: { fontSize: 0, height: 0 },
  bottleBody: { alignItems: 'center' },
  bottleCap: {
    width: 18, height: 10, backgroundColor: '#2C2C2C',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  bottleGlass: {
    width: 28, height: 70, backgroundColor: 'rgba(180,180,180,0.55)',
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderTopLeftRadius: 2, borderTopRightRadius: 2,
    borderWidth: 1, borderColor: 'rgba(150,150,150,0.3)',
  },
  smallBottleLeft: {
    position: 'absolute', left: '35%', bottom: 18,
    alignItems: 'center',
  },
  smallBottleCap: {
    width: 14, height: 8, backgroundColor: '#F5F5F0',
    borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  smallBottleBody: {
    width: 22, height: 50, backgroundColor: 'rgba(200,210,200,0.6)',
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    marginTop: 8, borderWidth: 1, borderColor: 'rgba(150,160,150,0.25)',
  },
  smallBottleRight: {
    position: 'absolute', right: '35%', bottom: 14,
    alignItems: 'center',
  },
  smallBottleCapAlt: {
    width: 16, height: 9, backgroundColor: '#F0F5F0',
    borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  smallBottleBodyAlt: {
    width: 24, height: 44, backgroundColor: 'rgba(210,225,215,0.55)',
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(160,175,160,0.2)',
  },

  /* Buttons */
  buttonSection: { gap: 12 },
  primaryButton: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
  },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: Colors.white, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  secondaryButtonText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '500' },
});
