import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EditStages({ route, navigation }) {
  const { liqueur } = route.params;
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    fetchStages();
  }, []);

  async function fetchStages() {
    setLoading(true);
    // Pobieramy etapy, a następnie sortujemy po execute_after_days w JS,
    // żeby mieć pewność, że 0 dni będzie pierwszy.
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id);

    setLoading(false);

    if (error) {
      alert('Błąd pobierania etapów: ' + error.message);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const sorted = (data || []).slice().sort((a, b) => {
        const aDays = Number(a.execute_after_days) || 0;
        const bDays = Number(b.execute_after_days) || 0;
        return aDays - bDays;
      });
      setStages(sorted);
    }
  }

  const openEditModal = (stage) => {
    navigation.navigate('AddStage', {
      stage,
      liqueurId: liqueur.id,
    });
  };

  const deleteStage = (stageId) => {
    Alert.alert('Usuń etap', 'Czy na pewno chcesz usunąć ten etap?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('etapy').delete().eq('id', stageId);
          if (error) {
            alert('Błąd usuwania etapu: ' + error.message);
          } else {
            fetchStages();
          }
        },
      },
    ]);
  };

  const renderStage = ({ item }) => {
    const days = Number(item.execute_after_days) || 0;

    return (
      <View style={[styles.stageCard, { width: width - 40 }]}>
        <View style={styles.stageTopRow}>
          <View style={styles.dateContainer}>
            {days === 0 ? (
              <Ionicons
                name="star-outline"
                size={20}
                color="#a97458"
                style={{ marginRight: 6 }}
              />
            ) : (
              <Ionicons
                name="timer-outline"
                size={20}
                color="#a97458"
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={styles.stageDate}>
              {days === 0
                ? 'Etap początkowy'
                : `Wykonaj po ${days} dniach`}
            </Text>
          </View>
          <View style={styles.icons}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              accessibilityLabel="Edytuj etap"
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={22} color="#a97458" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteStage(item.id)}
              accessibilityLabel="Usuń etap"
              style={[styles.iconButton, { marginLeft: 20 }]}
            >
              <Ionicons name="trash-outline" size={22} color="#8b2d2d" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.stageNote} numberOfLines={4} ellipsizeMode="tail">
          {item.note?.trim() || 'Brak notatki'}
        </Text>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="flask-outline" size={70} color="#d9cba7" />
      <Text style={styles.emptyText}>Brak etapów do edycji.</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('AddStage', { liqueurId: liqueur.id })}
        accessibilityRole="button"
        accessibilityLabel="Dodaj pierwszy etap"
      >
        <Text style={styles.addFirstText}>Dodaj pierwszy etap</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Zarządzanie etapami</Text>

      {loading && stages.length === 0 ? (
        <ActivityIndicator size="large" color="#a97458" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={stages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStage}
          refreshing={loading}
          onRefresh={fetchStages}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={
            stages.length === 0
              ? { flexGrow: 1, justifyContent: 'center', paddingBottom: 100 }
              : { paddingBottom: 100 }
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddStage', { liqueurId: liqueur.id })}
        accessibilityRole="button"
        accessibilityLabel="Dodaj etap"
      >
        <Text style={styles.addButtonText}>Dodaj etap</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e1d14',
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f5e6c4',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stageCard: {
    backgroundColor: '#4b3a2b',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#a97458',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: 'center',
  },
  stageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  stageDate: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 18,
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  stageNote: {
    fontSize: 15,
    color: '#d9cba7',
    lineHeight: 22,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#a97458',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#a97458',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  addButtonText: {
    color: '#2e1d14',
    fontWeight: '900',
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    color: '#d9cba7',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 14,
    fontWeight: '600',
  },
  addFirstText: {
    color: '#a97458',
    marginTop: 16,
    fontWeight: '800',
    fontSize: 17,
    textDecorationLine: 'underline',
  },
});
