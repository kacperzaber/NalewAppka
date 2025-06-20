// screens/HomeScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

// Funkcja dobierająca ikonę nalewki wg nazwy:
const getIconSourceByName = (name) => {
  if (!name) return require('../assets/liqueur-icons/default.png');
  const lower = name.toLowerCase();
   if (lower.includes('trusk') && lower.includes('hibis')) {
  return require('../assets/liqueur-icons/truskawka_hibiskus.png');
}if (lower.includes('trusk') && lower.includes('limon')) {
  return require('../assets/liqueur-icons/truskawka_limonka.png');
}
 if (lower.includes('malin') && lower.includes('jeżyna')) {
  return require('../assets/liqueur-icons/malina_jezyna.png');
}
if (lower.includes('śliw') && lower.includes('korzen')) {
  return require('../assets/liqueur-icons/sliwka_korzenna.png');
}
if (lower.includes('pigw') && lower.includes('śliw')) {
  return require('../assets/liqueur-icons/pigwa_sliwka.png');
}if (lower.includes('cytryn') && lower.includes('imbir')&& lower.includes('mi')) {
  return require('../assets/liqueur-icons/cytryna_miod_imbir.png');
}
if (lower.includes('kwia') && lower.includes('czarn')) {
  return require('../assets/liqueur-icons/kwiat_bzu.png');
}

  if (lower.includes('cytryn')) return require('../assets/liqueur-icons/cytryna.png');
  if (lower.includes('wiśni') || lower.includes('wisni')) return require('../assets/liqueur-icons/wisnia.png');
  if (lower.includes('śliw') || lower.includes('sliw')) return require('../assets/liqueur-icons/sliwka.png');
  if (lower.includes('malin')) return require('../assets/liqueur-icons/malina.png');
  if (lower.includes('pigw')) return require('../assets/liqueur-icons/pigwa.png');
  if (lower.includes('trusk')) return require('../assets/liqueur-icons/truskawka.png');
  if (lower.includes('grusz')) return require('../assets/liqueur-icons/gruszka.png');
  if (lower.includes('jab')) return require('../assets/liqueur-icons/jablko.png');
  if (lower.includes('agres')) return require('../assets/liqueur-icons/agrest.png');
  if (lower.includes('bez')) return require('../assets/liqueur-icons/czarny_bez.png');
  if (lower.includes('porzecz')) return require('../assets/liqueur-icons/czarna_porzeczka.png');
  if (lower.includes('aron')) return require('../assets/liqueur-icons/aronia.png');
  if (lower.includes('mirabel')) return require('../assets/liqueur-icons/mirabelka.png');
  if (lower.includes('deren')) return require('../assets/liqueur-icons/deren.png');
  if (lower.includes('porter')) return require('../assets/liqueur-icons/porter.png');
  if (lower.includes('pomar')) return require('../assets/liqueur-icons/pomarancz.png');
  if (lower.includes('kaw')) return require('../assets/liqueur-icons/kawa.png');
  if (lower.includes('mięt')) return require('../assets/liqueur-icons/mieta.png');
  if (lower.includes('ananas')) return require('../assets/liqueur-icons/ananas.png');
  if (lower.includes('banan')) return require('../assets/liqueur-icons/banan.png');
  if (lower.includes('bazyli')) return require('../assets/liqueur-icons/bazyli.png');
  if (lower.includes('borów')) return require('../assets/liqueur-icons/borowka.png');
  if (lower.includes('czereś')) return require('../assets/liqueur-icons/czeresnia.png');
  if (lower.includes('czeremch')) return require('../assets/liqueur-icons/czermcha.png');
  if (lower.includes('dzika')) return require('../assets/liqueur-icons/dzika_roza.png');
  if (lower.includes('grejfr')) return require('../assets/liqueur-icons/grejfrut.png');
  if (lower.includes('imbir')) return require('../assets/liqueur-icons/imbir.png');
    if (lower.includes('jarz')) return require('../assets/liqueur-icons/jarzebina.png');
      if (lower.includes('jeżyna')) return require('../assets/liqueur-icons/jezyna.png');
      if (lower.includes('tarnina')) return require('../assets/liqueur-icons/tarnina.png');
      if (lower.includes('laskowy')) return require('../assets/liqueur-icons/laskowy.png');
      if (lower.includes('mango')) return require('../assets/liqueur-icons/mango.png');
      if (lower.includes('migda')) return require('../assets/liqueur-icons/migdal.png');
      if (lower.includes('miód')) return require('../assets/liqueur-icons/miod.png');
      if (lower.includes('miod')) return require('../assets/liqueur-icons/miod.png');
      if (lower.includes('morel')) return require('../assets/liqueur-icons/morela.png');
      if (lower.includes('oregano')) return require('../assets/liqueur-icons/oregano.png');
      if (lower.includes('orzech')) return require('../assets/liqueur-icons/orzech.png');
      if (lower.includes('rokitni')) return require('../assets/liqueur-icons/rokitnik.png');
      if (lower.includes('szał')) return require('../assets/liqueur-icons/szalwia.png');
      if (lower.includes('winogrono')) return require('../assets/liqueur-icons/winogrono.png');
      if (lower.includes('urawina')) return require('../assets/liqueur-icons/zurawina.png');
      if (lower.includes('bazylia')) return require('../assets/liqueur-icons/bazylia.png');
        if (lower.includes('chmiel')) return require('../assets/liqueur-icons/chmiel.png');
      return require('../assets/liqueur-icons/default.png');
};
function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function HomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const styles = createStyles(windowWidth);
  const norm = (sz) => normalize(sz, windowWidth);

  const navigation = useNavigation();
  const route = useRoute();

  // STANY
  const [userId, setUserId] = useState(null);

  // Dane dla poszczególnych zakładek:
  const [liqueursAll, setLiqueursAll] = useState([]);           // aktywne: status in ['active','new','waiting']
  const [archivedLiqueurs, setArchivedLiqueurs] = useState([]); // archiwum
  const [recipesList, setRecipesList] = useState([]);           // przepisy

  // Stany ładowania per zakładka:
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Pull-to-refresh per zakładka:
  const [refreshingActive, setRefreshingActive] = useState(false);
  const [refreshingArchive, setRefreshingArchive] = useState(false);
  const [refreshingRecipes, setRefreshingRecipes] = useState(false);

  // Zakładka: 'active','new','shared','archive','recipes'
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' lub 'desc'
  const [filteredLiqueurs, setFilteredLiqueurs] = useState([]);

  // Animacja fade-in listy
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal etapy na dziś
  const [todayModalVisible, setTodayModalVisible] = useState(false);
  const [todaysStagesList, setTodaysStagesList] = useState([]);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [lastCheckDate, setLastCheckDate] = useState(null);

  // Modal szczegóły etapu
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNote, setModalNote] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalDesc, setModalDesc] = useState('');

  // Mapy etapów tylko dla aktywnych:
  const [nextStagesByLiqueur, setNextStagesByLiqueur] = useState({});
  const [pastStagesByLiqueur, setPastStagesByLiqueur] = useState({});
  const alertShown = useRef(false);

  // Ref do FlatList, do zarządzania scroll offsetami per zakładka:
  const listRef = useRef(null);
  const scrollOffsetByTab = useRef({ active: 0, archive: 0, recipes: 0, shared: 0, new: 0 });

  // Stany dla liczników (counts) zakładek:
  const [counts, setCounts] = useState({
    active: 0,
    new: 0,
    shared: 0,
    archive: 0,
    recipes: 0,
  });

  // ------------------------------------------------------------------
  // 1. Pobierz userId przy mount
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

  // ------------------------------------------------------------------
  // 2. Po ustawieniu userId: fetch counts natychmiast i fetchActiveData
  useEffect(() => {
    if (!userId) return;
    fetchCounts();        // pobierz liczniki od razu
    fetchActiveData();    // wstępnie pobierz aktywne
    // Nie pobieramy od razu archiwum/przepisów, chyba że chcesz
  }, [userId]);

  // ------------------------------------------------------------------
  // Funkcja fetchCounts: pobiera counts dla każdej kategorii
  const fetchCounts = useCallback(async () => {
    if (!userId) return;
    try {
      // Active total: status in ['active','new','waiting']
      const activeQ = supabase
        .from('nalewki')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');
      // New: status === 'new'
      const newQ = supabase
        .from('nalewki')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'new');
      // Shared: status === 'waiting'
      const sharedQ = supabase
        .from('nalewki')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'waiting');
      // Archive
      const archiveQ = supabase
        .from('nalewki')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'archive');
      // Recipes
      const recipesQ = supabase
        .from('nalewki')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'recipes');

      // Uruchamiamy równolegle
      const [
        { count: countActive, error: errActive },
        { count: countNew, error: errNew },
        { count: countShared, error: errShared },
        { count: countArchive, error: errArchive },
        { count: countRecipes, error: errRecipes },
      ] = await Promise.all([activeQ, newQ, sharedQ, archiveQ, recipesQ]);

      setCounts({
        active: errActive ? 0 : (countActive || 0),
        new: errNew ? 0 : (countNew || 0),
        shared: errShared ? 0 : (countShared || 0),
        archive: errArchive ? 0 : (countArchive || 0),
        recipes: errRecipes ? 0 : (countRecipes || 0),
      });
    } catch (e) {
      console.error('fetchCounts exception:', e);
      setCounts({ active: 0, new: 0, shared: 0, archive: 0, recipes: 0 });
    }
  }, [userId]);

  // ------------------------------------------------------------------
  // 3. Funckje fetchujące dane – tylko gdy wybrana zakładka lub przy pull-to-refresh

  // Fetch dla aktywnych nalewak:
  const fetchActiveData = useCallback(async () => {
    if (!userId) return;
    setLoadingActive(true);
    try {
      const { data: activeData, error } = await supabase
        .from('nalewki')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active','new','waiting'])
        .order('created_at', { ascending: false });
      if (error) {
        console.error('fetchActiveData supabase error:', error);
        setLiqueursAll([]);
      } else {
        setLiqueursAll(activeData || []);
        processStages(activeData || []);
      }
      // Po zmianie danych: zaktualizuj counts
      fetchCounts();
    } catch (e) {
      console.error('fetchActiveData exception:', e);
      setLiqueursAll([]);
    } finally {
      setLoadingActive(false);
    }
  }, [userId, processStages, fetchCounts]);

  // Fetch archiwum:
  const fetchArchivedData = useCallback(async () => {
    if (!userId) return;
    setLoadingArchive(true);
    try {
      const { data, error } = await supabase
        .from('nalewki')
        .select('*')
        .eq('user_id', userId)
        .eq('status','archive')
        .order('archive_date',{ascending:false});
      if (error) {
        console.error('fetchArchivedData supabase error:', error);
        setArchivedLiqueurs([]);
      } else {
        setArchivedLiqueurs(data || []);
      }
      // Po zmianie danych: zaktualizuj counts
      fetchCounts();
    } catch (e) {
      console.error('fetchArchivedData exception:', e);
      setArchivedLiqueurs([]);
    } finally {
      setLoadingArchive(false);
    }
  }, [userId, fetchCounts]);

  // Fetch przepisów:
  const fetchRecipes = useCallback(async () => {
    if (!userId) return;
    setLoadingRecipes(true);
    try {
      const { data: recipesData, error: recipesError } = await supabase
        .from('nalewki')
        .select('id, name, comment, created_at')
        .eq('user_id', userId)
        .eq('status', 'recipes')
        .order('created_at', { ascending: false });
      if (recipesError) {
        console.error('fetchRecipes supabase error:', recipesError);
        setRecipesList([]);
      } else {
        const recipeIds = recipesData.map(r => r.id);
        if (!recipeIds.length) {
          setRecipesList([]);
        } else {
          // Pobierz składniki
          const { data: ingredientsData, error: ingError } = await supabase
            .from('skladniki')
            .select('nalewka_id')
            .in('nalewka_id', recipeIds);
          if (ingError) {
            console.error('fetchRecipes ingredients supabase error:', ingError);
            setRecipesList([]);
          } else {
            // Pobierz etapy
            const { data: stagesData, error: stError } = await supabase
              .from('etapy')
              .select('nalewka_id, execute_after_days')
              .in('nalewka_id', recipeIds);
            if (stError) {
              console.error('fetchRecipes stages supabase error:', stError);
              setRecipesList([]);
            } else {
              // Zbuduj mapy
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
              const enriched = recipesData.map(r => ({
                ...r,
                ingredients_count: ingredientsCountMap[r.id] || 0,
                stages_count: stagesCountMap[r.id] || 0,
                total_days: totalDaysMap[r.id] || 0,
              }));
              setRecipesList(enriched);
            }
          }
        }
      }
      // Po zmianie danych: zaktualizuj counts
      fetchCounts();
    } catch (e) {
      console.error('fetchRecipes exception:', e);
      setRecipesList([]);
    } finally {
      setLoadingRecipes(false);
    }
  }, [userId, fetchCounts]);

  // Pull-to-refresh handlers:
  const onRefreshActive = useCallback(async () => {
    setRefreshingActive(true);
    await fetchActiveData();
    setRefreshingActive(false);
  }, [fetchActiveData]);

  const onRefreshArchive = useCallback(async () => {
    setRefreshingArchive(true);
    await fetchArchivedData();
    setRefreshingArchive(false);
  }, [fetchArchivedData]);

  const onRefreshRecipes = useCallback(async () => {
    setRefreshingRecipes(true);
    await fetchRecipes();
    setRefreshingRecipes(false);
  }, [fetchRecipes]);

  // ------------------------------------------------------------------
  // 4. Logika „Etapy na dziś” dla aktywnych
  const processStages = useCallback((liqueursData) => {
    const cutoff = new Date();
    cutoff.setUTCHours(12,0,0,0);
    const todayStr = cutoff.toISOString().slice(0,10);

    if (lastCheckDate === todayStr) {
      return;
    }
    setLastCheckDate(todayStr);
    alertShown.current = false;
    setModalDismissed(false);

    // Mapa dat startu
    const createdMap = {};
    liqueursData.forEach(l => {
      createdMap[l.id] = l.created_at ? new Date(l.created_at) : null;
    });
    if (!liqueursData.length) {
      setNextStagesByLiqueur({});
      setPastStagesByLiqueur({});
      return;
    }
    // Fetch etapów tylko dla aktywnych nalewak
    supabase
      .from('etapy')
      .select('nalewka_id, note, execute_after_days, id, is_done, skip_notif, description')
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
          const dateStr = dt.toISOString().slice(0,10);
          if (dt.getTime() >= cutoff.getTime()) {
            // przyszły lub dzisiejszy etap
            const existing = nextMap[lid];
            if (!existing || new Date(existing.date).getTime() > dt.getTime()) {
              nextMap[lid] = {
                date: dateStr,
                note: stage.note,
                description: stage.description,
                is_done: stage.is_done,
                etap_id: stage.id,
                skip_notif: stage.skip_notif,
                nalewka_id: lid,
              };
            }
          } else {
            // przeszły etap
            const existingP = pastMap[lid];
            if (!existingP || new Date(existingP.date).getTime() < dt.getTime()) {
              pastMap[lid] = { date: dateStr };
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

  const skipTodaysStages = useCallback(async () => {
    const etapIds = todaysStagesList.map(s => s.etap_id);
    if (!etapIds.length) return;
    try {
      const { error } = await supabase
        .from('etapy')
        .update({ skip_notif: true })
        .in('id', etapIds);
      if (error) {
        console.error('skipTodaysStages supabase error:', error);
      } else {
        setModalDismissed(true);
        setTodayModalVisible(false);
        alertShown.current = false;
      }
    } catch (e) {
      console.error('skipTodaysStages exception:', e);
    }
  }, [todaysStagesList]);

  // ------------------------------------------------------------------
  // 5. Format dat i dni
  const formatDate = useCallback(ds => {
    if (!ds) return '';
    const d = new Date(ds);
    return isNaN(d) ? '' : d.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  }, []);
  const daysUntil = useCallback(ds => {
    if (!ds) return null;
    const t = new Date(ds), n = new Date();
    t.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.round((t-n)/(1000*60*60*24));
  }, []);
  const daysAgo = useCallback(ds => {
    if (!ds) return null;
    const c = new Date(ds), n = new Date();
    c.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.floor((n-c)/(1000*60*60*24));
  }, []);

  // ------------------------------------------------------------------
  // 6. Obsługa parametrów navigation (add/update/delete)
  useEffect(() => {
    const params = route.params || {};
    const { action, item, itemId, prevStatus } = params;
    if (action === 'add' && item) {
      if (item.status === 'archive') {
        setArchivedLiqueurs(prev => [item, ...prev]);
      } else if (item.status === 'recipes') {
        setRecipesList(prev => [item, ...prev]);
      } else {
        setLiqueursAll(prev => [item, ...prev]);
        processStages([item, ...liqueursAll]);
      }
      // Po zmianie: odśwież counts
      fetchCounts();
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }
    if (action === 'update' && item) {
      const newStatus = item.status;
      const oldStatus = prevStatus;
      if (oldStatus !== newStatus) {
        if (oldStatus === 'archive') {
          setArchivedLiqueurs(prev => prev.filter(l => l.id !== item.id));
        } else if (oldStatus === 'recipes') {
          setRecipesList(prev => prev.filter(l => l.id !== item.id));
        } else {
          setLiqueursAll(prev => prev.filter(l => l.id !== item.id));
        }
        if (newStatus === 'archive') {
          setArchivedLiqueurs(prev => [item, ...prev]);
        } else if (newStatus === 'recipes') {
          setRecipesList(prev => [item, ...prev]);
        } else {
          setLiqueursAll(prev => [item, ...prev]);
          processStages([item, ...liqueursAll.filter(l => l.id !== item.id)]);
        }
      } else {
        if (newStatus === 'archive') {
          setArchivedLiqueurs(prev => prev.map(l => l.id === item.id ? item : l));
        } else if (newStatus === 'recipes') {
          setRecipesList(prev => prev.map(l => l.id === item.id ? item : l));
        } else {
          setLiqueursAll(prev => prev.map(l => l.id === item.id ? item : l));
          processStages(liqueursAll.map(l => l.id === item.id ? item : l));
        }
      }
      // Po zmianie: odśwież counts
      fetchCounts();
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }
    if (action === 'delete' && itemId != null && prevStatus) {
      if (prevStatus === 'archive') {
        setArchivedLiqueurs(prev => prev.filter(l => l.id !== itemId));
      } else if (prevStatus === 'recipes') {
        setRecipesList(prev => prev.filter(l => l.id !== itemId));
      } else {
        setLiqueursAll(prev => prev.filter(l => l.id !== itemId));
        processStages(liqueursAll.filter(l => l.id !== itemId));
      }
      // Po zmianie: odśwież counts
      fetchCounts();
      navigation.setParams({ action: undefined, item: undefined, itemId: undefined, prevStatus: undefined });
      return;
    }
  }, [route.params, liqueursAll, archivedLiqueurs, recipesList, processStages, navigation, fetchCounts]);

  // ------------------------------------------------------------------
  // 7. Dobór bazy wg zakładki, z useMemo
  const baseList = useMemo(() => {
    switch (activeTab) {
      case 'archive': return archivedLiqueurs;
      case 'recipes': return recipesList;
      case 'shared': return liqueursAll.filter(l => l.status === 'waiting');
      case 'new': return liqueursAll.filter(l => l.status === 'new');
      default: return liqueursAll.filter(l => l.status === activeTab);
    }
  }, [activeTab, liqueursAll, archivedLiqueurs, recipesList]);

  // Filtrowanie + sortowanie (debounce)
  useEffect(() => {
    // Fade-out przed filtrowaniem
    fadeAnim.setValue(0);

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
      // Fade-in po ustawieniu
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 200);
    return () => clearTimeout(handler);
  }, [baseList, searchQuery, sortOrder, fadeAnim]);

  // ------------------------------------------------------------------
  // 8. Scroll offset zapamiętywanie i przywracanie
  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollOffsetByTab.current[activeTab] = offsetY;
  }, [activeTab]);

  useEffect(() => {
    const offset = scrollOffsetByTab.current[activeTab] || 0;
    if (listRef.current && offset) {
      listRef.current.scrollToOffset({ offset, animated: false });
    }
  }, [filteredLiqueurs, activeTab]);

  // ------------------------------------------------------------------
  // 9. Taby
  const titlesByTab = useMemo(() => ({
    active: 'W trakcie leżakowania',
    new: 'Szkice',
    shared: 'Udostępnione mi',
    archive: 'Zarchiwizowane',
    recipes: 'Moje przepisy',
  }), []);
  const tabs = useMemo(() => [
    { key:'active',  icon:'flask-outline',        color:'#2E7D32', count: counts.active },
    { key:'new',     icon:'time-outline',         color:'#5C7AEA', count: counts.new },
    { key:'shared',  icon:'share-social-outline', color:'#F57C00', count: counts.shared },
    { key:'archive', icon:'archive-outline',      color:'#424242', count: counts.archive },
    { key:'recipes', icon:'book-outline',         color:'#8D6E63', count: counts.recipes },
  ], [counts]);
  const onChangeTab = useCallback((tabKey) => {
    setActiveTab(tabKey);
    // Przy przełączeniu taby: jeśli nie było jeszcze fetchu dla tej zakładki (i userId jest), wywołujemy fetch:
    if (tabKey === 'archive' && archivedLiqueurs.length === 0) {
      fetchArchivedData();
    } else if (tabKey === 'recipes' && recipesList.length === 0) {
      fetchRecipes();
    } else if ((tabKey === 'active' || tabKey === 'new' || tabKey === 'shared') && liqueursAll.length === 0) {
      fetchActiveData();
    }
  }, [archivedLiqueurs.length, recipesList.length, liqueursAll.length, fetchArchivedData, fetchRecipes, fetchActiveData]);

  // ------------------------------------------------------------------
  // 10. Akcje dla udostępnionych (shared)
  const acceptShared = useCallback(async (id) => {
    const { data, error } = await supabase.from('nalewki')
      .update({status:'recipes'})
      .eq('id',id)
      .select()
      .single();
    if (!error && data) {
      // Navigacja z parametrem update -> HomeScreen zaktualizuje stan
      navigation.navigate('Home', { action: 'update', item: data, prevStatus: 'waiting' });
      // Po tej nawigacji HomeScreen wykona fetchCounts w useEffect parametrów navigation
    }
  }, [navigation]);
  const rejectShared = useCallback((id) => {
    Alert.alert('Usuń nalewkę','Na pewno?',[
      { text:'Anuluj',style:'cancel' },
      { text:'Usuń',style:'destructive',onPress:async()=>{
        await supabase.from('skladniki').delete().eq('nalewka_id',id);
        await supabase.from('etapy').delete().eq('nalewka_id',id);
        const { error } = await supabase.from('nalewki').delete().eq('id',id);
        if (!error) {
          navigation.navigate('Home', { action: 'delete', itemId: id, prevStatus: 'waiting' });
        }
      }}
    ]);
  }, [navigation]);

  // ------------------------------------------------------------------
  // 11. Przejście do etapu
  const goToStage = useCallback((liqId) => {
    const obj = liqueursAll.find(l => l.id === liqId);
    if (!obj) return;
    setTodayModalVisible(false);
    navigation.navigate('LiqueurDetails', { liqueur: obj });
  }, [liqueursAll, navigation]);

  // ------------------------------------------------------------------
  // 12. Render item aktywnej listy
  const renderItem = useCallback(({ item }) => {
    const icon = getIconSourceByName(item.name);
    const next = nextStagesByLiqueur[item.id];
    let daysLeft = next?.date ? daysUntil(next.date) : null;
    if (daysLeft < 0) daysLeft = null;
    const isShared = item.status==='waiting';
    const isNew = item.status==='new';

    return (
      <View style={styles.itemWrapper(tileSize)}>
        <TouchableOpacity
          onPress={() => navigation.navigate('LiqueurDetails', { liqueur: item })}
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
                  <Ionicons name="flag-outline" size={12} color="#bba68f" style={styles.icon}/>
                  <Text style={styles.dateValue}>{formatDate(item.created_at)}</Text>
                </View>
                { next && daysLeft != null ? (
                  <View style={styles.nextStageRow}>
                    <Text style={styles.nextStageText}>
                      Etap: {daysLeft === 0 ? 'dzisiaj' : `za ${daysLeft} dni`}
                    </Text>
                    {next.note && (
                      <TouchableOpacity onPress={() => {
                        setModalDate(formatDate(next.date));
                        setModalNote(next.note);
                        setModalDesc(next.description);
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
  }, [navigation, nextStagesByLiqueur, pastStagesByLiqueur, acceptShared, rejectShared, formatDate, daysAgo, daysUntil, styles]);

  // Oblicz tileSize
  const numColumns = windowWidth < 360 ? 1 : 2;
  const tileMargin = 12;
  const containerPadding = 40;
  const tileSize = (windowWidth - tileMargin * (numColumns + 1) - containerPadding) / numColumns;

  // ------------------------------------------------------------------
  // 13. Render przepisy
  const renderRecipeItem = useCallback(({ item }) => {
    const icon = getIconSourceByName(item.name);
    return (
      <View style={styles.itemWrapper(tileSize)}>
        <TouchableOpacity
          onPress={() => navigation.navigate('LiqueurDetails', {
            liqueur: {
              ...item,
              status: 'recipes',
              created_at: item.created_at || null,
              description: item.description || '',
              comment: item.comment || '',
              from_user: '',
              user_id: userId,
            }
          })}
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
  }, [navigation, userId, tileSize, styles]);

  // ------------------------------------------------------------------
  // 14. Render archiwum
  const renderArchived = useCallback(({ item }) => {
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
  }, [navigation, tileSize, styles, formatDate]);

  // ------------------------------------------------------------------
  // 15. Render główny komponent
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
            const isActive = tab.key===activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: isActive?tab.color:'#f5e6c4' },
                  isActive&&styles.activeTabElevated,
                ]}
                onPress={() => onChangeTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={24} color={isActive?'#fff':tab.color}/>
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
        {(() => {
          // Wybieramy odpowiedni stan loading / refreshing i dane
          if (activeTab === 'archive') {
            // Archiwum
            return (
              loadingArchive 
              ? <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#8D6E63" /></View>
              : <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                  <FlatList
                    ref={listRef}
                    data={filteredLiqueurs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderArchived}
                    numColumns={numColumns}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    refreshControl={
                      <RefreshControl refreshing={refreshingArchive} onRefresh={onRefreshArchive} />
                    }
                    ListEmptyComponent={
                      <Text style={styles.noDataText}>Brak archiwalnych nalewek</Text>
                    }
                  />
                </Animated.View>
            );
          } else if (activeTab === 'recipes') {
            // Przepisy
            return (
              loadingRecipes
              ? <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#8D6E63" /></View>
              : <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                  <FlatList
                    ref={listRef}
                    data={filteredLiqueurs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderRecipeItem}
                    numColumns={numColumns}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    refreshControl={
                      <RefreshControl refreshing={refreshingRecipes} onRefresh={onRefreshRecipes} />
                    }
                    ListEmptyComponent={
                      <Text style={styles.noDataText}>Brak przepisów</Text>
                    }
                  />
                </Animated.View>
            );
          } else {
            // Active, New, Shared - wszystkie z listy aktywnych
            return (
              loadingActive
              ? <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#8D6E63" /></View>
              : <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                  <FlatList
                    ref={listRef}
                    data={filteredLiqueurs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    numColumns={numColumns}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    refreshControl={
                      <RefreshControl refreshing={refreshingActive} onRefresh={onRefreshActive} />
                    }
                    ListEmptyComponent={
                      <Text style={styles.noDataText}>
                        {activeTab === 'shared'
                          ? 'Brak udostępnionych'
                          : activeTab === 'new'
                            ? 'Brak nalewek w trybie edycji'
                            : 'Brak nalewek do wyświetlenia'}
                      </Text>
                    }
                  />
                </Animated.View>
            );
          }
        })()}

        {/* Przycisk dodaj */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddLiqueur', {
            // Po utworzeniu w AddLiqueur: navigation.navigate('Home', { action: 'add', item: newItem });
          })}
          style={styles.addFloatingButton}
        >
          <Ionicons name="add" size={28} color="#fff"/>
        </TouchableOpacity>

        {/* Modal szczegóły etapu */}
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
            <Text style={{ fontSize: 14, color: '#3b2a1f', fontWeight: 'bold', marginBottom: 4 }}>
  Opis:
</Text>
<Text style={[styles.modalNote, { color: '#5a4a3c', fontSize: 16, marginBottom: 20 }]}>
  {modalDesc?.trim() || 'Brak opisu do etapu'}
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
export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);

  return StyleSheet.create({
  safeArea:{flex: 1,
        backgroundColor: '#2e1d14',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      },
  customHeader:{
    height:56, flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:20, backgroundColor:'#2e1d14', borderBottomWidth:1, borderBottomColor:'#3b2a1f',
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.2, shadowRadius:4, elevation:3,
  },
  headerTitle:{ color:'#f5e6c4', fontSize:20, fontWeight:'700', fontFamily:'serif' },
  headerIcon:{ padding:4 },

  container: {
      flex: 1,
      paddingHorizontal: norm(20),
      backgroundColor: '#2e1d14',
    },
  backgroundImage:{ opacity:0.8, resizeMode:'cover' },

  tabsContainer:{ flexDirection:'row', justifyContent:'space-around', marginBottom:12 },
  tabButton:{
    width:50, height:50, borderRadius:25, justifyContent:'center', alignItems:'center',
    marginHorizontal:6, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:2, elevation:2, marginTop: 10,
  },
  activeTabElevated:{ shadowOffset:{width:0,height:3}, shadowOpacity:0.2, shadowRadius:4, elevation:5 },
  badgeCountContainer:{
    position:'absolute', bottom:-2, right:-2,
    backgroundColor:'#2e1d14', borderRadius:8, minWidth:16, height:16,
    justifyContent:'center', alignItems:'center', paddingHorizontal:2,
  },
  badgeCountText:{ color:'#fff', fontSize:10, fontWeight:'600' },
opisLabel: {
  fontSize: 14,
  color: '#3b2a1f',
  fontWeight: 'bold',
  marginBottom: 4
},
  list:{ paddingBottom:60 },
  row:{ justifyContent:'space-between', marginBottom:14 },
  noDataText:{ textAlign:'center', marginTop:40, fontSize:18, color:'#f5e6c4' },

  itemWrapper: tileSize => ({ width:tileSize }),
  itemTile:{
    backgroundColor:'#8d6943', borderRadius:12, opacity:0.9,
    paddingVertical:12,paddingHorizontal:12,alignItems:'center',
    minHeight:220, position:'relative',
  },
  sharedTile:{ backgroundColor:'#4FB0AE', opacity:0.7 },
  newTile:{ backgroundColor:'#424242', opacity:0.7 },
  archivedTile:{ backgroundColor:'#424242', opacity:0.8 },

  liqueurIcon:{ width:100, height:100, marginBottom:10 },
  itemText:{ color:'#f5e6c4', fontSize:16, fontWeight:'700', marginBottom:10, textAlign:'center' },

  sharedByText:{ color:'#fff', fontSize:12, fontStyle:'italic', marginBottom:8, textAlign:'center' },
  sharedButtonsContainer:{ flexDirection:'row', marginTop:12, justifyContent:'center' },
  acceptButton:{ backgroundColor:'#2E7D32', padding:8, borderRadius:10, marginRight:10, elevation:4 },
  rejectButton:{ backgroundColor:'#D32F2F', padding:8, borderRadius:10, elevation:4 },
  badgeShare:{ position:'absolute', top:10, right:10, backgroundColor:'#2e1d14', padding:4, borderRadius:6 },
  badgeTextShare:{ color:'#fff', fontSize:12, fontWeight:'bold' },
 badgeArchive:{ position:'absolute', top:10, right:10, backgroundColor:'#2e1d14', padding:4, borderRadius:6 },
  badgeTextArchive:{ color:'#fff', fontSize:12, fontWeight:'bold' },
  dateInfoContainer:{ width:'100%', marginBottom:8 },
  dateRow:{ flexDirection:'row', alignItems:'center', marginBottom:2 },
  icon:{ marginRight:5 },
  dateValue:{ color:'#bba68f', fontSize:12 },
  loaderContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

  nextStageRow:{ flexDirection:'row', alignItems:'center', gap:6, marginTop:4, marginBottom: 6},
  nextStageText:{ fontSize:12, color:'#e1c699'},
  daysText:{ color:'#e1c699', fontSize:12, position:'absolute', bottom:10, left:12},
  
  newInfoText:{ color:'#f5f1e0', fontSize:13, textAlign:'center', fontStyle:'italic', paddingHorizontal:6 },
  badge:{ position:'absolute', top:10, right:10, backgroundColor:'#3B3B3B', padding:4, borderRadius:6 },
  badgeText:{ color:'#fff', fontSize:12, fontWeight:'bold' },

  editHint:{ flexDirection:'row', alignItems:'center', justifyContent:'center', marginTop:6 },
  editHintText:{ marginLeft:4, color:'#a97458', fontSize:12, fontWeight:'600' },

  // profesjonalny modal w odcieniach brązu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#b08968',   // jasny brąz
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2e1d14',              // ciemny brąz kontrastujący
  },
  modalContent: {
    marginBottom: 20,
  },
  todayStageItem: {
    backgroundColor: '#f0ead6',    // jasny kremowy
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  todayStageDone: {
    backgroundColor: '#e6d5b8',
  },
  todayStagePressed: {
    opacity: 0.6,
  },
  todayStageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayStageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b2a1f',             // ciemny brąz
  },
  todayStageNameDone: {
    textDecorationLine: 'line-through',
    color: '#7d6a58',
  },
  todayStageNote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#5a4a3c',
  },
  stageStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDone: {
    color: '#2E7D32',             // zachowujemy zielone dla done
  },
  statusPending: {
    color: '#D32F2F',             // czerwone dla pending
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#8d6943',   // głęboki brąz
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  skipButton: {
    backgroundColor: '#6c5847',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5e6c4',
  },
  skipButtonText: {
    color: '#e1c699',
  },
  addFloatingButton: {
  position: 'absolute',
  bottom: 20,
  right: 20,
  backgroundColor: '#8d6943',
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 6,
   },
  badgesColumn: {
  marginTop: 10,
  gap: 4,
},

badgesColumn: {
  marginTop: 8,
  gap: 4,
  alignItems: 'flex-start',
},

badgeRow: {
  flexDirection: 'column',
  gap: 8,
},

badgeTextSmall: {
  color: '#f5e6c4',
  fontSize: 12,
  fontWeight: '600',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  overflow: 'hidden',
},
badgeArchive: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#a97458',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},

badgeTextArchive: {
  color: '#fff',
  fontSize: 11,
  fontWeight: 'bold',
},
loader: {
  marginTop: norm(30),
  alignItems: 'center',
},

searchSortHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: norm(16),
      marginVertical: norm(8),
    },

    // Kontener pola wyszukiwania wraz z przyciskiem X:
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3b2a1f',  // ciemny brąz, nieco jaśniejszy niż tło
      borderRadius: norm(8),
      borderWidth: 1,
      borderColor: '#5a4a3c',      // delikatna ramka
      paddingHorizontal: norm(8),
      height: norm(40),
    },
    // Pole tekstowe wewnątrz:
    searchInput: {
      flex: 1,
      color: '#f5e6c4',            // jasny beż dla tekstu
      fontSize: norm(15),
      paddingVertical: 0,          // by wyrównać pionowo
      // paddingHorizontal: ??? // już robione w containerze
    },
    clearButton: {
      marginLeft: norm(4),
      // nie trzeba dodatkowego tła, ikona ma kolor
    },

    sortButton: {
      marginLeft: norm(8),
      padding: norm(8),
      backgroundColor: '#3b2a1f',
      borderRadius: norm(8),
      borderWidth: 1,
      borderColor: '#5a4a3c',
      justifyContent: 'center',
      alignItems: 'center',
    },

  });
};