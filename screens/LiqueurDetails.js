// screens/LiqueurDetails.js

import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import CommentSection from '../components/CommentSection';
import { planStageNotifications } from '../utils/notifications'; // dopasuj ścieżkę

import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { supabase } from '../lib/supabase';


// Funkcja do skalowania rozmiarów w zależności od szerokości ekranu
function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function LiqueurDetails({ route }) {

  console.log('Jestem na 2 ekranie')

  console.log('route', route)

  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const styles = createStyles(width);
  const norm = (sz) => normalize(sz, width);

  const { liqueur } = route.params;
  const [currentLiqueur, setCurrentLiqueur] = useState(liqueur);
  const [stages, setStages] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stages');
  const [expandedStages, setExpandedStages] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [comment, setComment] = useState(liqueur.comment || '');
  const [userNotificationHour, setUserNotificationHour] = useState(null);


  // Stan przełącznika "Powiadomienia"
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Boolean(liqueur.notification)
  );
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  // Modal do udostępniania
  const [modalVisible, setModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
// Modal do wyboru daty rozpoczęcia
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [startDate, setStartDate] = useState(
    liqueur.created_at ? new Date(liqueur.created_at) : new Date()
  );

  useEffect(() => {
  getCurrentUserEmail();
  fetchStages();
  fetchIngredients();
  fetchUserPreferences(); // 🆕
}, []);
 const markStageDone = async (stageId) => {
    try {
      const { error } = await supabase
        .from('etapy')
        .update({ is_done: true })
        .eq('id', stageId);
      if (error) throw error;
      setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, is_done: true } : s));
      Alert.alert('Sukces', 'Etap został oznaczony jako wykonany.');
    } catch (err) {
      console.error(err);
      Alert.alert('Błąd', 'Nie udało się zaktualizować etapu.');
    }
  };

