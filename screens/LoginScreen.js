import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError('');
    setLoading(true);

    if (email === 'admin' && password === 'admin') {
      setLoading(false);
      navigation.replace('Home'); // Zmień na właściwy ekran po zalogowaniu
    } else {
      setError('Nieprawidłowy email lub hasło.');
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>NalewAppka</Text>
          <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Twój email"
              placeholderTextColor="#bba68f"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Hasło</Text>
            <TextInput
              placeholder="Twoje hasło"
              placeholderTextColor="#bba68f"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Ładowanie...' : 'Zaloguj się'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2e1d14' },
  scrollViewContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f5e6c4', marginBottom: 8, textAlign: 'center', fontFamily: 'serif' },
  subtitle: { fontSize: 16, color: '#bba68f', marginBottom: 32, textAlign: 'center', fontStyle: 'italic' },
  inputWrapper: { marginBottom: 20 },
  label: { color: '#f5e6c4', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#4a3c2f',
    color: '#f5e6c4',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#7a674f',
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
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#a97458',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  buttonText: { color: '#2e1d14', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
