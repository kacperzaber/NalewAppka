import { Ionicons } from '@expo/vector-icons';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// Ikonki przypisane do nazw nalewek
const getIconSourceByName = (name) => {
  if (!name) return require('../assets/liqueur-icons/default.png');

  const lower = name.toLowerCase();
  if (lower.includes('cytryn')) return require('../assets/liqueur-icons/lemon.png');
  if (lower.includes('wiśni') || lower.includes('wisni')) return require('../assets/liqueur-icons/cherry.png');
  if (lower.includes('śliw') || lower.includes('sliw')) return require('../assets/liqueur-icons/plum.png');
  if (lower.includes('malin')) return require('../assets/liqueur-icons/rasberry.png');
  if (lower.includes('pigw')) return require('../assets/liqueur-icons/quince.png');
  if (lower.includes('trusk')) return require('../assets/liqueur-icons/strawberry.png');
  if (lower.includes('grusz')) return require('../assets/liqueur-icons/pear.png');
  if (lower.includes('jab')) return require('../assets/liqueur-icons/apple.png');
  if (lower.includes('agres')) return require('../assets/liqueur-icons/gooseberry.png');
  if (lower.includes('czarn')) return require('../assets/liqueur-icons/plant.png');
  if (lower.includes('porzecz')) return require('../assets/liqueur-icons/blackcurrant.png');
  if (lower.includes('aron')) return require('../assets/liqueur-icons/chokeberry.png');
  if (lower.includes('mirabel')) return require('../assets/liqueur-icons/gandaria.png');
  if (lower.includes('deren')) return require('../assets/liqueur-icons/deren.png');
  return require('../assets/liqueur-icons/default.png');
};

const windowWidth = Dimensions.get('window').width;
const numColumns = 2;
const tileMargin = 12;
const containerPadding = 40;
const tileSize = (windowWidth - tileMargin * (numColumns + 1) - containerPadding) / numColumns;