const fetchUserPreferences = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data, error } = await supabase
    .from('users')
    .select('notification_hours')
    .eq('id', user.id)
    .single();
  
  if (!error && data?.notification_hours) {
    setUserNotificationHour(data.notification_hours);
  }
};

  const getCurrentUserEmail = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();


    if (error || !user) {
      console.error('Błąd pobierania użytkownika:', error?.message);
      return;
    }
    setCurrentUserEmail(user.email);
  };

  async function fetchStages() {
    setLoading(true);
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', currentLiqueur.id)
      .order('execute_after_days', { ascending: true });
    setLoading(false);

    if (error) {
      Alert.alert('Błąd pobierania etapów:', error.message);
    } else {
      const sorted = data.slice().sort(
        (a, b) => (a.execute_after_days || 0) - (b.execute_after_days || 0)
      );
      setStages(sorted);
    }
  }

  async function fetchIngredients() {
    const { data, error } = await supabase
      .from('skladniki')
      .select('*')
      .eq('nalewka_id', currentLiqueur.id)
      .order('created_at', { ascending: true });
    if (error) {
      Alert.alert('Błąd pobierania składników:', error.message);
    } else {
      setIngredients(data);
    }
  }

  const toggleStageExpand = (stageId) => {
    setExpandedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  // --- Archiwizacja nalewki ---
  const archiveLiqueur = () => {
    Alert.alert(
      'Archiwizacja nalewki',
      'Czy na pewno chcesz przenieść tę nalewkę do archiwum?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Archiwizuj',
          style: 'destructive',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              const { error } = await supabase
                .from('nalewki')
                .update({ status: 'archive', archive_date: now, comment })
                .eq('id', currentLiqueur.id);
              if (error) throw error;

              setCurrentLiqueur({
                ...currentLiqueur,
                status: 'archive',
                archive_date: now,
                comment,
                
              });
              Alert.alert('OK', 'Nalewka została przeniesiona do archiwum.');
              stages.map(async (s) => {
                              if (s.notification_id) {
                                try {
                                  await Notifications.cancelScheduledNotificationAsync(s.notification_id);
                                } catch (err) {
                                  console.warn(
                                    `Nie udało się anulować powiadomienia etapu ${s.id}:`,
                                    err
                                  );
                                }
                              }
                            })
              navigation.goBack();
            } catch (err) {
              Alert.alert('Błąd', 'Nie udało się zarchiwizować nalewki.');
              console.error(err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // --- Wznów nalewkę z archiwum ---
const resumeLiqueur = () => {
  const isRecipe = currentLiqueur.status === 'recipes';

  const title = isRecipe
    ? 'Zastosuj przepis'
    : 'Wznów nalewkę';
  const message = isRecipe
    ? 'Czy na pewno chcesz utworzyć nalewkę na podstawie tego przepisu? Powstanie szkic z etapami i składnikami.'
    : 'Czy na pewno chcesz wznowić tę nalewkę? Utworzy się nowy szkic z etapami i składnikami.';
  const confirmText = isRecipe ? 'Użyj przepisu' : 'Wznów';

  Alert.alert(
    title,
    message,
    [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: confirmText,
        onPress: async () => {
            try {
              // 1) Utwórz nową nalewkę w statusie 'new', kopiując pola poza datami
              const { data: newLiqueur, error: newError } = await supabase
                .from('nalewki')
                .insert([
                  {
                    user_id: currentLiqueur.user_id,
                    name: currentLiqueur.name,
                    description: currentLiqueur.description,
                    status: 'new',
                    from_user: currentLiqueur.from_user || '',
                    comment: currentLiqueur.comment || '',
                  },
                ])
                .select()
                .single();
              if (newError || !newLiqueur) throw newError || new Error('Błąd tworzenia wznowionej nalewki');

              // 2) Skopiuj etapy (bez dat)
              const etapIdMap = new Map();
              for (const s of stages) {
                const { data: ns, error: sError } = await supabase
                  .from('etapy')
                  .insert([
                    {
                      nalewka_id: newLiqueur.id,
                      note: s.note,
                      execute_after_days: s.execute_after_days,
                    },
                  ])
                  .select()
                  .single();
                if (sError || !ns) throw sError || new Error('Błąd kopiowania etapu');
                etapIdMap.set(s.id, ns.id);
              }

              // 3) Skopiuj składniki, przypisując je do nowych etapów
              for (const ing of ingredients) {
                const newEtapId = ing.etap_id ? etapIdMap.get(ing.etap_id) : null;
                const { error: iError } = await supabase.from('skladniki').insert([
                  {
                    nalewka_id: newLiqueur.id,
                    name: ing.name,
                    amount: ing.amount,
                    etap_id: newEtapId,
                  },
                ]);
                if (iError) throw iError || new Error('Błąd kopiowania składnika');
              }

              Alert.alert(
              isRecipe ? 'Przepis zastosowany' : 'Gotowe',
              isRecipe
                ? 'Na podstawie tego przepisu utworzono nową nalewkę w trybie edycji.'
                : 'Nalewka została wznowiona jako szkic.'
            );

            navigation.replace('LiqueurDetails', { liqueur: newLiqueur });
          } catch (err) {
            Alert.alert('Błąd', isRecipe
              ? 'Nie udało się zastosować tego przepisu.'
              : 'Nie udało się wznowić nalewki.'
            );
            console.error(err);
          }
        },
      },
    ],
    { cancelable: true }
  );
};

  // --- Nowa, uniwersalna formatDate, przyjmuje Date lub string ---
const formatDate = (dateInput) => {
  if (!dateInput) return 'Brak daty';
  const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(d.getTime())) return 'Brak daty';

  // Ustawiamy godzinę na 00:00 lokalnie, aby uniknąć przesunięcia daty
  d.setHours(0, 0, 0, 0);

  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};


  // Oblicza datę wykonania etapu: startDate + days
  const calculateStageDate = (days) => {
    if (!currentLiqueur.created_at) return null;
    const start = new Date(currentLiqueur.created_at);
    start.setHours(0, 0, 0, 0);
    const result = new Date(start);
    result.setDate(start.getDate() + days);
    return result;
  };

  // Zatwierdzanie daty rozpoczęcia: zmiana statusu na 'active'
const confirmStartDate = async () => {
  console.log('confirmStartDate start');

  if (!startDate) {
    console.warn('Brak startDate');
    return;
  }

  console.log('Aktualizuję nalewkę w bazie...');
  const { error: updateError } = await supabase
    .from('nalewki')
    .update({ status: 'active', created_at: startDate.toISOString() })
    .eq('id', currentLiqueur.id);

  if (updateError) {
    Alert.alert('Błąd przy zapisie daty:', updateError.message);
    return;
  }

  console.log('Nalewka zaktualizowana');
  console.log('Stages', stages);

  if (!stages || stages.length === 0) {
    Alert.alert(
      'Informacja',
      'Brak etapów do aktualizacji. Nalewka zapisana bez etapów.',
      [
        {
          text: 'OK',
          onPress: () => {
            setCurrentLiqueur({
              ...currentLiqueur,
              status: 'active',
              created_at: startDate.toISOString(),
            });
            setShowStartDateModal(false);
            fetchStages();
            fetchIngredients();
            navigation.replace('LiqueurDetails', {
              liqueur: {
                ...currentLiqueur,
                status: 'active',
                created_at: startDate.toISOString(),
              },
            });
          }
        }
      ],
      { cancelable: false }
    );
    return;
  }

  // 1. Zawsze aktualizujemy daty etapów
  await Promise.all(
    stages.map(async (stage) => {
      try {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + (stage.execute_after_days || 0));
        newDate.setUTCHours(12, 0, 0, 0);


        const { error: stageError } = await supabase
          .from('etapy')
          .update({ date: newDate.toISOString() })
          .eq('id', stage.id);

        if (stageError) {
          console.error('Błąd update etapu:', stage.id, stageError);
        }

        return stageError;
      } catch (e) {
        console.error('Wyjątek przy aktualizacji etapu:', stage.id, e);
        return e;
      }
    })
  );

  // 2. Jeśli powiadomienia są włączone, ustawiamy je
  if (currentLiqueur.notification === true) {
    const notificationHour = userNotificationHour ?? '15:00';
    const [hourStr = '15', minuteStr = '0'] = notificationHour.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    await Promise.all(
      stages.map(async (stage) => {
        try {
          const stageDate = new Date(startDate);
          stageDate.setDate(stageDate.getDate() + (stage.execute_after_days || 0));
          stageDate.setHours(hour, minute, 0, 0);

          if (Date.now() > stageDate.getTime()) return;

          if (stage.notification_id) {
            try {
              await Notifications.cancelScheduledNotificationAsync(stage.notification_id);
            } catch (e) {
              console.warn('Nie można anulować powiadomienia', stage.notification_id, e);
            }
          }

          const newNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Przypomnienie',
              body: `Etap "${stage.note}" zaplanowany na ${stageDate.toLocaleDateString('pl-PL')}`,
              data: { stageId: stage.id },
            },
            trigger: { date: stageDate },
          });

          await supabase
            .from('etapy')
            .update({ notification_id: newNotificationId })
            .eq('id', stage.id);
        } catch (e) {
          console.error('Wyjątek przy powiadomieniu etapu:', stage.id, e);
        }
      })
    );
  } else {
    Alert.alert(
      'Informacja',
      'Powiadomienia nie zostały zaplanowane. Brak włączonej zgody.'
    );
  }

  // 3. Finalna aktualizacja stanu UI
  setCurrentLiqueur({
    ...currentLiqueur,
    status: 'active',
    created_at: startDate.toISOString(),
  });
  setShowStartDateModal(false);
  fetchStages();
  fetchIngredients();
  navigation.replace('LiqueurDetails', {
    liqueur: {
      ...currentLiqueur,
      status: 'active',
      created_at: startDate.toISOString(),
    },
  });
};


