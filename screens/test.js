import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  PixelRatio,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

// Funkcja dobierająca ikonę, jak w oryginale:
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
  if (lower.includes('porter')) return require('../assets/liqueur-icons/porter.png');
  return require('../assets/liqueur-icons/default.png');
};
function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const styles = createStyles(width);
  const norm = (sz) => normalize(sz, width);

  const navigation = useNavigation();
  const route = useRoute();

  // Stany list
  const [liqueursAll, setLiqueursAll] = useState([]);       // status 'active', 'new', 'waiting'
  const [archivedLiqueurs, setArchivedLiqueurs] = useState([]); // status 'archive'
  const [recipesList, setRecipesList] = useState([]);       // status 'recipes'

  const [userId, setUserId] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Tab, filtracja i sortowanie
  const [activeTab, setActiveTab] = useState('active'); // 'active','new','shared','archive','recipes'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');  // 'asc' lub 'desc'
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [filteredLiqueurs, setFilteredLiqueurs] = useState([]);

  // Animacja fade-in listy
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal etapy
  const [todayModalVisible, setTodayModalVisible] = useState(false);
  const [todaysStagesList, setTodaysStagesList] = useState([]);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [lastCheckDate, setLastCheckDate] = useState(null);

  // Szczegóły etapu
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNote, setModalNote] = useState('');
  const [modalDate, setModalDate] = useState('');

  // Mapy etapów
  const [nextStagesByLiqueur, setNextStagesByLiqueur] = useState({});
  const [pastStagesByLiqueur, setPastStagesByLiqueur] = useState({});

  const alertShown = useRef(false);

  // Ref do FlatList i zapamiętywanie offsetu dla scrolla:
  const listRef = useRef(null);
  const scrollOffsetByTab = useRef({ active: 0, archive: 0, recipes: 0, shared: 0, new: 0 });

  // ------------------------------------------------------------------
  // 1. Fetch userId i pierwsze załadowanie danych
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.log('Błąd pobierania użytkownika:', error);
      } else if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Po poznaniu userId fetchujemy wszystkie listy raz
  useEffect(() => {
    if (!userId) return;
    fetchAllData();
    fetchArchivedData();
    fetchRecipes();
  }, [userId]);

  // ------------------------------------------------------------------
  // 2. Fetch funkcje
  const fetchAllData = async () => {
    if (!userId) return;
    setLoadingInitial(true);
    try {
      // 1. Active/new/waiting
      const { data: activeData, error: aErr } = await supabase
        .from('nalewki')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active','new','waiting'])
        .order('created_at', { ascending: false });
      if (aErr) throw aErr;
      setLiqueursAll(activeData || []);

      // Po pobraniu listy aktywnych, oblicz etapy
      processStages(activeData || []);
    } catch (e) {
      console.error('fetchAllData error:', e);
      setLiqueursAll([]);
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchArchivedData = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('nalewki')
        .select('*')
        .eq('user_id', userId)
        .eq('status','archive')
        .order('archive_date',{ascending:false});
      if (error) throw error;
      setArchivedLiqueurs(data||[]);
    } catch (e) {
      console.error('fetchArchivedData error:', e);
      setArchivedLiqueurs([]);
    }
  };

  const fetchRecipes = async () => {
    if (!userId) return;
    try {
      // 1. Pobierz listę przepisów
      const { data: recipesData, error: recipesError } = await supabase
        .from('nalewki')
        .select('id, name, comment, created_at')
        .eq('user_id', userId)
        .eq('status', 'recipes')
        .order('created_at', { ascending: false });
      if (recipesError) throw recipesError;

      const recipeIds = recipesData.map(r => r.id);
      if (!recipeIds.length) {
        setRecipesList([]);
        return;
      }

      // 2. Pobierz WSZYSTKIE składniki
      const { data: ingredientsData, error: ingError } = await supabase
        .from('skladniki')
        .select('nalewka_id')
        .in('nalewka_id', recipeIds);
      if (ingError) throw ingError;

      // 3. Pobierz WSZYSTKIE etapy
      const { data: stagesData, error: stError } = await supabase
        .from('etapy')
        .select('nalewka_id, execute_after_days')
        .in('nalewka_id', recipeIds);
      if (stError) throw stError;

      // 4. Zbuduj mapy
      const ingredientsCountMap = {};
      ingredientsData.forEach(({ nalewka_id }) => {
        ingredientsCountMap[nalewka_id] = (ingredientsCountMap[nalewka_id] || 0) + 1;
      });

      const stagesCountMap = {};
      const totalDaysMap = {};
      stagesData.forEach(({ nalewka_id, execute_after_days }) => {
        stagesCountMap[nalewka_id] = (stagesCountMap[nalewka_id] || 0) + 1;
        const prev = totalDaysMap[nalewka_id] || 0;
        totalDaysMap[nalewka_id] = Math.max(prev, execute_after_days || 0);
      });

      // 5. Wzbogac listę
      const enriched = recipesData.map(r => ({
        ...r,
        ingredients_count: ingredientsCountMap[r.id] || 0,
        stages_count: stagesCountMap[r.id] || 0,
        total_days: totalDaysMap[r.id] || 0,
      }));

      setRecipesList(enriched);
    } catch (e) {
      console.error('fetchRecipes error:', e);
      setRecipesList([]);
    }
  };

  // ------------------------------------------------------------------
  // 3. Logika etapów (“Etapy na dziś”)
  const processStages = useCallback((liqueursData) => {
    // Obliczamy "dziś" raz w południe UTC
    const cutoff = new Date();
    cutoff.setUTCHours(12,0,0,0);
    const todayStr = cutoff.toISOString().slice(0,10);

    // Jeśli już dziś sprawdzaliśmy, pomijamy
    if (lastCheckDate === todayStr) {
      return;
    }
    // Nowy dzień lub pierwszy raz:
    setLastCheckDate(todayStr);
    alertShown.current = false;
    setModalDismissed(false);

    // Buduj createdMap
    const createdMap = {};
    liqueursData.forEach(l => {
      createdMap[l.id] = l.created_at ? new Date(l.created_at) : null;
    });

    // Pobierz etapy dla wszystkich aktywnych nalewek:
    supabase
      .from('etapy')
      .select('nalewka_id, note, execute_after_days, id, is_done, skip_notif')
      .in('nalewka_id', liqueursData.map(l => l.id))
      .then(({ data: stagesData, error }) => {
        if (error) {
          console.error('processStages: błąd pobierania etapów', error);
          return;
        }
        const nextMap = {};
        const pastMap = {};
        stagesData.forEach(stage => {
          const lid = stage.nalewka_id;
          const start = createdMap[lid];
          if (!start) return;
          const dt = new Date(start);
          dt.setUTCHours(12,0,0,0);
          dt.setDate(dt.getDate() + (stage.execute_after_days || 0));
          if (dt.getTime() >= cutoff.getTime()) {
            // przyszły lub dzisiejszy etap
            const key = lid;
            const existing = nextMap[key];
            const dateStr = dt.toISOString().slice(0,10);
            if (!existing || new Date(existing.date).getTime() > dt.getTime()) {
              nextMap[key] = {
                date: dateStr,
                note: stage.note,
                is_done: stage.is_done,
                etap_id: stage.id,
                skip_notif: stage.skip_notif,
                nalewka_id: lid,
              };
            }
          } else {
            // przeszły etap
            const key = lid;
            const dateStr = dt.toISOString().slice(0,10);
            const existingP = pastMap[key];
            if (!existingP || new Date(existingP.date).getTime() < dt.getTime()) {
              pastMap[key] = { date: dateStr };
            }
          }
        });
        setNextStagesByLiqueur(nextMap);
        setPastStagesByLiqueur(pastMap);

        // Filtrujemy etapy na dziś
        const todays = Object.entries(nextMap)
          .filter(([_, st]) => st.date === todayStr && !st.skip_notif);
        if (todays.length && !modalDismissed && !alertShown.current) {
          alertShown.current = true;
          const list = todays.map(([_, st]) => {
            const found = liqueursData.find(l => l.id === st.nalewka_id);
            return found
              ? {
                  name: found.name,
                  note: st.note || 'Brak notatki',
                  etap_id: st.etap_id,
                  is_done: st.is_done || false,
                  nalewka_id: st.nalewka_id,
                }
              : null;
          }).filter(Boolean);
          setTodaysStagesList(list);
          setTodayModalVisible(true);
        }
      });
  }, [lastCheckDate, modalDismissed]);

  const skipTodaysStages = async () => {
    try {
      const etapIds = todaysStagesList.map(s => s.etap_id);
      if (!etapIds.length) return;
      const { error } = await supabase
        .from('etapy')
        .update({ skip_notif: true })
        .in('id', etapIds);
      if (error) {
        console.error('Błąd skip_notif:', error);
        return;
      }
      setModalDismissed(true);
      setTodayModalVisible(false);
      alertShown.current = false;
      // Nie robimy pełnego fetchAllData, bo lokalny stan jest aktualny
    } catch (e) {
      console.error('skipTodaysStages error:', e);
    }
  };

  // ------------------------------------------------------------------
  // 4. Formatowanie daty i obliczanie dni
  const formatDate = ds => {
    if (!ds) return '';
    const d = new Date(ds);
    return isNaN(d) ? '' : d.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  };
  const daysUntil = ds => {
    if (!ds) return null;
    const t = new Date(ds), n = new Date();
    t.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.round((t-n)/(1000*60*60*24));
  };
  const daysAgo = ds => {
    if (!ds) return null;
    const c = new Date(ds), n = new Date();
    c.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.floor((n-c)/(1000*60*60*24));
  };

  // ------------------------------------------------------------------
  // 5. Obsługa parametrów navigation: add/update/delete
  useEffect(() => {
    // Gdy HomeScreen otrzyma w route.params akcję, wykonujemy odpowiednią aktualizację lokalnych list
    const params = route.params || {};
    const { action, item, itemId, prevStatus } = params;

    if (action === 'add' && item) {
      // Dodajemy nowy element w oparciu o item.status
      if (item.status === 'archive') {
        setArchivedLiqueurs(prev => [item, ...prev]);
      } else if (item.status === 'recipes') {
        setRecipesList(prev => [item, ...prev]);
      } else {
        // status active/new/waiting
        setLiqueursAll(prev => [item, ...prev]);
        // Po dodaniu nowej nalewki aktywnej, warto sprawdzić etapy:
        processStages([item, ...liqueursAll]);
      }
      // Czyścimy parametry, żeby nie przetwarzać ponownie:
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }

    if (action === 'update' && item) {
      // item to zaktualizowany obiekt, prevStatus to poprzedni status
      const newStatus = item.status;
      const oldStatus = prevStatus;
      // Jeśli status się zmienił, przenosimy między tablicami:
      if (oldStatus !== newStatus) {
        // Usuń z poprzedniej
        if (oldStatus === 'archive') {
          setArchivedLiqueurs(prev => prev.filter(l => l.id !== item.id));
        } else if (oldStatus === 'recipes') {
          setRecipesList(prev => prev.filter(l => l.id !== item.id));
        } else {
          setLiqueursAll(prev => prev.filter(l => l.id !== item.id));
        }
        // Dodaj do nowej
        if (newStatus === 'archive') {
          setArchivedLiqueurs(prev => [item, ...prev]);
        } else if (newStatus === 'recipes') {
          setRecipesList(prev => [item, ...prev]);
        } else {
          setLiqueursAll(prev => [item, ...prev]);
          // Po aktualizacji aktywnej nalewki, ponownie oblicz etapy
          processStages([item, ...liqueursAll.filter(l=>l.id!==item.id)]);
        }
      } else {
        // Status bez zmian – aktualizujemy element w tej samej liście
        if (newStatus === 'archive') {
          setArchivedLiqueurs(prev => prev.map(l => l.id === item.id ? item : l));
        } else if (newStatus === 'recipes') {
          setRecipesList(prev => prev.map(l => l.id === item.id ? item : l));
        } else {
          setLiqueursAll(prev => prev.map(l => l.id === item.id ? item : l));
          // Po aktualizacji aktywnej nalewki, ponownie oblicz etapy
          processStages(liqueursAll.map(l => l.id === item.id ? item : l));
        }
      }
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }

    if (action === 'delete' && itemId != null && prevStatus) {
      // Usuwamy element z odpowiedniej listy
      if (prevStatus === 'archive') {
        setArchivedLiqueurs(prev => prev.filter(l => l.id !== itemId));
      } else if (prevStatus === 'recipes') {
        setRecipesList(prev => prev.filter(l => l.id !== itemId));
      } else {
        setLiqueursAll(prev => prev.filter(l => l.id !== itemId));
        // Po usunięciu nalewki aktywnej, ponownie oblicz etapy:
        processStages(liqueursAll.filter(l => l.id !== itemId));
      }
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }
    // Jeśli brak akcji, nic nie robimy
  }, [route.params, liqueursAll, archivedLiqueurs, recipesList]);

  // ------------------------------------------------------------------
  // 6. Dobieranie bazy wg zakładki i filtrowanie+sortowanie (debounce)
  const baseList = (() => {
    switch (activeTab) {
      case 'archive': return archivedLiqueurs;
      case 'recipes': return recipesList;
      case 'shared': return liqueursAll.filter(l => l.status === 'waiting');
      case 'new': return liqueursAll.filter(l => l.status === 'new');
      default: return liqueursAll.filter(l => l.status === activeTab);
    }
  })();

  useEffect(() => {
    setLoadingFilter(true);
    const handler = setTimeout(() => {
      let arr = baseList;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        arr = arr.filter(l => l.name.toLowerCase().includes(q));
      }
      arr = [...arr].sort((a, b) => {
        const da = new Date(a.created_at), db = new Date(b.created_at);
        if (isNaN(da) || isNaN(db)) return 0;
        return sortOrder === 'asc' ? da - db : db - da;
      });
      setFilteredLiqueurs(arr);
      setLoadingFilter(false);
    }, 200);
    return () => clearTimeout(handler);
  }, [baseList, searchQuery, sortOrder]);

  // Animacja fade in
  useEffect(() => {
    if (!loadingFilter) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loadingFilter]);

  // ------------------------------------------------------------------
  // 7. Scroll: zapamiętywanie i przywracanie offsetu
  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollOffsetByTab.current[activeTab] = offsetY;
  }, [activeTab]);

  useEffect(() => {
    // Przywróć scroll po zmianie filteredLiqueurs lub activeTab
    const offset = scrollOffsetByTab.current[activeTab] || 0;
    if (listRef.current && offset) {
      listRef.current.scrollToOffset({ offset, animated: false });
    }
  }, [filteredLiqueurs, activeTab]);

  // ------------------------------------------------------------------
  // 8. Tab-y
  const titlesByTab = {
    active: 'W trakcie leżakowania',
    new: 'Szkice',
    shared: 'Udostępnione mi',
    archive: 'Zarchiwizowane',
    recipes: 'Moje przepisy',
  };
  const countBy = (st) => {
    if (st === 'archive') return archivedLiqueurs.length;
    if (st === 'recipes') return recipesList.length;
    if (st === 'shared') return liqueursAll.filter(l => l.status === 'waiting').length;
    if (st === 'new') return liqueursAll.filter(l => l.status === 'new').length;
    return liqueursAll.filter(l => l.status === st).length;
  };
  const tabs = [
    { key:'active',  icon:'flask-outline',        color:'#2E7D32', count: countBy('active') },
    { key:'new',     icon:'time-outline',         color:'#5C7AEA', count: countBy('new') },
    { key:'shared',  icon:'share-social-outline', color:'#F57C00', count: countBy('shared') },
    { key:'archive', icon:'archive-outline',      color:'#424242', count: countBy('archive') },
    { key:'recipes', icon:'book-outline',         color:'#8D6E63', count: countBy('recipes') },
  ];
  const onChangeTab = useCallback((tabKey) => {
    setActiveTab(tabKey);
    // Nie czyścimy filteredLiqueurs tutaj, filtrowanie w useEffect zadba o aktualizację
  }, []);

  // ------------------------------------------------------------------
  // 9. Akcje Shared: accept/reject
  const acceptShared = async id => {
    // po zmianie statusu do 'recipes', przekażemy do HomeScreen param update
    const { error, data } = await supabase.from('nalewki').update({status:'recipes'}).eq('id',id).select().single();
    if (!error && data) {
      // Nawiguj do Home z parametrem update
      navigation.navigate('Home', { action: 'update', item: data, prevStatus: 'waiting' });
    }
  };
  const rejectShared = id => {
    Alert.alert('Usuń nalewkę','Na pewno?',[
      { text:'Anuluj',style:'cancel' },
      { text:'Usuń',style:'destructive',onPress:async()=>{
        // Usuń składniki i etapy
        await supabase.from('skladniki').delete().eq('nalewka_id',id);
        await supabase.from('etapy').delete().eq('nalewka_id',id);
        const { error } = await supabase.from('nalewki').delete().eq('id',id);
        if (!error) {
          navigation.navigate('Home', { action: 'delete', itemId: id, prevStatus: 'waiting' });
        }
      }}
    ]);
  };

  // ------------------------------------------------------------------
  // 10. Przejście do Stage Details
  const goToStage = (liqId) => {
    const obj = liqueursAll.find(l => l.id === liqId);
    if (!obj) return;
    setTodayModalVisible(false);
    // Przekazujemy do ekranu detali etapów, w razie potrzeby można przekazać callbacky analogicznie
    navigation.navigate('LiqueurDetails', { liqueur: obj });
  };

  // ------------------------------------------------------------------
  // 11. Render itemów
  const renderItem = ({ item }) => {
    const icon = getIconSourceByName(item.name);
    const next = nextStagesByLiqueur[item.id];
    let daysLeft = next?.date ? daysUntil(next.date) : null;
    if (daysLeft < 0) daysLeft = null;
    const isShared = item.status==='waiting';
    const isNew = item.status==='new';

    return (
      <View style={styles.itemWrapper(tileSize)}>
        <TouchableOpacity
          onPress={() => {
            // Przechodzimy do detali z callbackami:
            navigation.navigate('LiqueurDetails', {
              liqueur: item,
              // Po edycji/usunięciu w detalu musisz nawigować z odpowiednim parametrem action/update/delete
            });
          }}
          style={[styles.itemTile, isShared&&styles.sharedTile, isNew&&styles.newTile]}
          activeOpacity={0.85}
        >
          <Image source={icon} style={styles.liqueurIcon} resizeMode="contain"/>
          <Text style={styles.itemText} numberOfLines={2}>{item.name}</Text>

          {isShared ? (
            <>
              <Text style={styles.sharedByText}>Udostępniona przez: {item.from_user}</Text>
              <View style={styles.sharedButtonsContainer}>
                <TouchableOpacity style={styles.acceptButton} onPress={()=>acceptShared(item.id)}>
                  <Ionicons name="checkmark" size={16} color="#fff"/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={()=>rejectShared(item.id)}>
                  <Ionicons name="close" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
              <View style={styles.badgeShare}>
                <Text style={styles.badgeTextShare}>Udostępniona</Text>
              </View>
            </>
          ) : isNew ? (
            <>
              <View style={styles.dateInfoContainer}>
                <Text style={styles.newInfoText}>Nalewka w trybie edycji — brak daty rozpoczęcia</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Szkic</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.dateInfoContainer}>
                <View style={styles.dateRow}>
                  <Ionicons name="flag-outline" size={16} color="#bba68f" style={styles.icon}/>
                  <Text style={styles.dateValue}>{formatDate(item.created_at)}</Text>
                </View>
                { next && daysLeft != null ? (
                  <View style={styles.nextStageRow}>
                    <Ionicons name="time-outline" size={16} color="#e1c699"/>
                    <Text style={styles.nextStageText}>
                      Etap: {daysLeft === 0 ? 'dzisiaj' : `za ${daysLeft} dni`}
                    </Text>
                    {next.note && (
                      <TouchableOpacity onPress={() => {
                        setModalDate(formatDate(next.date));
                        setModalNote(next.note);
                        setModalVisible(true);
                      }}>
                        <Ionicons name="information-circle-outline" size={20} color="#e1c699" style={{ marginLeft: 1 }}/>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : pastStagesByLiqueur[item.id] ? (
                  <View style={styles.nextStageRow}>
                    <Text style={styles.nextStageText}>
                      Ostatni etap: {(() => {
                        const daysAgoStage = daysAgo(pastStagesByLiqueur[item.id].date);
                        return daysAgoStage === 0 
                          ? 'dzisiaj' 
                          : `${daysAgoStage} ${daysAgoStage === 1 ? 'dzień temu' : 'dni temu'}`;
                      })()}
                    </Text>
                  </View>
                ) : null }
              </View>
              <Text style={styles.daysText}>
                Start: {daysAgo(item.created_at)===0?'dzisiaj':`${daysAgo(item.created_at)} dni temu`}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {!isShared && (
          <TouchableOpacity
            style={styles.editHint}
            onPress={()=>navigation.navigate('EditLiqueur',{liqueur:item})}
          >
            <Ionicons name="pencil-outline" size={14} color="#a97458"/>
            <Text style={styles.editHintText}>Edycja</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Tile size
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth < 360 ? 1 : 2;
  const tileMargin = 12;
  const containerPadding = 40;
  const tileSize = (windowWidth - tileMargin * (numColumns + 1) - containerPadding) / numColumns;

  // ------------------------------------------------------------------
  // 12. Render przepisy (podobnie jak oryginał)
  const renderRecipeItem = ({ item }) => {
    const icon = getIconSourceByName(item.name);
    return (
      <View style={styles.itemWrapper(tileSize)}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('LiqueurDetails', {
              liqueur: {
                ...item,
                status: 'recipes',
                created_at: item.created_at || null,
                description: item.description || '',
                comment: item.comment || '',
                from_user: '',
                user_id: userId,
              }
            });
          }}
          style={[styles.itemTile, styles.archivedTile]}
          activeOpacity={0.85}
        >
          <Image source={icon} style={styles.liqueurIcon} resizeMode="contain"/>
          <Text style={styles.itemText} numberOfLines={2}>{item.name}</Text>
          <View style={styles.badgesColumn}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeTextSmall}>🧪 Składniki: {item.ingredients_count}</Text>
              <Text style={[styles.badgeTextSmall, styles.badgeSeparator]}>⏳ Etapy: {item.stages_count}</Text>
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeTextSmall}>⏲️ Czas: {item.total_days} dni</Text>
            </View>
          </View>
          <View style={styles.badgeArchive}>
            <Text style={styles.badgeTextArchive}>Przepis</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editHint}
          onPress={() => navigation.navigate('EditLiqueur', { liqueur: item })}
        >
          <Ionicons name="pencil-outline" size={14} color="#a97458"/>
          <Text style={styles.editHintText}>Edycja</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ------------------------------------------------------------------
  // 13. Render archiwum
  const renderArchived = ({ item }) => {
    const icon = getIconSourceByName(item.name);
    return (
      <View style={styles.itemWrapper(tileSize)}>
        <TouchableOpacity
          onPress={()=>navigation.navigate('LiqueurDetails',{liqueur:item})}
          style={[styles.itemTile, styles.archivedTile]}
          activeOpacity={0.85}
        >
          <Image source={icon} style={styles.liqueurIcon} resizeMode="contain"/>
          <Text style={styles.itemText} numberOfLines={2}>{item.name}</Text>
          <View style={styles.dateInfoContainer}>
            <Text style={styles.newInfoText}>Archiwalna</Text>
            {item.comment && <Text style={styles.newInfoText}>{item.comment}</Text>}
          </View>
          <Text style={[styles.dateValue, styles.archiveDate]}>
            {formatDate(item.archive_date)}
          </Text>
          <View style={styles.badgeArchive}>
            <Text style={styles.badgeTextArchive}>Archiwalna</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ------------------------------------------------------------------
  // 14. Render główny
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.customHeader}>
        <Text style={styles.headerTitle}>{titlesByTab[activeTab]}</Text>
        <TouchableOpacity onPress={()=>navigation.navigate('ProfileScreen')} style={styles.headerIcon}>
          <Ionicons name="person-circle-outline" size={28} color="#f5e6c4"/>
        </TouchableOpacity>
      </View>

      <ImageBackground
        source={require('../assets/backgrounds/home_background.png')}
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {/* Taby */}
        <View style={styles.tabsContainer}>
          {tabs.map(tab=>{
            const active = tab.key===activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: active?tab.color:'#f5e6c4' },
                  active&&styles.activeTabElevated,
                ]}
                onPress={() => onChangeTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={24} color={active?'#fff':tab.color}/>
                {tab.count>0&&(
                  <View style={styles.badgeCountContainer}>
                    <Text style={styles.badgeCountText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search + Sort */}
        <View style={styles.searchSortHeader}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj w tej zakładce…"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#f5e6c4" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
          >
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline'}
              size={20}
              color="#f5e6c4"
            />
          </TouchableOpacity>
        </View>

        {/* Lista lub loader */}
        {(loadingInitial || loadingFilter) ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#8D6E63" />
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              ref={listRef}
              data={filteredLiqueurs}
              keyExtractor={item => item.id.toString()}
              renderItem={
                activeTab === 'archive'
                  ? renderArchived
                  : activeTab === 'recipes'
                    ? renderRecipeItem
                    : renderItem
              }
              numColumns={numColumns}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.row}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <Text style={styles.noDataText}>
                  {activeTab === 'archive'
                    ? 'Brak archiwalnych nalewek'
                    : activeTab === 'shared'
                      ? 'Brak udostępnionych'
                      : activeTab === 'new'
                        ? 'Brak nalewek w trybie edycji'
                        : activeTab === 'recipes'
                          ? 'Brak przepisów'
                          : 'Brak nalewek do wyświetlenia'}
                </Text>
              }
            />
          </Animated.View>
        )}

        {/* Przycisk dodaj */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddLiqueur', {
            // W AddLiqueur po zapisaniu musisz nawigować:
            // navigation.navigate('Home', { action: 'add', item: newItem });
          })}
          style={styles.addFloatingButton}
        >
          <Ionicons name="add" size={28} color="#fff"/>
        </TouchableOpacity>

        {/* Modal Szczegóły etapu */}
        <Modal
          transparent
          animationType="fade"
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Szczegóły etapu</Text>
              {modalDate ? (
                <Text style={[styles.modalDate, { color: '#3b2a1f', fontWeight: '600', marginBottom: 8 }]}>
                  {modalDate}
                </Text>
              ) : null}
              <Text style={[styles.modalNote, { color: '#5a4a3c', fontSize: 16, marginBottom: 20 }]}>
                {modalNote}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: '#8d6943' }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: '#f5e6c4' }]}>Zamknij</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>

      {/* Modal “Etapy na dziś” */}
      <Modal
        transparent
        animationType="fade"
        visible={todayModalVisible}
        onRequestClose={() => setTodayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Etapy na dziś</Text>
            <View style={styles.modalContent}>
              {todaysStagesList.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => goToStage(item.nalewka_id)}
                  style={({ pressed }) => [
                    styles.todayStageItem,
                    item.is_done && styles.todayStageDone,
                    pressed && styles.todayStagePressed,
                  ]}
                >
                  <View style={styles.todayStageHeader}>
                    <Text
                      style={[
                        styles.todayStageName,
                        item.is_done && styles.todayStageNameDone,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.stageStatus,
                        item.is_done
                          ? styles.statusDone
                          : styles.statusPending,
                      ]}
                    >
                      {item.is_done ? '✔️ Wykonane' : '⏳ Oczekuje'}
                    </Text>
                  </View>
                  {item.note ? (
                    <Text style={styles.todayStageNote}>📝 {item.note}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.skipButton]}
                onPress={skipTodaysStages}
              >
                <Text style={[styles.modalButtonText, styles.skipButtonText]}>
                  Pomiń
                </Text>
              </Pressable>
              <Pressable
                style={styles.modalButton}
                onPress={() => setTodayModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Zamknij</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


