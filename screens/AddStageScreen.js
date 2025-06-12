import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  PixelRatio,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';
import CustomCheckbox from './CustomCheckbox';

function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

export default function AddStageScreen({ route, navigation }) {
  const { stage, liqueurId } = route.params;
  const isEditing = Boolean(stage);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  const [note, setNote] = useState(stage?.note || '');
  const [executeAfterDays, setExecuteAfterDays] = useState(
    stage?.execute_after_days?.toString() || ''
  );
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientAmount, setNewIngredientAmount] = useState('');
  const [addingNewIngredient, setAddingNewIngredient] = useState(false);
  const [addingIngredientLoading, setAddingIngredientLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  async function fetchIngredients() {
    try {
      let q = supabase.from('skladniki').select('*').eq('nalewka_id', liqueurId);
      if (isEditing)
        q = q.or(`etap_id.is.null,etap_id.eq.${stage.id}`);
      else q = q.is('etap_id', null);

      const { data, error } = await q;
      if (error) throw error;
      setIngredients(data);
      setSelectedIngredients(
        isEditing
          ? data.filter((s) => s.etap_id === stage.id).map((s) => s.id)
          : []
      );
    } catch (e) {
      Alert.alert('Błąd', e.message);
    }
  }

  function toggleIngredientSelection(id) {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function addNewIngredient() {
    if (!newIngredientName.trim() || !newIngredientAmount.trim()) {
      Alert.alert('Błąd', 'Uzupełnij nazwę i ilość!');
      return;
    }
    setAddingIngredientLoading(true);
    try {
      let etapId = stage?.id;
      if (!etapId) {
        const { data, error } = await supabase
          .from('etapy')
          .insert([
            {
              note: note.trim(),
              execute_after_days: Number(executeAfterDays),
              nalewka_id: liqueurId
            }
          ])
          .select('id')
          .single();
        if (error) throw error;
        etapId = data.id;
        route.params.stage = { id: etapId, note, execute_after_days: Number(executeAfterDays) };
      }

      const { data: newIngr, error } = await supabase
        .from('skladniki')
        .insert([
          {
            name: newIngredientName.trim(),
            amount: newIngredientAmount.trim(),
            nalewka_id: liqueurId,
            etap_id: etapId
          }
        ])
        .select('*')
        .single();
      if (error) throw error;

      setIngredients((prev) => [...prev, newIngr]);
      setSelectedIngredients((prev) => [...prev, newIngr.id]);
      setNewIngredientName('');
      setNewIngredientAmount('');
      setAddingNewIngredient(false);
    } catch (e) {
      Alert.alert('Błąd', e.message);
    } finally {
      setAddingIngredientLoading(false);
    }
  }

  const onSave = async () => {
    if (!note.trim()) {
      Alert.alert('Błąd', 'Opis etapu nie może być pusty!');
      return;
    }
    const days = Number(executeAfterDays);
    if (isNaN(days)) {
      Alert.alert('Błąd', 'Podaj poprawną liczbę dni!');
      return;
    }
    setLoading(true);
    try {
      let etapId = stage?.id;
      if (isEditing) {
        const { error } = await supabase
          .from('etapy')
          .update({ note: note.trim(), execute_after_days: days })
          .eq('id', etapId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('etapy')
          .insert([
            { note: note.trim(), execute_after_days: days, nalewka_id: liqueurId }
          ])
          .select('id')
          .single();
        if (error) throw error;
        etapId = data.id;
      }

      const { error: dErr } = await supabase
        .from('skladniki')
        .update({ etap_id: null })
        .eq('etap_id', etapId);
      if (dErr) throw dErr;

      if (selectedIngredients.length) {
        const { error: aErr } = await supabase
          .from('skladniki')
          .update({ etap_id: etapId })
          .in('id', selectedIngredients);
        if (aErr) throw aErr;
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert('Błąd', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: '#2e1d14' }]}>      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={80}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.container, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {isEditing ? 'Edytowanie etapu' : 'Dodanie etapu'}
            </Text>

            <Text style={styles.label}>Opis etapu:</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz opis etapu"
              placeholderTextColor="#bba68f"
              multiline
              value={note}
              onChangeText={setNote}
            />

            <Text style={styles.label}>Wykonaj po ilu dniach:</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 5"
              placeholderTextColor="#bba68f"
              keyboardType="numeric"
              value={executeAfterDays}
              onChangeText={setExecuteAfterDays}
            />

            <Text style={styles.label}>Wybierz składniki do etapu:</Text>
            <View style={styles.checkboxContainer}>
              {ingredients.map((i) => (
                <CustomCheckbox
                  key={i.id}
                  label={`${i.name} — ${i.amount}`}
                  checked={selectedIngredients.includes(i.id)}
                  onPress={() => toggleIngredientSelection(i.id)}
                />
              ))}
            </View>

            {!addingNewIngredient && (
              <TouchableOpacity
                style={styles.addIngredientButton}
                onPress={() => setAddingNewIngredient(true)}
              >
                <Text style={styles.addButtonText}>Dodaj nowy składnik</Text>
              </TouchableOpacity>
            )}

            {addingNewIngredient && (
              <View style={styles.newIngredientContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nazwa składnika"
                  placeholderTextColor="#bba68f"
                  value={newIngredientName}
                  onChangeText={setNewIngredientName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ilość (np. 100 g)"
                  placeholderTextColor="#bba68f"
                  value={newIngredientAmount}
                  onChangeText={setNewIngredientAmount}
                />
                <TouchableOpacity
                  style={[styles.addIngredientButton, addingIngredientLoading && { opacity: 0.6 }]}
                  onPress={addNewIngredient}
                  disabled={addingIngredientLoading}
                >
                  <Text style={styles.addButtonText}>
                    {addingIngredientLoading ? 'Dodawanie...' : 'Dodaj składnik'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, loading && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj etap'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);
  return StyleSheet.create({
    safeContainer: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
    },
    container: {
      padding: norm(20)
    },
    title: {
      marginTop: norm(20),
      fontSize: norm(22),
      fontWeight: 'bold',
      color: '#f5e6c4',
      textAlign: 'center',
      marginBottom: norm(24),
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
    },
    label: {
      color: '#bba68f',
      fontSize: norm(16),
      marginBottom: norm(6),
      marginTop: norm(10),
      fontWeight: '600'
    },
    input: {
      backgroundColor: '#5a4635',
      color: '#f5e6c4',
      borderRadius: 12,
      padding: norm(12),
      fontSize: norm(16),
      marginBottom: norm(12)
    },
    checkboxContainer: {
      marginBottom: norm(12)
    },
    addIngredientButton: {
      backgroundColor: '#8c6b44',
      paddingVertical: norm(14),
      borderRadius: 14,
      alignItems: 'center',
      marginTop: norm(8),
      marginBottom: norm(16)
    },
    addButtonText: {
      color: '#f5e6c4',
      fontWeight: 'bold',
      fontSize: norm(16)
    },
    newIngredientContainer: {
      marginBottom: norm(12)
    },
    saveButton: {
      backgroundColor: '#a97458',
      paddingVertical: norm(16),
      borderRadius: 14,
      alignItems: 'center',
      marginTop: norm(24)
    },
    saveButtonText: {
      color: '#2e1d14',
      fontWeight: 'bold',
      fontSize: norm(18)
    }
  });
};