// usuwanie
  const onDelete = () => {
    Alert.alert(
      'Usuń nalewkę',
      'Na pewno?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                stages.map(async (s) => {
                  if (s.notification_id) {
                    try {
                      await Notifications.cancelScheduledNotificationAsync(s.notification_id);
                    } catch (err) {
                      console.warn(`Nie udało się anulować powiadomienia etapu ${s.id}:`, err);
                    }
                  }
                })
              );

              await supabase.from('skladniki').delete().eq('nalewka_id', liqueur.id);
              await supabase.from('etapy').delete().eq('nalewka_id', liqueur.id);
              await supabase.from('nalewki').delete().eq('id', liqueur.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Błąd', e.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };




  // Udostępnianie nalewki po emailu
  const shareLiqueurByEmail = async () => {
    if (!emailInput.trim()) {
      Alert.alert('Proszę wpisać adres email');
      return;
    }

    setSharingLoading(true);
    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, share_permission')
        .eq('email', emailInput.trim().toLowerCase());

      if (userError) throw new Error(userError.message);
      if (!users || users.length === 0) {
        Alert.alert('Brak użytkownika z takim adresem email w bazie');
        setSharingLoading(false);
        return;
      }
      if (users[0].share_permission !== true) {
        Alert.alert(
          'Nie można udostępnić przepisu. Wybrany użytkownik nie zezwala na otrzymywanie przepisów od innych.'
        );
        setSharingLoading(false);
        return;
      }
      if (users.length > 1) {
        Alert.alert('Znaleziono więcej niż jednego użytkownika z tym adresem email!');
        setSharingLoading(false);
        return;
      }

      const user = users[0];
      // Kopiowanie nalewki
      const { data: newLiqueur, error: lError } = await supabase
        .from('nalewki')
        .insert([
          {
            user_id: user.id,
            name: currentLiqueur.name,
            description: currentLiqueur.description,
            status: 'waiting',
            from_user: currentUserEmail || '',
          },
        ])
        .select()
        .single();
      if (lError || !newLiqueur) throw new Error(lError?.message || 'Błąd kopiowania nalewki');

      // Kopiowanie etapów
      const etapIdMap = new Map();
      for (const s of stages) {
        const { data: ns, error: sError } = await supabase
          .from('etapy')
          .insert([
            {
              nalewka_id: newLiqueur.id,
              note: s.note,
              execute_after_days: s.execute_after_days,
            },
          ])
          .select()
          .single();
        if (sError || !ns) throw new Error(sError?.message || 'Błąd kopiowania etapu');
        etapIdMap.set(s.id, ns.id);
      }

      // Kopiowanie składników
      for (const ing of ingredients) {
        const newEtapId = ing.etap_id ? etapIdMap.get(ing.etap_id) : null;
        const { error: iError } = await supabase.from('skladniki').insert([
          {
            nalewka_id: newLiqueur.id,
            name: ing.name,
            amount: ing.amount,
            etap_id: newEtapId,
          },
        ]);
        if (iError) throw new Error(iError.message || 'Błąd kopiowania składnika');
      }

      Alert.alert('Udostępniono nalewkę:', user.email);
      setModalVisible(false);
      setEmailInput('');
    } catch (err) {
      Alert.alert('Błąd udostępniania', err.message);
    } finally {
      setSharingLoading(false);
    }
  };

  const openShareModal = () => {
    setEmailInput('');
    setModalVisible(true);
  };



