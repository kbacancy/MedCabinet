import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, G, Defs, ClipPath } from 'react-native-svg';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

function BacancyIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 46.55 50.48">
      <Defs>
        <ClipPath id="bClip">
          <Path
            fillRule="evenodd"
            d="M23.27,0A23.31,23.31,0,1,1,0,23.31,23.29,23.29,0,0,1,23.27,0Z"
            transform="translate(0, 1.93)"
          />
        </ClipPath>
      </Defs>
      {/* Orange circle background */}
      <Path
        fillRule="evenodd"
        fill="#F58220"
        d="M23.27,0A23.31,23.31,0,1,1,0,23.31,23.29,23.29,0,0,1,23.27,0Z"
        transform="translate(0, 1.93)"
      />
      {/* White "b" mark, clipped to circle */}
      <G clipPath="url(#bClip)">
        <Path
          fillRule="evenodd"
          fill="#FFFFFF"
          d="M8.8,27.9c0,6.33,3.9,10.7,10.59,13.67V-1.93L8.8-1.79V27.9ZM23.11,24V14.3c18.28-3.05,24.88,26.34.08,27.25V32.12c8.1.51,8.64-9.07-.08-8.09Z"
          transform="translate(0, 1.93)"
        />
      </G>
    </Svg>
  );
}

const CARD = width * 0.36;
const CROSS = CARD * 0.46;
const THICK = CROSS * 0.28;

interface Props {
  ready?: boolean;
  onFinish?: () => void;
}

export function AnimatedSplash({ ready = false, onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const crossScale = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(22)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const poweredByOpacity = useRef(new Animated.Value(0)).current;
  const poweredByY = useRef(new Animated.Value(12)).current;

  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // 1. Card entrance
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Cross pop-in
    Animated.delay(320) &&
      setTimeout(() => {
        Animated.spring(crossScale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }).start(() => startPulse());
      }, 320);

    // 3. Title slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(titleY, {
          toValue: 0,
          friction: 10,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // 4. Tagline fades in
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }, 800);

    // 5. Powered by Bacancy slides up and fades in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(poweredByOpacity, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.spring(poweredByY, {
          toValue: 0,
          friction: 10,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1100);

    return () => {
      pulseLoop.current?.stop();
    };
  }, []);

  const startPulse = () => {
    const beat = Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.13,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1.0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1.07,
        duration: 140,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1.0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(900),
    ]);
    pulseLoop.current = Animated.loop(beat);
    pulseLoop.current.start();
  };

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      pulseLoop.current?.stop();
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish?.();
      });
    }, 280);
    return () => clearTimeout(id);
  }, [ready]);

  const crossAnimated = Animated.multiply(crossScale, pulse);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Logo card */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: crossAnimated }] }}>
          <View style={styles.crossWrap}>
            <View style={styles.crossV} />
            <View style={styles.crossH} />
          </View>
        </Animated.View>
        <View style={[styles.pill, styles.pillL]} />
        <View style={[styles.pill, styles.pillR]} />
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        MedCabinet
      </Animated.Text>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Your medicine, organized
      </Animated.Text>

      {/* Powered by Bacancy */}
      <Animated.View
        style={[
          styles.poweredBy,
          { opacity: poweredByOpacity, transform: [{ translateY: poweredByY }] },
        ]}
      >
        <View style={styles.divider} />
        <Text style={styles.poweredByLabel}>Powered by</Text>
        <View style={styles.bacancyRow}>
          <BacancyIcon size={28} />
          <Text style={styles.bacancyName}>Bacancy</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blobTopRight: {
    position: 'absolute',
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width * 0.36,
    backgroundColor: Colors.primaryDark,
    opacity: 0.28,
    top: -width * 0.22,
    right: -width * 0.18,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: width * 0.52,
    height: width * 0.52,
    borderRadius: width * 0.26,
    backgroundColor: Colors.primaryDark,
    opacity: 0.2,
    bottom: -width * 0.12,
    left: -width * 0.12,
  },
  card: {
    width: CARD,
    height: CARD,
    borderRadius: CARD * 0.26,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
  },
  crossWrap: {
    width: CROSS,
    height: CROSS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossV: {
    position: 'absolute',
    width: THICK,
    height: CROSS,
    backgroundColor: Colors.primary,
    borderRadius: THICK / 2,
  },
  crossH: {
    position: 'absolute',
    width: CROSS,
    height: THICK,
    backgroundColor: Colors.primary,
    borderRadius: THICK / 2,
  },
  pill: {
    position: 'absolute',
    bottom: CARD * 0.12,
    width: CARD * 0.22,
    height: CARD * 0.09,
    borderRadius: CARD * 0.045,
    backgroundColor: Colors.primaryLight,
  },
  pillL: { left: CARD * 0.1 },
  pillR: { right: CARD * 0.1 },
  title: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.6,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.4,
  },
  poweredBy: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  poweredByLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bacancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bacancyName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.4,
  },
});
