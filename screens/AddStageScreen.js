import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function AddStageScreen({ route, navigation }) {
  const { liqueur, stage } = route.params || {};
  const insets = useSafeAreaInsets();

  const [note, setNote] = useState(stage?.note || '');
  const [date, setDate] = useState(stage?.date ? new Date(stage.date) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const saveStageConfirmed = async () => {
    if (!note.trim()) {
      Alert.alert('Proszę podać opis etapu');
      return;
    }

    if (!liqueur?.id) {
      Alert.alert('Błąd zapisu', 'Brakuje ID nalewki');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nalewka_id: liqueur.id,
        note: note.trim(),
        date: date.toISOString(),
      };

      let data, error;

      if (stage?.id) {
        // Edycja - aktualizujemy istniejący rekord
        ({ data, error } = await supabase
          .from('etapy')
          .update(payload)
          .eq('id', stage.id)
          .select());
      } else {
        // Nowy etap - wstawiamy nowy rekord
        ({ data, error } = await supabase
          .from('etapy')
          .insert([payload])
          .select());
      }

      if (error) {
        Alert.alert('Błąd zapisu etapu', error.message || 'Nieznany błąd');
        return;
      }

      Alert.alert(stage?.id ? 'Etap został zaktualizowany' : 'Etap został dodany');
      navigation.goBack();

    } catch (e) {
      Alert.alert('Nieoczekiwany błąd', e.message || 'Brak szczegółów');
    } finally {
      setLoading(false);
    }
  };

  const saveStage = () => {
    const today = new Date();
    if (date > today) {
      Alert.alert(
        'Zaplanowany etap',
        'Wybrałeś datę w przyszłości. Czy chcesz zaplanować ten etap?',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Tak', onPress: saveStageConfirmed }
        ]
      );
    } else {
      saveStageConfirmed();
    }
  };

  const formatDatePolish = (d) => {
    const months = [
      'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setShowPicker(false);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.safeContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="#3d2c1a" />

        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: 24, paddingVertical: 12 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            android_ripple={{ color: '#bba68f33', borderless: true }}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            {stage ? 'Edytuj etap' : 'Dodaj etap'}
          </Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.liqueurName}>{liqueur?.name || 'Brak nazwy'}</Text>

            <Text style={styles.label}>Opis etapu</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. dodano cukier, odstawiono do leżakowania..."
              placeholderTextColor="#bba68faa"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
              numberOfLines={5}
              editable={!loading}
            />

            <Text style={styles.label}>Data</Text>
            <Pressable
              style={({ pressed }) => [
                styles.dateButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setShowPicker(true)}
              disabled={loading}
              android_ripple={{ color: '#bba68f33' }}
            >
              <Text style={styles.dateText}>{formatDatePolish(date)}</Text>
            </Pressable>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                onChange={handleDateChange}
                themeVariant="dark"
              />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && { opacity: 0.85 },
                loading && { backgroundColor: '#8a6f44' },
              ]}
              onPress={saveStage}
              disabled={loading}
              android_ripple={{ color: '#fff3', borderless: false }}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Zapisywanie...' : stage ? 'Zapisz zmiany' : 'Zapisz etap'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#2e1d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#bba68f',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#f5e6c4',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  liqueurName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f5e6c4',
    marginBottom: 16,
  },
  label: {
    color: '#bba68f',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#4a3c2f',
    color: '#f5e6c4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 24,
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#4a3c2f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  dateText: {
    color: '#f5e6c4',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#a97458',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 16,
  },
});
