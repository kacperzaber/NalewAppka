import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function EditLiqueur({ route, navigation }) {
  const { liqueur } = route.params;
  const [name, setName] = useState(liqueur.name);
  const [date, setDate] = useState(new Date(liqueur.created_at));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchStages);
    return unsubscribe;
  }, [navigation]);

  async function fetchStages() {
    setStagesLoading(true);
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('date', { ascending: true });

    if (error) {
      alert('Błąd pobierania etapów: ' + error.message);
    } else {
      setStages(data);
    }
    setStagesLoading(false);
  }

  const onChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onSave = async () => {
    if (!name.trim()) {
      alert('Nazwa nalewki nie może być pusta!');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('nalewki')
      .update({
        name: name.trim(),
        created_at: date.toISOString(),
      })
      .eq('id', liqueur.id);

    setLoading(false);

    if (error) {
      alert('Błąd podczas zapisywania: ' + error.message);
    } else {
      navigation.goBack();
    }
  };

  const deleteLiqueur = async () => {
    Alert.alert(
      'Usuń nalewkę',
      'Czy na pewno chcesz usunąć tę nalewkę wraz z jej etapami?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: errorStages } = await supabase
                .from('etapy')
                .delete()
                .eq('nalewka_id', liqueur.id);
              if (errorStages) throw errorStages;

              const { error: errorLiqueur } = await supabase
                .from('nalewki')
                .delete()
                .eq('id', liqueur.id);
              if (errorLiqueur) throw errorLiqueur;

              navigation.goBack();
            } catch (error) {
              alert('Błąd usuwania nalewki: ' + error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getDaysText = (stageDate) => {
    const today = new Date();
    // zeruj godziny by porównywać tylko daty
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const stageMidnight = new Date(stageDate.getFullYear(), stageDate.getMonth(), stageDate.getDate());

    const diffTime = stageMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return `${daysAgo} ${daysAgo === 1 ? 'dzień' : 'dni'} temu`;
    } else if (diffDays === 0) {
      return 'Dzisiaj';
    } else {
      return `Pozostało ${diffDays} ${diffDays === 1 ? 'dzień' : 'dni'}`;
    }
  };

  const renderStage = ({ item }) => {
    const stageDate = new Date(item.date);

    return (
      <View style={styles.stageCard}>
        <View style={styles.stageHeader}>
          <Text style={styles.stageDate}>
            {stageDate.toLocaleDateString('pl-PL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <View style={styles.stageIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddStage', { liqueur, stage: item })}
            >
              <Ionicons name="create-outline" size={20} color="#f5e6c4" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Usuń etap', 'Czy na pewno chcesz usunąć ten etap?', [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                      const { error } = await supabase.from('etapy').delete().eq('id', item.id);
                      if (error) {
                        alert('Błąd usuwania etapu: ' + error.message);
                      } else {
                        fetchStages();
                      }
                    },
                  },
                ]);
              }}
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="trash-outline" size={20} color="#f5e6c4" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.stageNote}>{item.note}</Text>
        <Text style={styles.stageDaysAgo}>{getDaysText(stageDate)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={stages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStage}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Edycja nalewki</Text>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Nazwa nalewki:</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Wpisz nazwę nalewki"
                placeholderTextColor="#bba68f"
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Data rozpoczęcia:</Text>
              <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateButton}>
                <Text style={styles.dateText}>
                  {date.toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <Modal visible={showPicker} transparent={true} animationType="fade">
              <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
                <View style={styles.modalOverlay} />
              </TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChange}
                  // Usunięto maximumDate, aby można było wybrać zarówno przeszłość, jak i przyszłość
                  themeVariant="light"
                />
              </View>
            </Modal>

            <TouchableOpacity
              onPress={onSave}
              style={[styles.saveButton, loading && { opacity: 0.6 }]}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? 'Zapisywanie...' : 'Zapisz zmiany'}</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 30 }]}>Etapy nalewki:</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.stageNote}>
            {stagesLoading ? 'Ładowanie etapów...' : 'Brak etapów.'}
          </Text>
        }
        ListFooterComponent={
          <>
            <Button
              title="Dodaj etap"
              onPress={() => navigation.navigate('AddStage', { liqueur })}
              color="#a97458"
            />
            <TouchableOpacity onPress={deleteLiqueur} style={styles.deleteLiqueurButton}>
              <Text style={styles.deleteLiqueurButtonText}>Usuń nalewkę</Text>
            </TouchableOpacity>
          </>
        }
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#2e1d14',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f5e6c4',
    textAlign: 'center',
    marginBottom: 30,
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
  textInput: {
    backgroundColor: '#5a4635',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#f5e6c4',
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#5a4635',
    borderRadius: 12,
  },
  dateText: {
    color: '#f5e6c4',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#a97458',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#2e1d14',
    fontWeight: 'bold',
    fontSize: 18,
  },
  stageCard: {
    backgroundColor: '#4b3a2b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageDate: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 18,
  },
  stageIcons: {
    flexDirection: 'row',
  },
  stageNote: {
    marginTop: 8,
    fontSize: 16,
    color: '#d9cba7',
  },
  stageDaysAgo: {
    marginTop: 12,
    fontSize: 14,
    color: '#bba68f',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#4b3a2b',
    padding: 20,
  },
  deleteLiqueurButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8b2d2d',
    alignItems: 'center',
  },
  deleteLiqueurButtonText: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 18,
  },
});
