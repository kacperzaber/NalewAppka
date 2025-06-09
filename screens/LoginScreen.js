// screens/LoginScreen.js
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  // Jeśli jest już sesja, pomiń ekran logowania
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigation.replace('LoadingScreen');
    });
  }, []);

  const handleLogin = async () => {
    setErrorEmail('');
    setErrorPassword('');
    setErrorGeneral('');

    if (!email.trim()) {
      setErrorEmail('Podaj email');
      return;
    }
    if (!password) {
      setErrorPassword('Podaj hasło');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorGeneral('Nieprawidłowy email lub hasło.');
      } else {
        navigation.replace('LoadingScreen');
      }
    } catch (e) {
      setErrorGeneral('Błąd: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
            />

            <Text style={styles.title}>Piwniczka</Text>
            <Text style={styles.subtitle}>
              Zaloguj się do swojego konta
            </Text>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Twój email"
                placeholderTextColor="#bba68f"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                value={email}
                onChangeText={setEmail}
              />
              {errorEmail ? (
                <Text style={styles.fieldError}>{errorEmail}</Text>
              ) : null}
            </View>

            {/* Hasło */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Hasło</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Twoje hasło"
                placeholderTextColor="#bba68f"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={password}
                onChangeText={setPassword}
              />
              {errorPassword ? (
                <Text style={styles.fieldError}>{errorPassword}</Text>
              ) : null}
            </View>

            {/* Błąd ogólny */}
            {errorGeneral ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorGeneral}</Text>
              </View>
            ) : null}

            {/* Przycisk logowania */}
            <Pressable
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#2e1d14" />
              ) : (
                <Text style={styles.buttonText}>Zaloguj się</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2e1d14' },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f5e6c4',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 16,
    color: '#bba68f',
    marginBottom: 32,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  inputWrapper: { marginBottom: 20 },
  label: { color: '#f5e6c4', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#4a3c2f',
    color: '#f5e6c4',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#7a674f',
  },
  fieldError: {
    color: '#ff6b6b',
    marginTop: 4,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#ffdddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#a97458',
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 10,
    elevation: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#2e1d14',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.6 },
});
