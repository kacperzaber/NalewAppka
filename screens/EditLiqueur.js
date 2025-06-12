// screens/EditLiqueur.js
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  PixelRatio,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function EditLiqueur({ route, navigation }) {
  const { width } = useWindowDimensions();
  const styles = createStyles(width);
  const norm = (sz) => normalize(sz, width);

  const { liqueur } = route.params;
  // Zapisujemy poprzedni status, by przekazać do HomeScreen przy update/delete
  const prevStatus = liqueur.status;

  const parseDate = (ds) => {
    if (!ds) return null;
    const d = new Date(ds);
    return isNaN(d.getTime()) ? null : d;
  };

  const [name, setName] = useState(liqueur.name);
  const [date, setDate] = useState(parseDate(liqueur.created_at));
  const [pickDate, setPickDate] = useState(date || new Date());
  const [editingDate, setEditingDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setStages(data);
        }
      });
  }, [liqueur.id]);

  const onDateChange = (e, d) => {
    if (Platform.OS === 'ios') {
      if (e.type === 'set') setPickDate(d);
      else if (e.type === 'dismissed') cancelEdit();
    } else {
      if (e.type === 'set') setDate(d);
      setEditingDate(false);
    }
  };

  const startEditDate = () => {
    setPickDate(date || new Date());
    setEditingDate(true);
  };
  const saveDate = () => {
    setDate(pickDate);
    setEditingDate(false);
  };
  const cancelEdit = () => {
    setPickDate(date);
    setEditingDate(false);
  };

  const requestPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  };

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Uwaga', 'Nazwa nie może być pusta');
    setLoading(true);

    // 1. Aktualizacja nalewki w supabase, pobranie zwróconego obiektu updatedItem
    const updates = {
      name: name.trim(),
      created_at: date ? date.toISOString() : null,
    };
    const { data: updatedItem, error } = await supabase
      .from('nalewki')
      .update(updates)
      .eq('id', liqueur.id)
      .select()
      .single();

    if (error) {
      setLoading(false);
      return Alert.alert('Błąd', error.message);
    }

    // 2. Obsługa powiadomień dla etapów, jeśli jest data
    if (date) {
      // Pobierz userId
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { data: userData, error: userDataErr } = await supabase
          .from('users')
          .select('notification_hours')
          .eq('id', userId)
          .single();
        let notificationHour = '15:00';
        if (!userDataErr && userData?.notification_hours) {
          notificationHour = userData.notification_hours;
        }
        const [hourStr = '0', minuteStr = '0'] = notificationHour.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        const now = Date.now();

        const hasPermission = await requestPermission();
        if (!hasPermission) {
          console.warn('Brak uprawnień na powiadomienia');
        }

        for (const s of stages) {
          // Oblicz datę etapu
          const stageDate = new Date(date);
          stageDate.setDate(stageDate.getDate() + (s.execute_after_days || 0));
          stageDate.setHours(0, 0, 0, 0);

          // Anuluj stare powiadomienie, jeśli istnieje
          if (s.notification_id) {
            try {
              await Notifications.cancelScheduledNotificationAsync(s.notification_id);
            } catch (err) {
              console.warn(`Nie udało się anulować starego powiadomienia etapu ${s.id}`, err);
            }
          }

          // Zaktualizuj w supabase pole date (jeśli masz taką kolumnę)
          const { error: updateError } = await supabase
            .from('etapy')
            .update({ date: stageDate.toISOString() })
            .eq('id', s.id);
          if (updateError) {
            console.warn('Błąd aktualizacji daty etapu w supabase:', updateError);
            continue;
          }

          // Zaplanuj nowe powiadomienie, jeśli w przyszłości
          const notifDate = new Date(stageDate);
          notifDate.setHours(hour, minute, 0, 0);

          if (hasPermission && notifDate.getTime() >= now) {
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Przypomnienie',
                  body: `Etap "${s.note}" zaplanowany na ${notifDate.toLocaleDateString('pl-PL')}`,
                  data: { stageId: s.id },
                },
                trigger: { type: 'date', date: notifDate },
              });
              // Zapisz notification_id w supabase
              await supabase
                .from('etapy')
                .update({ notification_id: notificationId })
                .eq('id', s.id);
            } catch (err) {
              console.warn(`Błąd harmonogramowania powiadomienia etapu ${s.id}`, err);
            }
          }
        }
      }
    }

    setLoading(false);

    // 3. Nawigacja do HomeScreen z prawidłowymi parametrami:
    navigation.navigate('Home', {
      action: 'update',
      item: updatedItem,
      prevStatus: prevStatus,
    });
  };

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
            setLoading(true);
            try {
              // Anuluj powiadomienia etapów
              for (const s of stages) {
                if (s.notification_id) {
                  try {
                    await Notifications.cancelScheduledNotificationAsync(s.notification_id);
                  } catch (err) {
                    console.warn(`Nie udało się anulować powiadomienia etapu ${s.id}:`, err);
                  }
                }
              }
              // Usuń składniki i etapy w supabase
              await supabase.from('skladniki').delete().eq('nalewka_id', liqueur.id);
              await supabase.from('etapy').delete().eq('nalewka_id', liqueur.id);
              const { error } = await supabase.from('nalewki').delete().eq('id', liqueur.id);
              if (error) {
                throw error;
              }
              setLoading(false);
              // Nawigacja do Home z akcją delete:
              navigation.navigate('Home', {
                action: 'delete',
                itemId: liqueur.id,
                prevStatus: prevStatus,
              });
            } catch (e) {
              setLoading(false);
              Alert.alert('Błąd', e.message || 'Wystąpił błąd podczas usuwania');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edycja nalewki</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Nazwa:</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Wpisz nazwę"
            placeholderTextColor="#bba68f"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Data startu:</Text>
          {!editingDate ? (
            date ? (
              <TouchableOpacity style={styles.dateBtn} onPress={startEditDate}>
                <Text style={styles.dateTxt}>
                  {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  <Text style={styles.editHint}> (Edytuj)</Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noDate}>Brak daty</Text>
            )
          ) : (
            <>
              <DateTimePicker
                value={pickDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                onChange={onDateChange}
                style={styles.picker}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.rowBtn}>
                  <TouchableOpacity style={styles.smallBtn} onPress={saveDate}>
                    <Text style={styles.smallTxt}>Zapisz</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.cancelBtn]} onPress={cancelEdit}>
                    <Text style={styles.smallTxt}>Anuluj</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditIngredients', { liqueur })}>
          <Text style={styles.actionTxt}>Edytuj składniki</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditStages', { liqueur })}>
          <Text style={styles.actionTxt}>Zarządzaj etapami</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabled]}
          onPress={onSave}
          disabled={loading}
        >
          <Text style={styles.saveTxt}>{loading ? 'Zapisywanie...' : 'Zapisz zmiany'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity
        style={[styles.deleteBtn, loading && styles.disabled]}
        onPress={onDelete}
        disabled={loading}
      >
        <Text style={styles.deleteTxt}>Usuń nalewkę</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#2e1d14',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    scroll: { padding: 24, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: '700', color: '#f5e6c4', textAlign: 'center', marginBottom: 32 },
    section: { marginBottom: 24 },
    label: { color: '#bba68f', fontSize: 16, marginBottom: 6, fontWeight: '600' },
    input: { backgroundColor: '#5a4635', borderRadius: 12, padding: 12, fontSize: 18, color: '#f5e6c4' },
    dateBtn: { padding: 14, backgroundColor: '#5a4635', borderRadius: 12, alignItems: 'center' },
    dateTxt: { color: '#f5e6c4', fontSize: 18, fontWeight: '500' },
    editHint: { color: '#bba68f', fontStyle: 'italic', fontSize: 14 },
    noDate: { color: '#e1c699', fontSize: 18, textAlign: 'center' },
    picker: { backgroundColor: '#5a4635', borderRadius: 12, overflow: 'hidden' },
    rowBtn: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    smallBtn: { flex: 1, padding: 12, backgroundColor: '#8d6943', borderRadius: 8, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#6b4b3a', marginLeft: 8 },
    smallTxt: { color: '#f5e6c4', fontWeight: '600' },
    actionBtn: { backgroundColor: '#a97458', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
    actionTxt: { color: '#2e1d14', fontWeight: '700', fontSize: 16 },
    saveBtn: { backgroundColor: '#a97458', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 32 },
    saveTxt: { color: '#2e1d14', fontWeight: '700', fontSize: 18 },
    disabled: { opacity: 0.6 },
    deleteBtn: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      padding: 16,
      borderRadius: 14,
      backgroundColor: '#8b2d2d',
      alignItems: 'center',
    },
    deleteTxt: { color: '#f5e6c4', fontWeight: '700', fontSize: 18 },
  });
};