const toggleNotifications = async () => {
  setTogglingNotifications(true);
  const newValue = !notificationsEnabled;
  try {
    const { error } = await supabase
      .from('nalewki')
      .update({ notification: newValue })
      .eq('id', currentLiqueur.id);
    if (error) {
      throw new Error(error.message);
    }
    setNotificationsEnabled(newValue);
    setCurrentLiqueur({ ...currentLiqueur, notification: newValue });

    if (newValue) {
      // Włączasz powiadomienia — planuj przypomnienia
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Brak zalogowanego użytkownika');

      const { data: userPrefs, error: prefsError } = await supabase
        .from('users')
        .select('notification_hours')
        .eq('id', user.id)
        .single();

      if (prefsError) {
        console.warn('Nie udało się pobrać preferencji użytkownika:', prefsError.message);
      }

      const notificationHour = userPrefs?.notification_hours ?? '15:00';

      await planStageNotifications(stages, currentLiqueur.created_at, user.id, notificationHour);
    }else {
  // Wyłączasz powiadomienia — anuluj wszystkie istniejące powiadomienia etapów
  await Promise.all(
    stages.map(async (stage) => {
      if (stage.notification_id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(stage.notification_id);
          // Usuń notification_id z bazy
          await supabase
            .from('etapy')
            .update({ notification_id: null })
            .eq('id', stage.id);
        } catch (e) {
          console.warn('Nie udało się anulować powiadomienia', stage.notification_id, e);
        }
      }
    })
  );
  Alert.alert('Powiadomienia', 'Wszystkie powiadomienia zostały wyłączone i usunięte.');
}

  } catch (err) {
    Alert.alert('Błąd', 'Nie udało się zmienić ustawienia powiadomień.');
  } finally {
    setTogglingNotifications(false);
  }
};


  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: norm(100) }}
            showsVerticalScrollIndicator={false}
          >
            {/* --- Nagłówek z nazwą i ikonami --- */}
            <View style={styles.headerRow}>
  <Text style={styles.title}>{currentLiqueur.name}</Text>

  <View style={styles.headerRight}>
    {/* ACTIVE & NEW: notifications / share / archive */}
    {currentLiqueur.status !== 'archive' &&
     currentLiqueur.status !== 'waiting' &&
     currentLiqueur.status !== 'recipes' && (
      <>
        <MaterialIcons
          name="notifications"
          size={norm(20)}
          color={notificationsEnabled ? '#a97458' : '#6e6e6e'}
          style={{ marginRight: norm(8) }}
        />
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          disabled={togglingNotifications}
          trackColor={{ false: '#48423a', true: '#a97458' }}
          thumbColor={notificationsEnabled ? '#f5e6c4' : '#888'}
        />

        <TouchableOpacity
          onPress={openShareModal}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="share" size={norm(24)} color="#f5e6c4" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={archiveLiqueur}
          style={{ marginLeft: norm(8), padding: norm(4) }}
          activeOpacity={0.7}
          accessibilityLabel="Archiwizuj nalewkę"
        >
          <MaterialIcons name="archive" size={norm(20)} color="#6e6e6e" />
        </TouchableOpacity>
      </>
    )}

    {/* WAITING: only share */}
    {currentLiqueur.status === 'waiting' && (
      <TouchableOpacity
        onPress={openShareModal}
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="share" size={norm(24)} color="#f5e6c4" />
      </TouchableOpacity>
    )}

    {/* RECIPES: share + use template */}
    {currentLiqueur.status === 'recipes' && (
      <>
        <TouchableOpacity
          onPress={openShareModal}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="share" size={norm(24)} color="#f5e6c4" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={resumeLiqueur}
          style={styles.resumeBtn}
          activeOpacity={0.7}
          accessibilityLabel="Użyj schematu"
        >
          <MaterialIcons
            name="content-paste"
            size={norm(20)}
            color="#2e1d14"
          />
          <Text style={styles.resumeText}>Użyj schematu</Text>
        </TouchableOpacity>
      </>
    )}

    {/* ARCHIVE: resume */}
    {currentLiqueur.status === 'archive' && (
      <TouchableOpacity
        onPress={resumeLiqueur}
        style={styles.resumeBtn}
        activeOpacity={0.7}
        accessibilityLabel="Wznów nalewkę"
      >
        <MaterialIcons
          name="play-circle-outline"
          size={norm(20)}
          color="#2e1d14"
        />
        <Text style={styles.resumeText}>Wznów</Text>
      </TouchableOpacity>
      
    )}
    {currentLiqueur.status === 'archive' && (
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        activeOpacity={0.7}
        accessibilityLabel="Usuń"
      >
        <MaterialIcons
          name="delete"
          size={norm(20)}
          color="#2e1d14"
        />
        <Text style={styles.resumeText}>Usuń</Text>
      </TouchableOpacity>
      
    )}
  </View>