export default function HomeScreen({ navigation }) {
  const [liqueurs, setLiqueurs] = useState([]);
  const [stagesByLiqueur, setStagesByLiqueur] = useState({}); // { [nalewka_id]: { date, note } }
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNote, setModalNote] = useState('');
  const userId = '394858b4-3b18-429c-8595-9f60cbde50d8';

  // Ustawienie przycisku wyloguj w headerze - poprawione pod iPhone 15
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.replace('Login')}
          style={styles.headerLogoutButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // większy hitSlop dla łatwiejszego kliknięcia
          accessibilityLabel="Wyloguj"
          accessibilityRole="button"
        >
          <Text style={styles.headerLogoutText}>Wyloguj</Text>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: '#2e1d14',
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTitleStyle: {
        color: '#f5e6c4',
        fontWeight: '700',
        fontSize: 20,
      },
      headerTintColor: '#f5e6c4',
    });
  }, [navigation]);

  useEffect(() => {
    fetchAllData();
    const unsubscribe = navigation.addListener('focus', fetchAllData);
    return unsubscribe;
  }, [navigation]);

  // Pobieramy nalewki i etapy (etapy przyszłe)
  const fetchAllData = async () => {
    try {
      // Pobierz nalewki
      const { data: liqueursData, error: liqueursError } = await supabase
        .from('nalewki')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (liqueursError) {
        console.log('Błąd pobierania nalewek:', liqueursError);
        setLiqueurs([]);
        setStagesByLiqueur({});
        return;
      }
      setLiqueurs(liqueursData || []);

      // Pobierz wszystkie etapy przyszłe (od dziś wzwyż)
      const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { data: stagesData, error: stagesError } = await supabase
        .from('etapy')
        .select('*')
        .in('nalewka_id', liqueursData.map(l => l.id))
        .gte('date', todayISO)
        .order('date', { ascending: true });

      if (stagesError) {
        console.log('Błąd pobierania etapów:', stagesError);
        setStagesByLiqueur({});
        return;
      }

      // Dla każdej nalewki wyciągnij pierwszy najbliższy etap
      const nextStages = {};
      for (const stage of stagesData) {
        if (!nextStages[stage.nalewka_id]) {
          nextStages[stage.nalewka_id] = { date: stage.date, note: stage.note };
        }
      }
      setStagesByLiqueur(nextStages);
    } catch (err) {
      console.log('Błąd podczas fetchAllData:', err);
      setLiqueurs([]);
      setStagesByLiqueur({});
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysUntil = (dateString) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    if (isNaN(targetDate)) return null;
    const now = new Date();
    const diffTime = targetDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysAgo = (dateString) => {
    if (!dateString) return 0;
    const createdDate = new Date(dateString);
    if (isNaN(createdDate)) return 0;
    const now = new Date();
    const diffTime = now - createdDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Pokazuje modal zamiast natywnego alertu
  const showStageDetails = (note) => {
    setModalNote(note || 'Brak dodatkowych informacji.');
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    const icon = getIconSourceByName(item.name);
    const nextStage = stagesByLiqueur[item.id];

    let daysLeft = null;
    if (nextStage && nextStage.date) {
      daysLeft = daysUntil(nextStage.date);
      if (daysLeft < 0) daysLeft = null;
    }

    return (
      <View style={styles.itemWrapper}>
        <TouchableOpacity
          onPress={() => navigation.navigate('LiqueurDetails', { liqueur: item })}
          style={styles.itemTile}
          activeOpacity={0.85}
        >
          <Image source={icon} style={styles.liqueurIcon} resizeMode="contain" />
          <Text style={styles.itemText} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>

          <View style={styles.dateInfoContainer}>
            <View style={styles.dateRow}>
              <Ionicons name="flag-outline" size={16} color="#bba68f" style={styles.icon} />
              <Text style={styles.dateValue}>{formatDate(item.created_at)}</Text>
            </View>
            {item.rozlanie ? (
              <View style={styles.dateRow}>
                <Ionicons name="wine-outline" size={16} color="#bba68f" style={styles.icon} />
                <Text style={styles.dateValue}>{formatDate(item.rozlanie)}</Text>
              </View>
            ) : null}
          </View>

          {/* ETAP pod datami, nad "Start: ... dni temu" */}
          {daysLeft !== null && (
            <View style={styles.nextStageRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color="#e1c699"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.nextStageText}>
                Etap: {daysLeft === 0 ? 'dzisiaj' : `za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}`}
              </Text>

              <TouchableOpacity
                onPress={() => showStageDetails(nextStage.note)}
                style={styles.infoIconTouchable}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#e1c699"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Ilość dni od startu na dole kafelka */}
          <Text style={styles.daysText}>
            
           Start: {daysAgo(item.created_at) === 0 
  ? 'dzisiaj' 
  : `${daysAgo(item.created_at)} ${daysAgo(item.created_at) === 1 ? 'dzień' : 'dni'} temu`}

          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editHint}
          onPress={() => navigation.navigate('EditLiqueur', { liqueur: item })}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={14} color="#a97458" />
          <Text style={styles.editHintText}>Edycja</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('../assets/backgrounds/home_background.jpg')}
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        <Text style={styles.title}>Twoje Nalewki</Text>

        <FlatList
          data={liqueurs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <Text style={styles.noDataText}>Brak nalewek do wyświetlenia</Text>
          }
          style={{ flex: 1 }}
        />

        <TouchableOpacity style={styles.addTile} onPress={() => navigation.navigate('AddLiqueur')}>
          <Ionicons name="add" size={24} color="#f5e6c4" />
          <Text style={styles.addText}>Dodaj</Text>
        </TouchableOpacity>

        {/* Modal ze szczegółami etapu */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Szczegóły etapu</Text>
              <Text style={styles.modalContent}>{modalNote}</Text>

              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed && { backgroundColor: '#a97458' },
                ]}
              >
                <Text style={styles.modalButtonText}>Zamknij</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2e1d14',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backgroundImage: {
    opacity: 0.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#f5e6c4',
    marginBottom: 10,
    alignSelf: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemWrapper: {
    marginBottom: tileMargin,
  },
  itemTile: {
    backgroundColor: '#462d16',
    width: tileSize,
    height: tileSize * 1.35,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  liqueurIcon: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 8,
  },
  itemText: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  dateInfoContainer: {
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  icon: {
    marginRight: 6,
  },
  dateValue: {
    color: '#bba68f',
    fontSize: 12,
    fontWeight: '600',
  },
  nextStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextStageText: {
    color: '#e1c699',
    fontWeight: '700',
    fontSize: 13,
  },
  infoIconTouchable: {
    marginLeft: 6,
  },
  daysText: {
    color: '#bba68f',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'center',
  },
  editHintText: {
    marginLeft: 4,
    color: '#a97458',
    fontWeight: '600',
    fontSize: 13,
  },
  addTile: {
    marginTop: 10,
    backgroundColor: '#a97458',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    marginLeft: 8,
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 18,
  },
  noDataText: {
    color: '#f5e6c4',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  headerLogoutButton: {
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  headerLogoutText: {
    color: '#a97458',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#2e1d14',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f5e6c4',
    marginBottom: 12,
  },
  modalContent: {
    fontSize: 16,
    color: '#bba68f',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#a97458',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#f5e6c4',
    fontWeight: '700',
    fontSize: 16,
  },
});
