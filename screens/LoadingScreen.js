// screens/LoadingScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LoadingScreen = ({ navigation }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // 1. Prośba o powiadomienia
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Uprawnienia do powiadomień odrzucone');
      }
    })();

    // 2. Fade‑in podpisu
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // 3. Animacja paska
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => navigation.replace('Home'));

    // 4. Pulsowanie logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // 5. Listener procentów
    const sub = progress.addListener(({ value }) => setPercent(Math.floor(value * 100)));
    return () => progress.removeListener(sub);
  }, []);

  // Szerokość fill
  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.8],
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../icon.png')}
        style={[styles.logo, { transform: [{ scale: pulse }] }]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.tagline, { opacity: fadeIn }]}>
        Witaj w Piwniczce
      </Animated.Text>

      <View style={styles.barContainer}>
        <LinearGradient
          colors={['#f5e6c4', '#a97458']}
          start={[0, 0]}
          end={[1, 0]}
          style={styles.gradientBackground}
        >
          <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
        </LinearGradient>
        <Text style={styles.percentText}>{percent}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e1d14',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  tagline: {
    color: '#f5e6c4',
    fontSize: 18,
    fontWeight: '300',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  barContainer: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBackground: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#4a3c2f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'transparent',
  },
  percentText: {
    position: 'absolute',
    color: '#2e1d14',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoadingScreen;
