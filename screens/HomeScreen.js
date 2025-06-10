import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

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
function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function HomeScreen() {
  // wszystkie hooki – bez żadnych warunków przed nimi

  const { width } = useWindowDimensions();
  const styles = createStyles(width);
  const norm = (sz) => normalize(sz, width);
  
  const { width: windowWidth } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const alertShown = useRef(false);
  const [todayModalVisible, setTodayModalVisible] = useState(false);
  const [todaysStagesList, setTodaysStagesList] = useState([]);
  const [liqueurs, setLiqueurs] = useState([]);
  const [archivedLiqueurs, setArchivedLiqueurs] = useState([]);
  const [nextStagesByLiqueur, setNextStagesByLiqueur] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNote, setModalNote] = useState('');
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [modalDate, setModalDate] = useState('');
  const [recipesList, setRecipesList] = useState([]);


  // pobierz użytkownika
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.log('Błąd pobierania użytkownika:', error);
      else if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // odśwież dane po userId
 // odśwież dane po userId, włącznie z przepisami
useEffect(() => {
  if (!userId) return;
  fetchAllData();
  fetchArchivedData();
  fetchRecipes();            // ← tutaj dopisujemy
}, [userId]);

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
    console.error('Błąd fetchRecipes:', e);
    setRecipesList([]);
  }
};



  // odśwież przy zmianie zakładki