</View>


            {/* --- Data archiwizacji (jeśli archiwum) --- */}
            {currentLiqueur.status === 'archive' && (
              <View style={styles.archiveInfo}>
                <MaterialIcons name="archive" size={norm(20)} color="#d0c4af" />
                <Text style={styles.archiveText}>
                  Archiwum: {formatDate(currentLiqueur.archive_date)}
                </Text>
              </View>
            )}

            {/* --- Pole komentarza --- */}
          {/* --- Pole komentarza jako bottom-sheet modal --- */}
<CommentSection
  comment={comment}
  setComment={setComment}          // aktualizuje lokalny stan
  disabled={currentLiqueur.status === 'archive'}
  onSave={async (newComment) => {
    // najpierw zapisz lokalnie, żeby UI od razu odświeżył tekst
    setComment(newComment);
    console.log('newComment',newComment)
    // a teraz zapisz w Supabase
    const { error } = await supabase
      .from('nalewki')
      .update({ comment: newComment })
      .eq('id', currentLiqueur.id);

    if (error) {
      Alert.alert('Błąd', 'Nie udało się zapisać komentarza.');
      console.error(error);
    } else {
      Alert.alert('Sukces', 'Komentarz został zapisany.');
    }
  }}
/>



            {/* --- Data rozpoczęcia (tylko jeśli nie archiwum) --- */}
            {currentLiqueur.status !== 'archive' && (
              <View style={styles.startSection}>
                {currentLiqueur.status === 'new' ? (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => setShowStartDateModal(true)}
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={norm(18)}
                      color="#f5e6c4"
                      style={{ marginRight: norm(6) }}
                    />
                    <Text style={styles.startButtonText}>
                      Wybierz datę rozpoczęcia
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.infoBox}>
                    <MaterialIcons
                      name="calendar-today"
                      size={norm(18)}
                      color="#f5e6c4"
                      style={{ marginRight: norm(6) }}
                    />
                    <Text style={styles.infoText}>
                      Data rozpoczęcia:{' '}
                      {formatDate(currentLiqueur.created_at)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* --- Zakładki: Etapy / Składniki (zawsze widoczne) --- */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'stages' && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab('stages')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'stages' && styles.tabButtonTextActive,
                  ]}
                >
                  Etapy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'ingredients' && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab('ingredients')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'ingredients' && styles.tabButtonTextActive,
                  ]}
                >
                  Składniki
                </Text>
              </TouchableOpacity>
            </View>

            {/* --- Lista etapów --- */}
        {activeTab === 'stages' && (
  <View style={{ marginTop: norm(10) }}>
    {loading ? (
      <Text style={styles.centerText}>Ładowanie etapów...</Text>
    ) : stages.length === 0 ? (
      <Text style={styles.centerText}>Brak etapów do wyświetlenia</Text>
    ) : (
     stages.map((stage) => {
  const { id, note, execute_after_days: days = 0, is_done: done } = stage;
  const stageIngredients = ingredients.filter((i) => i.etap_id === id);
  const expanded = expandedStages.includes(id);

  return (
    <Pressable
      key={id}
      onPress={() => toggleStageExpand(id)}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [
        styles.stageCard,
        pressed && { opacity: 0.85 } // efekt przy kliknięciu, nie przy scrollu
      ]}
      hitSlop={8}
    >
      {/* Nagłówek */}
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>{note || 'Bez nazwy'}</Text>
        <View style={styles.headerRightContainer}>
          {done && (
            <View style={styles.doneBadgeInline}>
              <MaterialIcons name="check-circle" size={16} color="#f5e6c4" />
              <Text style={styles.doneBadgeText}>Wykonane</Text>
            </View>
          )}
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={norm(24)}
            color="#f5e6c4"
          />
        </View>
      </View>

      {/* Zawartość po rozwinięciu */}
      {expanded && (
        <View style={styles.stageContent}>
          <Text style={styles.stageSubtitle}>Składniki:</Text>
          {stageIngredients.length > 0 ? (
            stageIngredients.map((ing) => (
              <Text key={ing.id} style={styles.ingredientText}>
                • {ing.name} – {ing.amount}
              </Text>
            ))
          ) : (
            <Text style={styles.ingredientText}>Brak składników</Text>
          )}
        </View>
      )}

      {/* Badge z dniami */}
      <View style={styles.badgesContainer}>
        <View style={styles.badge}>
          <MaterialIcons
            name={days === 0 ? 'star' : 'timer'}
            size={norm(14)}
            color="#2e1d14"
            style={{ marginRight: norm(4) }}
          />
         <Text style={styles.badgeText}>
  {!days || Number(days) === 0 ? 'Etap początkowy' : `Po ${days} dniach`}
</Text>

        </View>
      </View>

      {/* Data pod badge’em */}
      {currentLiqueur.created_at && (
        <View style={styles.dateContainer}>
          <MaterialIcons
            name="event"
            size={norm(14)}
            color="#f5e6c4"
            style={{ marginRight: norm(4) }}
          />
          <Text style={styles.dateText}>
            {formatDate(calculateStageDate(days))}
          </Text>
        </View>
      )}

      {/* Pływający przycisk „Wykonaj” */}
      {!done && liqueur?.status === 'active' && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.(); // zapobiega rozwinięciu
            markStageDone(id);
          }}
        >
          <MaterialIcons name="check" size={20} color="#f5e6c4" />
        </TouchableOpacity>
      )}
    </Pressable>
  );
})

    )}
  </View>
)}

            {/* --- Lista składników --- */}
            {activeTab === 'ingredients' && (
              <View style={{ marginTop: norm(10) }}>
                {ingredients.length === 0 ? (
                  <Text style={styles.centerText}>
                    Brak składników do wyświetlenia
                  </Text>
                ) : (
                  ingredients.map((ing) => (
                    <View key={ing.id} style={styles.ingredientCard}>
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* --- Modal: Wybór daty rozpoczęcia --- */}
       {showStartDateModal && (
  <Modal
    animationType="slide"
    transparent={true}
    visible={showStartDateModal}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Wybierz datę rozpoczęcia</Text>
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (event.type === 'dismissed') {
              setShowStartDateModal(false); // zamknij modal przy anulowaniu
            } else if (event.type === 'set' && date) {
              setStartDate(date); // ustaw datę
              // Jeśli chcesz, możesz też tu zamknąć modal i pominąć przycisk "Potwierdź"
              setShowStartDateModal(false);
              confirmStartDate();
            }
          }}
        />
        <View style={styles.datePickerButtons}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalCancelBtn]}
            onPress={() => setShowStartDateModal(false)}
          >
            <Text style={styles.modalBtnText}>Anuluj</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalConfirmBtn]}
            onPress={confirmStartDate}
          >
            <Text style={styles.modalBtnText}>Potwierdź</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}

            {/* --- Modal: Udostępnianie --- */}
            {modalVisible && (
              <Modal animationType="fade" transparent={true} visible={modalVisible}>
                <View style={styles.modalOverlay}>
                  <View style={styles.shareModal}>
                    <View style={styles.shareHeader}>
                      <MaterialIcons name="email" size={norm(20)} color="#f5e6c4" />
                      <Text style={styles.shareTitle}>Udostępnij nalewkę</Text>
                    </View>
                    <Text style={styles.shareSubtitle}>
                      Podaj adres e-mail użytkownika, który ma otrzymać przepis:
                    </Text>
                    <TextInput
                      style={styles.shareInput}
                      placeholder="np. przyklad@domena.pl"
                      placeholderTextColor="#b2a68f"
                      value={emailInput}
                      onChangeText={setEmailInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.shareButtonsRow}>
                      <TouchableOpacity
                        style={[styles.shareBtn, styles.shareBtnCancel]}
                        onPress={() => setModalVisible(false)}
                        disabled={sharingLoading}
                      >
                        <Text style={styles.shareBtnText}>Anuluj</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.shareBtn, styles.shareBtnSend]}
                        onPress={shareLiqueurByEmail}
                        disabled={sharingLoading || !emailInput.trim()}
                      >
                        <MaterialIcons
                          name="send"
                          size={norm(18)}
                          color="#2e1d14"
                          style={{ marginRight: norm(6) }}
                        />
                        <Text style={styles.shareBtnText}>
                          {sharingLoading ? 'Wysyłanie...' : 'Wyślij'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);

  return StyleSheet.create({
safeContainer: {
      flex: 1,
      backgroundColor: '#2e1d14',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    container: {
      flex: 1,
      paddingHorizontal: norm(20),
      backgroundColor: '#2e1d14',
    },
    headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'nowrap', // opcjonalnie – zabezpiecza przed zawijaniem
},

    headerRightContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},

    // 2. Header
   headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'black',
      marginTop: norm(10),
      marginBottom: norm(16),
    },
    title: {
      fontSize: norm(20),
      fontWeight: 'bold',
      color: '#f5e6c4',
      flexShrink: 1,
    },
    headerRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: norm(6),
      marginLeft: norm(12),
    },
    datePickerButtons: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: norm(8), // jeśli używasz RN 0.71+
  marginTop: norm(12),
},

    // 3. Archive
    archiveInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: norm(12),
    },
    archiveText: {
      marginLeft: norm(6),
      color: '#d0c4af',
      fontSize: norm(14),
    },

  
    resumeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#a97458',
      borderRadius: norm(8),
      paddingHorizontal: norm(8),
      paddingVertical: norm(6),
      marginLeft: 20,
    },
     deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#823330',
      borderRadius: norm(8),
      paddingHorizontal: norm(8),
      paddingVertical: norm(6),
      marginLeft: 10,
    },
    resumeText: {
      color: '#2e1d14',
      fontSize: norm(14),
      fontWeight: '600',
    },

    // 5. Start date
