import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function EditIngredients({ route, navigation }) {
  const { liqueur } = route.params;
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  async function fetchIngredients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('skladniki')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('created_at', { ascending: true });

    if (error) {
      Alert.alert('Błąd pobierania składników:', error.message);
    } else {
      setIngredients(data);
    }
    setLoading(false);
  }

  async function addOrUpdateIngredient() {
    if (name.trim() === '' || amount.trim() === '') {
      Alert.alert('Proszę podać nazwę i ilość składnika');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('skladniki')
        .update({ name: name.trim(), amount: amount.trim() })
        .eq('id', editingId);

      if (error) {
        Alert.alert('Błąd aktualizacji składnika:', error.message);
      } else {
        Alert.alert('Składnik zaktualizowany');
        setEditingId(null);
        setName('');
        setAmount('');
        fetchIngredients();
      }
    } else {
      const { error } = await supabase.from('skladniki').insert([
        {
          nalewka_id: liqueur.id,
          name: name.trim(),
          amount: amount.trim(),
        },
      ]);

      if (error) {
        Alert.alert('Błąd dodawania składnika:', error.message);
      } else {
        Alert.alert('Składnik dodany');
        setName('');
        setAmount('');
        fetchIngredients();
      }
    }
  }

  async function deleteIngredient(id) {
    Alert.alert(
      'Usuń składnik',
      'Czy na pewno chcesz usunąć ten składnik?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('skladniki')
              .delete()
              .eq('id', id);
            if (error) {
              Alert.alert('Błąd usuwania składnika:', error.message);
            } else {
              fetchIngredients();
            }
          },
        },
      ]
    );
  }

  const startEditing = (ingredient) => {
    setEditingId(ingredient.id);
    setName(ingredient.name);
    setAmount(ingredient.amount);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setName('');
    setAmount('');
  };

  const renderIngredient = ({ item }) => (
    <View style={styles.ingredientCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.ingredientText}>
          {item.name} — {item.amount}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => startEditing(item)}
      >
        <Text style={styles.editButtonText}>Edytuj</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteIngredient(item.id)}
      >
        <Text style={styles.deleteButtonText}>Usuń</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edytuj składniki: {liqueur.name}</Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Nazwa składnika"
              placeholderTextColor="#bba68f"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              placeholder="Ilość (np. 100 g)"
              placeholderTextColor="#bba68f"
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity
              style={styles.addButton}
              onPress={addOrUpdateIngredient}
            >
              <Text style={styles.addButtonText}>
                {editingId ? 'Zapisz zmiany' : 'Dodaj składnik'}
              </Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={[styles.addButton, styles.cancelButton]}
                onPress={cancelEditing}
              >
                <Text style={styles.addButtonText}>Anuluj edycję</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>Lista składników:</Text>

          {loading ? (
            <Text style={styles.infoText}>Ładowanie składników...</Text>
          ) : ingredients.length === 0 ? (
            <Text style={styles.infoText}>Brak składników.</Text>
          ) : (
            <FlatList
              data={ingredients}
              keyExtractor={(item) => item.id}
              renderItem={renderIngredient}
              style={{ marginTop: 10 }}
              scrollEnabled={false}  // tutaj jest ważne!
            />
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
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f5e6c4',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#4a3c2f',
    color: '#f5e6c4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#a97458',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#6c4a3f',
  },
  addButtonText: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
    color: '#bba68f',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 8,
  },
  infoText: {
    color: '#f5e6c4',
    fontSize: 16,
    fontStyle: 'italic',
  },
  ingredientCard: {
    flexDirection: 'row',
    backgroundColor: '#4a3c2f',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  ingredientText: {
    color: '#f5e6c4',
    fontSize: 16,
    flexShrink: 1,
  },
  editButton: {
    backgroundColor: '#a97458',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
    color: '#f5e6c4',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#6c4a3f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#f5e6c4',
    fontWeight: '600',
  },
});