useFocusEffect(
  useCallback(() => {
    if (!userId) return;

    if (activeTab === 'archive') {
      fetchArchivedData();
    } else if (activeTab === 'recipes') {
      fetchRecipes();
    } else {
      fetchAllData();
    }

    if (route.params?.returnToModal) {
      setTodayModalVisible(true);
      navigation.setParams({ returnToModal: undefined });
    }
  }, [userId, activeTab, route.params?.returnToModal])
);


  // normalize + kafelki
  const numColumns = windowWidth < 360 ? 1 : 2;
  const tileMargin = 12;
  const containerPadding = 40;
  const tileSize = (windowWidth - tileMargin * (numColumns + 1) - containerPadding) / numColumns;

  const titlesByTab = {
    active: 'Aktywne nalewki',
    new: 'Nowe nalewki',
    shared: 'Udostępnione',
    archive: 'Archiwalne nalewki',
    recipes: 'Przepisy', 
  };

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
      setTodayModalVisible(false);
      alertShown.current = false;
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

 const fetchAllData = async () => {
  try {
    // 1. Pobierz nalewki
    const statuses = activeTab === 'recipes'
  ? ['recipes']
  : ['active','new','waiting'];
    const { data: liqueursData, error: lError } = await supabase
      .from('nalewki')
      .select('*')
      .eq('user_id', userId)
      .in('status', statuses)
      .order('created_at',{ ascending:false });
    if (lError) throw lError;
    setLiqueurs(liqueursData || []);

    // 2. Mapa dat startu
    const createdMap = {};
    liqueursData.forEach(l => {
      createdMap[l.id] = l.created_at ? new Date(l.created_at) : null;
    });

    // 3. Pobierz etapy (pomijając skip_notif)
    const { data: stagesData, error: sError } = await supabase
      .from('etapy')
      .select('nalewka_id,note,execute_after_days,id,is_done,skip_notif')
      .or('skip_notif.eq.false,skip_notif.is.null');
    if (sError) throw sError;

    // 4. ustalamy "dziś" raz, w południe UTC (żeby uniknąć przesunięć UTC/+02)
    const cutoff = new Date();
    cutoff.setUTCHours(12, 0, 0, 0);
    const todayStr = cutoff.toISOString().slice(0,10);

    // 5. Zbuduj mapę kolejnych etapów
    const nextMap = {};
    stagesData.forEach(stage => {
      const start = createdMap[stage.nalewka_id];
      if (!start) return;

      const dt = new Date(start);
      dt.setUTCHours(12, 0, 0, 0); // południe UTC
      dt.setDate(dt.getDate() + (stage.execute_after_days || 0));

      // jeśli etap jest przed południem dzisiaj UTC => pomiń
      if (dt.getTime() < cutoff.getTime()) return;

      const key = stage.nalewka_id;
      const existing = nextMap[key];
      if (!existing || new Date(existing.date).getTime() > dt.getTime()) {
        nextMap[key] = {
          date: dt.toISOString().slice(0,10), // YYYY-MM-DD
          note: stage.note,
          is_done: stage.is_done,
          etap_id: stage.id,
        };
      }
    });

    setNextStagesByLiqueur(nextMap);

    // 6. Filtruj etapy na "dzisiaj"
    const todays = Object.entries(nextMap).filter(([_, st]) =>
      st.date === todayStr
    );

    console.log('todayStr=', todayStr, 'found todays=', todays.length);

    // 7. pokaż modal jeśli coś jest
   if (todays.length && !alertShown.current) {
  alertShown.current = true;
  const list = todays
    .map(([id, st]) => {
      // tutaj porównujemy jako stringi
      const l = liqueursData.find(x => String(x.id) === id);
      return l
        ? {
            name: l.name,
            note: st.note || 'Brak notatki',
            etap_id: st.etap_id,
            is_done: st.is_done || false,
            nalewka_id: +id,
          }
        : null;
    })
    .filter(Boolean);

  console.log('setting todaysStagesList:', list);
  setTodaysStagesList(list);
  setTodayModalVisible(true);
}


  } catch (e) {
    console.error(e);
    setLiqueurs([]);
    setNextStagesByLiqueur({});
  }
};


  const fetchArchivedData = async () => {
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
      console.error(e);
      setArchivedLiqueurs([]);
    }
  };

  const formatDate = ds => {
    if (!ds) return '';
    const d = new Date(ds);
    return isNaN(d) ? '' : d.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  };
  const daysUntil = ds => {
    const t = new Date(ds), n = new Date();
    t.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.round((t-n)/(1000*60*60*24));
  };
  const daysAgo = ds => {
    const c = new Date(ds), n = new Date();
    c.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.floor((n-c)/(1000*60*60*24));
  };

  const acceptShared = async id => {
    await supabase.from('nalewki').update({status:'recipes'}).eq('id',id);
    fetchAllData();
  };
  const rejectShared = id => {
    Alert.alert('Usuń nalewkę','Na pewno?',[
      { text:'Anuluj',style:'cancel' },
      { text:'Usuń',style:'destructive',onPress:async()=>{
        await supabase.from('skladniki').delete().eq('nalewka_id',id);
        await supabase.from('etapy').delete().eq('nalewka_id',id);
        await supabase.from('nalewki').delete().eq('id',id);
        fetchAllData();
      }}
    ]);
  };

  const getFiltered = () => {
  if (activeTab === 'archive')   return archivedLiqueurs;
  if (activeTab === 'recipes')   return recipesList;
  if (activeTab === 'shared')    return liqueurs.filter(l => l.status === 'waiting');
  return liqueurs.filter(l => l.status === activeTab);
};

  const countBy = st => liqueurs.filter(l=> st==='shared'?l.status==='waiting':l.status===st).length;

 const tabs = [
  { key:'active',  icon:'flask-outline',           color:'#2E7D32', count: countBy('active') },
  { key:'new',     icon:'time-outline',            color:'#5C7AEA', count: countBy('new') },
  { key:'shared',  icon:'share-social-outline',    color:'#F57C00', count: countBy('shared') },
  { key:'archive', icon:'archive-outline',         color:'#424242', count: archivedLiqueurs.length },
  { key:'recipes', icon:'book-outline',            color:'#8D6E63', count: recipesList.length }, // ← tu
];


  const goToStage = (liqId) => {
    const obj = liqueurs.find(l=>l.id===liqId);
    if (!obj) return;
    setTodayModalVisible(false);
    navigation.navigate('LiqueurDetails',{liqueur:obj,returnToModal:true});
  };

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
          onPress={()=>navigation.navigate('LiqueurDetails',{liqueur:item})}
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
             {next && daysLeft !== null && daysLeft >= 0 && (
  <View style={styles.nextStageRow}>
    <Ionicons name="time-outline" size={16} color="#e1c699"/>
    <Text style={styles.nextStageText}>
      Etap: {daysLeft === 0 ? 'dzisiaj' : `za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}`}
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
)}

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
  
  // kafelek przepisow
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

        {/* --- badge'y z liczbą składników i etapów --- */}
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
                onPress={()=>setActiveTab(tab.key)}
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
        <FlatList
  data={getFiltered()} 
  keyExtractor={item => item.id.toString()}
  renderItem={
    activeTab === 'archive' ? renderArchived
    : activeTab === 'recipes' ? renderRecipeItem
    : renderItem
  }
  numColumns={numColumns}
  contentContainerStyle={styles.list}
  columnWrapperStyle={styles.row}
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
       <TouchableOpacity
          onPress={()=>navigation.navigate('AddLiqueur')}
          style={styles.addFloatingButton}
        >
          <Ionicons name="add" size={28} color="#fff"/>
        </TouchableOpacity>
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
      {/* ——— Modal “Etapy na dziś” ——— */}
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

  liqueurIcon:{ width:70, height:70, marginBottom:10 },
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

  nextStageRow:{ flexDirection:'row', alignItems:'center', gap:6, marginTop:4 },
  nextStageText:{ fontSize:12, color:'#e1c699' },
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


   
  });
};