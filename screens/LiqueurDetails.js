import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LiqueurDetails({ route, navigation }) {
  const { liqueur } = route.params;
  const [stages, setStages] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showBottlingPicker, setShowBottlingPicker] = useState(false);
  const [bottlingDate, setBottlingDate] = useState(
    liqueur.rozlanie ? new Date(liqueur.rozlanie) : null
  );
  const [savingBottling, setSavingBottling] = useState(false);

  useEffect(() => {
    fetchStages();
    fetchIngredients();
  }, []);

  async function fetchStages() {
    setLoading(true);
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('date', { ascending: true });

    if (error) {
      Alert.alert('Błąd pobierania etapów: ' + error.message);
    } else {
      setStages(data);
    }
    setLoading(false);
  }

  async function fetchIngredients() {
    const { data, error } = await supabase
      .from('skladniki')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('created_at', { ascending: true });

    if (error) {
      Alert.alert('Błąd pobierania składników: ' + error.message);
    } else {
      setIngredients(data);
    }
  }

  const hideBottlingPicker = () => {
    if (showBottlingPicker) setShowBottlingPicker(false);
  };

  const onBottlingDateChange = async (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowBottlingPicker(false);
    }
    if (selectedDate) {
      setBottlingDate(selectedDate);
      await saveBottlingDate(selectedDate);
    }
  };

  const saveBottlingDate = async (date) => {
    if (!liqueur?.id) {
      Alert.alert('Błąd', 'Brak ID nalewki');
      return;
    }

    setSavingBottling(true);

    try {
      const { data, error } = await supabase
        .from('nalewki')
        .update({ rozlanie: date.toISOString() })
        .eq('id', liqueur.id)
        .select();

      if (error) {
        Alert.alert('Błąd zapisu daty rozlania', error.message);
        console.log('Błąd zapisu rozlania:', error);
      } else {
        Alert.alert('Sukces', 'Data rozlania została zapisana');
      }
    } catch (e) {
      Alert.alert('Błąd', e.message || 'Nieznany błąd');
    } finally {
      setSavingBottling(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={hideBottlingPicker}
        >
          <Text style={styles.title}>{liqueur.name}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Data rozpoczęcia:</Text>
            <Text style={styles.infoText}>
              {new Date(liqueur.created_at).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={{ marginTop: 30 }}>
            <Text style={styles.label}>Data rozlania:</Text>
            <TouchableOpacity
              style={[styles.dateButton, savingBottling && { opacity: 0.6 }]}
              onPress={() => setShowBottlingPicker(true)}
              disabled={savingBottling}
            >
              <Text style={styles.dateText}>
                {bottlingDate
                  ? formatDate(bottlingDate)
                  : 'Wybierz datę'}
              </Text>
            </TouchableOpacity>
          </View>

          {showBottlingPicker && (
            <DateTimePicker
              value={bottlingDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
              onChange={onBottlingDateChange}
              maximumDate={new Date()}
              themeVariant="dark"
            />
          )}

          <Text style={[styles.label, { marginTop: 30 }]}>Etapy nalewki:</Text>
          {loading ? (
            <Text style={styles.stageNote}>Ładowanie etapów...</Text>
          ) : stages.length === 0 ? (
            <Text style={styles.stageNote}>Brak etapów.</Text>
          ) : (
            stages.map((item) => {
              const stageDate = new Date(item.date);
              const today = new Date();

              if (isNaN(stageDate)) return null;

              const diffTime = stageDate.getTime() - today.getTime(); // przyszłość dodatnia
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let daysText = '';
              if (diffDays > 0) {
                daysText = `Pozostało ${diffDays} ${diffDays === 1 ? 'dzień' : 'dni'}`;
              } else if (diffDays < 0) {
                const daysAgo = Math.abs(diffDays);
                daysText = `${daysAgo} ${daysAgo === 1 ? 'dzień' : 'dni'} temu`;
              } else {
                daysText = 'dzisiaj';
              }

              return (
                <View key={item.id} style={styles.stageCard}>
                  <View style={styles.stageHeader}>
                    <Text style={styles.stageDate}>{formatDate(stageDate)}</Text>
                  </View>
                  <Text style={styles.stageNote}>{item.note}</Text>
                  <Text style={styles.stageDaysAgo}>{daysText}</Text>
                </View>
              );
            })
          )}

          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 30 }}
          >
            <Text style={[styles.label, { flex: 1 }]}>Składniki:</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditIngredients', { liqueur })}
              style={styles.editIngredientsButton}
            >
              <Text style={styles.editIngredientsButtonText}>Edytuj składniki</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <Text style={styles.stageNote}>Brak składników.</Text>
          ) : (
            ingredients.map((item) => (
              <View key={item.id} style={styles.stageCard}>
                <Text style={styles.stageNote}>
                  {item.name} — {item.amount}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#2e1d14',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f5e6c4',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  infoBox: {
    marginBottom: 24,
  },
  label: {
    color: '#bba68f',
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 18,
    color: '#f5e6c4',
    fontWeight: '500',
  },
  stageCard: {
    backgroundColor: '#4a3c2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  stageHeader: {
    marginBottom: 8,
  },
  stageDate: {
    color: '#a97458',
    fontWeight: '600',
    fontSize: 14,
  },
  stageNote: {
    color: '#f5e6c4',
    fontSize: 16,
  },
  stageDaysAgo: {
    marginTop: 2,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#bba68f',
    textAlign: 'right',
  },
  editIngredientsButton: {
    backgroundColor: '#a97458',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    bottom: 10,
  },
  editIngredientsButtonText: {
    color: '#f5e6c4',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#4a3c2f',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  dateText: {
    color: '#f5e6c4',
    fontSize: 16,
  },
});
