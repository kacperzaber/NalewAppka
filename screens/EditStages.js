import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  PixelRatio,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions
} from 'react-native';
import { supabase } from '../lib/supabase';

// Funkcja do skalowania rzeczy proporcjonalnie do szerokości ekranu
function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// Włączamy płynne animacje na Androidzie
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EditStages({ route, navigation }) {
  const { liqueur } = route.params;
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  useEffect(() => {
    fetchStages();
  }, []);

  async function fetchStages() {
    setLoading(true);
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id);

    setLoading(false);

    if (error) {
      Alert.alert('Błąd pobierania etapów', error.message);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const sorted = (data || [])
        .slice()
        .sort((a, b) => (Number(a.execute_after_days) || 0) - (Number(b.execute_after_days) || 0));
      setStages(sorted);
    }
  }

  const openEditModal = (stage) => {
    navigation.navigate('AddStage', { stage, liqueurId: liqueur.id });
  };

  const deleteStage = (stageId) => {
    Alert.alert('Usuń etap', 'Czy na pewno chcesz usunąć ten etap?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('etapy').delete().eq('id', stageId);
          if (error) Alert.alert('Błąd usuwania etapu', error.message);
          else fetchStages();
        },
      },
    ]);
  };

  const renderStage = ({ item }) => {
    const days = Number(item.execute_after_days) || 0;
    return (
      <View style={styles.stageCard}>
        <View style={styles.stageTopRow}>
          <View style={styles.dateContainer}>
            <Ionicons
              name={days === 0 ? 'star-outline' : 'timer-outline'}
              size={normalize(20, width)}
              color="#a97458"
              style={{ marginRight: normalize(6, width) }}
            />
            <Text style={styles.stageDate}>
              {days === 0 ? 'Etap początkowy' : `Wykonaj po ${days} dniach`}
            </Text>
          </View>
          <View style={styles.icons}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              accessibilityLabel="Edytuj etap"
              style={styles.iconButton}
              android_ripple={{ color: '#fff1', radius: normalize(24, width) }}
            >
              <Ionicons name="create-outline" size={normalize(22, width)} color="#a97458" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteStage(item.id)}
              accessibilityLabel="Usuń etap"
              style={[styles.iconButton, { marginLeft: normalize(20, width) }]}
              android_ripple={{ color: '#fff1', radius: normalize(24, width) }}
            >
              <Ionicons name="trash-outline" size={normalize(22, width)} color="#8b2d2d" />
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
      <Ionicons name="flask-outline" size={normalize(70, width)} color="#d9cba7" />
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
        <ActivityIndicator size="large" color="#a97458" style={{ marginTop: normalize(30, width) }} />
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
              ? { flexGrow: 1, justifyContent: 'center', paddingBottom: normalize(100, width) }
              : { paddingBottom: normalize(100, width) }
          }
          initialNumToRender={10}
          showsVerticalScrollIndicator={false}
        />
      )}

      <SafeAreaView edges={['bottom']} style={styles.addWrapper}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddStage', { liqueurId: liqueur.id })}
          accessibilityRole="button"
          accessibilityLabel="Dodaj etap"
          android_ripple={{ color: '#fff1' }}
        >
          <Text style={styles.addButtonText}>Dodaj etap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);
  return StyleSheet.create({
    container: {
     flexGrow: 1,
      paddingHorizontal: norm(20),
      backgroundColor: '#2e1d14',
    },
    
    title: {
      marginTop: norm(30),
      fontSize: norm(28),
      fontWeight: '900',
      color: '#f5e6c4',
      marginBottom: norm(20),
      textAlign: 'center',
      letterSpacing: norm(0.5),
    },
    stageCard: {
      width: '100%',
      maxWidth: 600,
      backgroundColor: '#4b3a2b',
      borderRadius: norm(16),
      padding: norm(18),
      marginBottom: norm(16),
      borderLeftWidth: norm(6),
      borderLeftColor: '#a97458',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: norm(4) },
      shadowOpacity: 0.3,
      shadowRadius: norm(6),
      elevation: 8,
      alignSelf: 'center',
    },
    stageTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: norm(12),
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    stageDate: {
      color: '#f5e6c4',
      fontWeight: '700',
      fontSize: norm(18),
      flexWrap: 'wrap',
      maxWidth: '90%',
    },
    stageNote: {
      fontSize: norm(15),
      color: '#d9cba7',
      lineHeight: norm(22),
    },
    icons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: norm(6),
      borderRadius: norm(8),
    },
    addWrapper: {
      backgroundColor: '#2e1d14',
      paddingHorizontal: norm(20),
      paddingBottom: Platform.OS === 'android' ? norm(20) : 0,
    },
    addButton: {
      backgroundColor: '#a97458',
      paddingVertical: norm(16),
      borderRadius: norm(18),
      alignItems: 'center',
      shadowColor: '#a97458',
      shadowOffset: { width: 0, height: norm(8) },
      shadowOpacity: 0.7,
      shadowRadius: norm(12),
      elevation: 10,
    },
    addButtonText: {
      color: '#2e1d14',
      fontWeight: '900',
      fontSize: norm(20),
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: norm(30),
    },
    emptyText: {
      color: '#d9cba7',
      fontSize: norm(17),
      textAlign: 'center',
      marginTop: norm(14),
      fontWeight: '600',
    },
    addFirstText: {
      color: '#a97458',
      marginTop: norm(16),
      fontWeight: '800',
      fontSize: norm(17),
      textDecorationLine: 'underline',
    },
  });
};
