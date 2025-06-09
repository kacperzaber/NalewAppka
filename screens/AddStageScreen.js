// Zmiany: Usunięto pole daty i dodano pole execute_after_days

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';
import CustomCheckbox from './CustomCheckbox';

export default function AddStageScreen({ route, navigation }) {
  const { stage, liqueurId } = route.params;
  const isEditing = !!stage;

  const [note, setNote] = useState(stage?.note || '');
  const [executeAfterDays, setExecuteAfterDays] = useState(stage?.execute_after_days?.toString() || '');
  const [loading, setLoading] = useState(false);

  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientAmount, setNewIngredientAmount] = useState('');
  const [addingNewIngredient, setAddingNewIngredient] = useState(false);
  const [addingIngredientLoading, setAddingIngredientLoading] = useState(false);

  const scrollRef = useRef();
  const onInputFocus = (offset = 100) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 300);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      let query = supabase
        .from('skladniki')
        .select('*')
        .eq('nalewka_id', liqueurId);

      if (isEditing && stage) {
        query = query.or(`etap_id.is.null,etap_id.eq.${stage.id}`);
      } else {
        query = query.is('etap_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIngredients(data);

      if (isEditing && stage) {
        const selectedIds = data.filter(s => s.etap_id === stage.id).map(s => s.id);
        setSelectedIngredients(selectedIds);
      } else {
        setSelectedIngredients([]);
      }
    } catch (error) {
      Alert.alert('Błąd', error.message);
    }
  };

  const toggleIngredientSelection = (id) => {
    setSelectedIngredients(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addNewIngredient = async () => {
    if (!newIngredientName.trim() || !newIngredientAmount.trim()) {
      Alert.alert('Błąd', 'Uzupełnij nazwę i ilość!');
      return;
    }

    setAddingIngredientLoading(true);
    try {
      let etapId = stage?.id;
      if (!etapId) {
        const { data, error } = await supabase.from('etapy').insert([
          { note: note.trim(), execute_after_days: Number(executeAfterDays), nalewka_id: liqueurId },
        ]).select('id').single();
        if (error) throw error;
        etapId = data.id;
        route.params.stage = { ...stage, id: etapId, note, execute_after_days: Number(executeAfterDays) };
      }

      const { data: newIngr, error } = await supabase.from('skladniki').insert([
        {
          name: newIngredientName.trim(),
          amount: newIngredientAmount.trim(),
          nalewka_id: liqueurId,
          etap_id: etapId,
        },
      ]).select('*').single();

      if (error) throw error;
      setIngredients(prev => [...prev, newIngr]);
      setSelectedIngredients(prev => [...prev, newIngr.id]);
      setNewIngredientName('');
      setNewIngredientAmount('');
      setAddingNewIngredient(false);
    } catch (error) {
      Alert.alert('Błąd', error.message);
    } finally {
      setAddingIngredientLoading(false);
    }
  };

const onSave = async () => {
  if (!note.trim()) {
    alert('Opis etapu nie może być pusty!');
    return;
  }

  const days = Number(executeAfterDays);
  if (isNaN(days)) {
    alert('Podaj poprawną liczbę dni!');
    return;
  }

  setLoading(true);
  try {
    // 1. Pobierz datę utworzenia nalewki
    const { data: nalewkaData, error: nalewkaError } = await supabase
      .from('nalewki')
      .select('created_at')
      .eq('id', liqueurId)
      .single();

      let dataISO = null;

if (nalewkaData?.created_at) {
  const createdAt = new Date(nalewkaData.created_at);
  const calculatedDate = new Date(createdAt);
  calculatedDate.setDate(createdAt.getDate() + Number(executeAfterDays));
  dataISO = calculatedDate.toISOString();
}
    if (nalewkaError) throw nalewkaError;

    const createdAt = new Date(nalewkaData.created_at);
    const calculatedDate = new Date(createdAt);
    calculatedDate.setDate(createdAt.getDate() + days);

    
    let etapId = stage?.id;
    if (isEditing) {
      const { error } = await supabase
        .from('etapy')
        .update({
          note: note.trim(),
          execute_after_days: days,
          date: dataISO,
        })
        .eq('id', etapId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('etapy').insert([
        {
          note: note.trim(),
          execute_after_days: days,
          date: dataISO,
          nalewka_id: liqueurId,
        },
      ]).select('id').single();
      if (error) throw error;
      etapId = data.id;
    }

    const { error: detachError } = await supabase
      .from('skladniki')
      .update({ etap_id: null })
      .eq('etap_id', etapId);
    if (detachError) throw detachError;

    if (selectedIngredients.length > 0) {
      const { error: assignError } = await supabase
        .from('skladniki')
        .update({ etap_id: etapId })
        .in('id', selectedIngredients);
      if (assignError) throw assignError;
    }

    navigation.goBack();
  } catch (error) {
    Alert.alert('Błąd', error.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.customHeader}>
              <Text style={styles.title}>{isEditing ? 'Edytowanie etapu' : 'Dodanie etapu'}</Text>
            </View>

            <Text style={styles.label}>Opis etapu:</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz opis etapu"
              placeholderTextColor="#bba68f"
              multiline
              value={note}
              onChangeText={setNote}
              onFocus={() => onInputFocus(100)}
            />

            <Text style={styles.label}>Wykonaj po ilu dniach:</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 5"
              placeholderTextColor="#bba68f"
              keyboardType="numeric"
              value={executeAfterDays}
              onChangeText={setExecuteAfterDays}
              onFocus={() => onInputFocus(150)}
            />

            <Text style={styles.label}>Wybierz składniki do etapu:</Text>
            <View style={{ maxHeight: 150, marginBottom: 12 }}>
              {ingredients.map((ingredient) => (
                <CustomCheckbox
                  key={ingredient.id}
                  label={ingredient.name}
                  checked={selectedIngredients.includes(ingredient.id)}
                  onPress={() => toggleIngredientSelection(ingredient.id)}
                />
              ))}
            </View>

            {!addingNewIngredient && (
              <TouchableOpacity style={styles.addButton} onPress={() => setAddingNewIngredient(true)}>
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
      onFocus={() => onInputFocus(300)}
    />
    <TextInput
      style={styles.input}
      placeholder="Ilość (np. 100g)"
      placeholderTextColor="#bba68f"
      value={newIngredientAmount}
      onChangeText={setNewIngredientAmount}
      onFocus={() => onInputFocus(350)}
    />
    <TouchableOpacity
      style={[styles.addButton, addingIngredientLoading && { opacity: 0.6 }]}
      onPress={addNewIngredient}
      disabled={addingIngredientLoading}
    >
      <Text style={styles.addButtonText}>
        {addingIngredientLoading ? 'Dodawanie...' : 'Dodaj składnik'}
      </Text>
    </TouchableOpacity>
  </View>
)}


            <TouchableOpacity style={[styles.saveButton, loading && { opacity: 0.6 }]} onPress={onSave} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj etap'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#2e1d14' },
  container: { padding: 24 },
  label: { color: '#bba68f', fontSize: 16, marginBottom: 6, marginTop: 10, fontWeight: '600' },
  input: { backgroundColor: '#5a4635', borderRadius: 12, padding: 12, fontSize: 16, color: '#f5e6c4', marginBottom: 12 },
  saveButton: { backgroundColor: '#a97458', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#2e1d14', fontWeight: 'bold', fontSize: 18 },
  customHeader: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 10, backgroundColor: '#2e1d14', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f5e6c4', marginBottom: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  addButton: { backgroundColor: '#8c6b44', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: '#f5e6c4', fontWeight: 'bold', fontSize: 16 },
  newIngredientContainer: { marginBottom: 12 },
});
