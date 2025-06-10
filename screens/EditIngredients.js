import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function EditIngredients({ route, navigation }) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);
  const { liqueur } = route.params;

  const [ingredients, setIngredients] = useState([]);
  const [etapy, setEtapy] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [etapId, setEtapId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Dropdown component
  function EtapDropdown({ etapy, selectedEtapId, onSelect }) {
    const [modalVisible, setModalVisible] = useState(false);
    const selected = etapy.find(e => e.id === selectedEtapId);

    return (
      <>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <Text style={styles.dropdownButtonText}>
            {selected ? selected.note : 'Wybierz etap...'}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          presentationStyle="overFullScreen"
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Wybierz etap</Text>
            <FlatList
              data={etapy}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(item.id);
                    setModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>{item.note}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </Modal>
      </>
    );
  }

  useEffect(() => {
    let isMounted = true;
    fetchIngredients(isMounted);
    fetchEtapy(isMounted);
    return () => { isMounted = false; };
  }, []);

  async function fetchIngredients(isMounted = true) {
    setLoading(true);
    const { data, error } = await supabase
      .from('skladniki')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('created_at', { ascending: true });
    if (isMounted) {
      if (error) {
        Alert.alert('Błąd pobierania składników:', error.message);
      } else {
        setIngredients(data);
      }
      setLoading(false);
    }
  }

  async function fetchEtapy(isMounted = true) {
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('created_at', { ascending: true });
    if (isMounted) {
      if (error) {
        Alert.alert('Błąd pobierania etapów:', error.message);
      } else {
        setEtapy(data);
      }
    }
  }

  async function addOrUpdateIngredient() {
    if (!name.trim() || !amount.trim()) {
      Alert.alert('Proszę podać nazwę i ilość składnika');
      return;
    }

    Keyboard.dismiss();

    const payload = {
      nalewka_id: liqueur.id,
      name: name.trim(),
      amount: amount.trim(),
      etap_id: etapId,
    };

    if (editingId) {
      const { error } = await supabase
        .from('skladniki')
        .update(payload)
        .eq('id', editingId);
      if (error) Alert.alert('Błąd aktualizacji składnika:', error.message);
      else {
        Alert.alert('Składnik zaktualizowany');
        cancelEditing();
        fetchIngredients();
      }
    } else {
      const { error } = await supabase.from('skladniki').insert([payload]);
      if (error) Alert.alert('Błąd dodawania składnika:', error.message);
      else {
        Alert.alert('Składnik dodany');
        cancelEditing();
        fetchIngredients();
      }
    }
  }

  function deleteIngredient(id) {
    Alert.alert('Usuń składnik', 'Czy na pewno chcesz usunąć ten składnik?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('skladniki').delete().eq('id', id);
          if (error) Alert.alert('Błąd usuwania składnika:', error.message);
          else fetchIngredients();
        },
      },
    ]);
  }

  const startEditing = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(item.amount);
    setEtapId(item.etap_id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setEtapId(null);
  };

  const renderIngredient = ({ item }) => {
    const etap = etapy.find(e => e.id === item.etap_id);
    return (
      <View style={styles.ingredientCard}>
        <View style={styles.ingredientTextContainer}>
          <Text style={styles.ingredientText}>
            {item.name} — {item.amount}{etap ? ` (Etap: ${etap.note})` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
          <Text style={styles.editButtonText}>Edytuj</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteIngredient(item.id)}>
          <Text style={styles.deleteButtonText}>Usuń</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Zarządzaj składnikami: {liqueur.name}</Text>

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

            <Text style={styles.pickerLabel}>Wybierz etap:</Text>
            <View style={styles.pickerContainer}>
              <EtapDropdown etapy={etapy} selectedEtapId={etapId} onSelect={setEtapId} />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addOrUpdateIngredient}>
              <Text style={styles.addButtonText}>{editingId ? 'Zapisz zmiany' : 'Dodaj składnik'}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={[styles.addButton, styles.cancelButton]} onPress={cancelEditing}>
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
              keyExtractor={item => item.id.toString()}
              renderItem={renderIngredient}
              style={styles.list}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const createStyles = width => {
  const norm = sz => normalize(sz, width);
  return StyleSheet.create({
    flex1: { flex: 1 },
    safeContainer: {
      flex: 1,
      backgroundColor: '#2e1d14',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: norm(20),
      backgroundColor: '#2e1d14',
    },
    title: {
      fontSize: norm(22),
      fontWeight: 'bold',
      color: '#f5e6c4',
      textAlign: 'center',
      marginBottom: norm(24),
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    form: { marginBottom: norm(30) },
    input: {
      backgroundColor: '#4a3c2f',
      color: '#f5e6c4',
      borderRadius: 8,
      paddingHorizontal: norm(12),
      paddingVertical: norm(10),
      marginBottom: norm(12),
      fontSize: norm(16),
    },
    pickerLabel: { color: '#bba68f', fontWeight: '600', marginBottom: norm(6), fontSize: norm(14) },
    pickerContainer: {
      backgroundColor: '#4a3c2f',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#a97458',
      overflow: 'hidden',
      marginBottom: norm(12),
      minHeight: norm(44),
      justifyContent: 'center',
    },
    dropdownButton: { paddingHorizontal: norm(12), paddingVertical: norm(10) },
    dropdownButtonText: { color: '#f5e6c4', fontSize: norm(16) },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: {
      position: 'absolute',
      top: '30%',
      left: '10%',
      right: '10%',
      backgroundColor: '#2e1d14',
      borderRadius: 10,
      maxHeight: '50%',
      padding: norm(10),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: { color: '#f5e6c4', fontSize: norm(18), fontWeight: '700', marginBottom: norm(10) },
    modalItem: { paddingVertical: norm(12), paddingHorizontal: norm(8) },
    modalItemText: { color: '#f5e6c4', fontSize: norm(16) },
    separator: { height: 1, backgroundColor: '#4a3c2f' },
    addButton: {
      backgroundColor: '#a97458',
      paddingVertical: norm(12),
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: norm(8),
    },
    cancelButton: { backgroundColor: '#6c4a3f' },
    addButtonText: { color: '#f5e6c4', fontWeight: '700', fontSize: norm(16) },
    label: { color: '#bba68f', fontWeight: '600', fontSize: norm(18), marginBottom: norm(8) },
    infoText: { color: '#f5e6c4', fontSize: norm(16), fontStyle: 'italic' },
    list: { marginTop: norm(10) },
    ingredientCard: {
      flexDirection: 'row',
      backgroundColor: '#4a3c2f',
      padding: norm(14),
      borderRadius: 10,
      marginBottom: norm(12),
      alignItems: 'center',
    },
    ingredientTextContainer: { flex: 1 },
    ingredientText: { color: '#f5e6c4', fontSize: norm(16) },
    editButton: {
      backgroundColor: '#a97458',
      paddingHorizontal: norm(12),
      paddingVertical: norm(6),
      borderRadius: 8,
      marginLeft: norm(10),
    },
    editButtonText: { color: '#f5e6c4', fontWeight: '600' },
    deleteButton: {
      backgroundColor: '#6c4a3f',
      paddingHorizontal: norm(12),
      paddingVertical: norm(6),
      borderRadius: 8,
      marginLeft: norm(10),
    },
    deleteButtonText: { color: '#f5e6c4', fontWeight: '600' },
  });
};