startSection: {
      marginTop: norm(15),
      marginBottom: norm(10),
      alignItems: 'center',
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#6a4e3a',
      paddingVertical: norm(12),
      paddingHorizontal: norm(20),
      borderRadius: norm(8),
      alignSelf: 'flex-start',
    },
    startButtonText: {
      color: '#f5e6c4',
      fontSize: norm(16),
      fontWeight: '600',
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#49392e',
      borderRadius: norm(8),
      padding: norm(12),
      width: '100%',
    },
    infoText: {
      color: '#f5e6c4',
      fontSize: norm(14),
      marginLeft: norm(6),
    },
    ingredientText: {
       color: '#f5e6c4',
      fontSize: norm(12),
      marginLeft: norm(6),
    },
    // 6. Tabs
    tabBar: {
      flexDirection: 'row',
      marginTop: norm(20),
      marginBottom: norm(10),
      justifyContent: 'center',
    },
    tabButton: {
      flex: 1,
      paddingVertical: norm(10),
      alignItems: 'center',
      backgroundColor: '#49392e',
      marginHorizontal: norm(5),
      borderRadius: norm(8),
    },
    tabButtonActive: {
      backgroundColor: '#a97458',
    },
    tabButtonText: {
      color: '#f5e6c4',
      fontSize: norm(14),
      fontWeight: '600',
    },
    tabButtonTextActive: {
      color: '#2e1d14',
      fontSize: norm(14),
      fontWeight: '700',
    },

    // 7. Stage cards
    centerText: {
      color: '#f5e6c4',
      fontSize: norm(14),
      textAlign: 'center',
      marginVertical: norm(20),
    },
    stageCard: {
      backgroundColor: '#49392e',
      borderRadius: norm(10),
      padding: norm(14),
      marginVertical: norm(6),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
      position: 'relative',
    },
    stageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    stageTitle: {
      fontSize: norm(16),
      fontWeight: '700',
      color: '#f5e6c4',
      flexShrink: 1,
    },
    stageSubtitle: {
      fontSize: norm(14),
      fontWeight: '600',
      color: '#d2d2d2',
      marginBottom: norm(6),
    },

    badgesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: norm(12),
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: norm(4),
      paddingHorizontal: norm(8),
      borderRadius: norm(6),
      backgroundColor: '#a97458',
      marginRight: norm(8),
    },
    badgeText: {
      color: '#2e1d14',
      fontSize: norm(12),
      fontWeight: '700',
    },

    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: norm(6),
    },
    dateText: {
      color: '#f5e6c4',
      fontSize: norm(12),
    },

    doneBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(106,78,58,0.9)',
      borderRadius: norm(12),
      paddingHorizontal: norm(6),
      paddingVertical: norm(2),
      marginRight: norm(6),
    },
    doneBadgeText: {
      color: '#f5e6c4',
      fontSize: norm(12),
      marginLeft: norm(4),
    },

    actionButton: {
      position: 'absolute',
      bottom: norm(10),
      right: norm(10),
      width: norm(36),
      height: norm(36),
      borderRadius: norm(18),
      backgroundColor: '#6a4e3a',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },

    // 8. Ingredient cards
    ingredientCard: {
      backgroundColor: '#49392e',
      borderRadius: norm(8),
      padding: norm(10),
      marginVertical: norm(4),
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ingredientName: {
      color: '#f5e6c4',
      fontSize: norm(14),
      fontWeight: '600',
    },
    ingredientAmount: {
      color: '#d2d2d2',
      fontSize: norm(12),
    },

    // 9. Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: norm(20),
    },
    modalContent: {
      backgroundColor: '#49392e',
      borderRadius: norm(10),
      padding: norm(20),
    },
    modalTitle: {
      color: '#f5e6c4',
      fontSize: norm(16),
      fontWeight: '700',
      marginBottom: norm(12),
      textAlign: 'center',
    },
    modalBtn: {
  flex: 1,
  paddingVertical: norm(10),
  backgroundColor: '#5a4635',
  borderRadius: norm(8),
  alignItems: 'center',
  justifyContent: 'center', // <== TO JEST KLUCZ
  marginHorizontal: norm(4),
},
modalCancelBtn: { backgroundColor: '#6e3e3e' },
modalConfirmBtn: { backgroundColor: '#4e7a4e' },
modalBtnText: {
  color: '#f5e6c4',
  fontWeight: '600',
},


    // 10. Share modal
    shareModal: {
      backgroundColor: '#4b3a2b',
      borderRadius: norm(10),
      padding: norm(20),
      elevation: 8,
    },
    shareHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: norm(12),
    },
    shareTitle: {
      color: '#f5e6c4',
      fontSize: norm(18),
      fontWeight: '700',
      marginLeft: norm(8),
    },
    shareSubtitle: {
      color: '#d2d2d2',
      fontSize: norm(14),
      marginBottom: norm(12),
      lineHeight: norm(20),
    },
    shareInput: {
      backgroundColor: '#3a3a3a',
      borderRadius: norm(8),
      paddingHorizontal: norm(10),
      paddingVertical: norm(8),
      color: '#f5e6c4',
      fontSize: norm(14),
      marginBottom: norm(16),
      borderWidth: 1,
      borderColor: '#6a4e3a',
    },
    shareButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: norm(10),
      paddingHorizontal: norm(14),
      borderRadius: norm(6),
      marginLeft: norm(10),
    },
    shareBtnCancel: { backgroundColor: '#6a4e3a' },
    shareBtnSend: { backgroundColor: '#a97458' },
    shareBtnText: {
      color: '#2e1d14',
      fontSize: norm(14),
      fontWeight: '700',
    },
  });
};






