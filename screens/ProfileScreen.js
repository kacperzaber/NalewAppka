// screens/ProfileScreen.js
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PixelRatio,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';
import { updateAllUserNotifications } from '../utils/notifications';

function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export default function ProfileScreen({ navigation }) {

   const { width } = useWindowDimensions();
    const styles = createStyles(width);
    const norm = (sz) => normalize(sz, width);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [sharePermission, setSharePermission] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);

  // notificationTime jako "HH:mm" — to jest wartość zapisana w bazie
  const [notificationTime, setNotificationTime] = useState('09:00');

  // tempTime — tymczasowa wartość wybrana w DateTimePicker
  const [tempTime, setTempTime] = useState(null);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [updatingTime, setUpdatingTime] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user: supaUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !supaUser) {
        setLoading(false);
        return;
      }
      setUser(supaUser);
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('share_permission, notification_hours')
        .eq('id', supaUser.id)
        .single();
      if (!fetchError && data) {
        setSharePermission(data.share_permission);
        if (data.notification_hours) {
          setNotificationTime(data.notification_hours);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Usuwam ten efekt, bo aktualizacja powiadomień będzie wywoływana ręcznie po zatwierdzeniu
  // useEffect(() => {
  //   if (notificationTime && user) {
  //     (async () => {
  //       try {
  //         await updateAllUserNotifications(user.id, notificationTime);
  //         console.log('Powiadomienia zaktualizowane do nowej godziny:', notificationTime);
  //       } catch (e) {
  //         console.error('Błąd podczas aktualizacji powiadomień:', e);
  //       }
  //     })();
  //   }
  // }, [notificationTime, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6)
      return Alert.alert('Błąd', 'Hasło musi mieć min. 6 znaków');
    if (newPassword !== confirmPassword)
      return Alert.alert('Błąd', 'Hasła nie są zgodne');
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) Alert.alert('Błąd', error.message);
    else {
      Alert.alert('Sukces', 'Hasło zostało zmienione');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const toggleSharePermission = async () => {
    const newVal = !sharePermission;
    setUpdatingPermission(true);
    const { error } = await supabase
      .from('users')
      .update({ share_permission: newVal })
      .eq('id', user.id);
    setUpdatingPermission(false);
    if (error) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować uprawnień');
    } else {
      setSharePermission(newVal);
    }
  };

  // Parsuje "HH:mm" na Date w dniu dzisiejszym
  const parseTimeString = (hm) => {
    const [h, m] = hm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Obsługa zmiany czasu w pickerze, ale bez zapisu do bazy
  const handleTimeChange = (event, date) => {
    if (Platform.OS === 'android') {
      // na Androidzie picker automatycznie znika po wyborze/cancel
      setShowTimePicker(false);
      if (event.type === 'set' && date) {
        setTempTime(date);
      }
    } else {
      // na iOS picker może działać inaczej, tu zapisujemy tempTime
      if (date) {
        setTempTime(date);
      }
    }
  };

  // Funkcja zapisująca wybraną godzinę do bazy i stanu
const saveNotificationTime = () => {
  if (!tempTime || !user) {
    setShowTimePicker(false);
    return;
  }

  Alert.alert(
    'Potwierdzenie zmiany godziny',
    'Zmiana godziny powiadomień spowoduje zmianę wszystkich dotychczasowych powiadomień. Czy chcesz kontynuować?',
    [
      {
        text: 'Anuluj',
        style: 'cancel',
        onPress: () => {
          setShowTimePicker(false);
          setTempTime(null);
        },
      },
      {
        text: 'Tak',
        onPress: async () => {
          const hh = tempTime.getHours().toString().padStart(2, '0');
          const mm = tempTime.getMinutes().toString().padStart(2, '0');
          const str = `${hh}:${mm}`;

          setUpdatingTime(true);
          const { error } = await supabase
            .from('users')
            .update({ notification_hours: str })
            .eq('id', user.id);
          setUpdatingTime(false);

          setShowTimePicker(false);

          if (error) {
            Alert.alert('Błąd', 'Nie udało się zapisać godziny');
          } else {
            setNotificationTime(str);
            setTempTime(null);
            Alert.alert('Zaktualizowano', `Godzina powiadomień: ${str}`);

            try {
              await updateAllUserNotifications(user.id, str);
              console.log('Powiadomienia zaktualizowane do nowej godziny:', str);
            } catch (e) {
              console.error('Błąd podczas aktualizacji powiadomień:', e);
            }
          }
        },
      },
    ],
    { cancelable: false }
  );
};


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8d6943" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {user && (
          <>
            <Text style={styles.name}>
              {user.user_metadata.full_name || 'Użytkownik'}
            </Text>
            <Text style={styles.email}>{user.email}</Text>

            {/* Zmiana hasła */}
            <View style={styles.section}>
              <Text style={styles.label}>Zmień hasło</Text>
              <TextInput
                placeholder="Nowe hasło"
                secureTextEntry
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!changingPassword}
              />
              <TextInput
                placeholder="Potwierdź hasło"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!changingPassword}
              />
              <TouchableOpacity
                style={[styles.button, changingPassword && styles.disabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                <Text style={styles.buttonText}>
                  {changingPassword ? '...' : 'Zmień hasło'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Udostępnianie */}
            <View style={styles.section}>
              <Text style={styles.label}>Udostępnianie</Text>
              <View style={styles.row}>
                <Text style={styles.text}>Odbieraj przepisy</Text>
                <Switch
                  value={sharePermission}
                  onValueChange={toggleSharePermission}
                  disabled={updatingPermission}
                  thumbColor={sharePermission ? '#8d6943' : '#ccc'}
                  trackColor={{ false: '#ccc', true: '#b99b74' }}
                />
              </View>
            </View>

            {/* Godzina powiadomień */}
            <View style={styles.section}>
              <Text style={styles.label}>Godzina powiadomień</Text>
              <TouchableOpacity
                style={[styles.timeBtn, updatingTime && styles.disabled]}
                onPress={() => {
                  setTempTime(parseTimeString(notificationTime));
                  setShowTimePicker(true);
                }}
                disabled={updatingTime}
              >
                <MaterialIcons name="access-time" size={20} color="#2e1d14" />
                <Text style={styles.timeText}>{notificationTime}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <>
                  <DateTimePicker
                    value={tempTime || parseTimeString(notificationTime)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                    onChange={handleTimeChange}
                  />

                  {/* Na iOS i web dajemy przyciski Zapisz i Anuluj */}
                  {Platform.OS === 'ios' && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        marginTop: 10,
                      }}
                    >
                      <TouchableOpacity
                        style={[styles.button, styles.timeSaveButton]}
                        onPress={saveNotificationTime}
                        disabled={updatingTime}
                      >
                        <Text style={styles.buttonText}>Zapisz</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.timeCancelButton]}
                        onPress={() => {
                          setShowTimePicker(false);
                          setTempTime(null);
                        }}
                        disabled={updatingTime}
                      >
                        <Text style={styles.buttonText}>Anuluj</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Wyloguj */}
            <TouchableOpacity
              style={[styles.button, styles.logout]}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Wyloguj</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);

  return StyleSheet.create({
safe: {
      flex: 1,
      backgroundColor: '#f5e6c4',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

  scroll: { padding: 20 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5e6c4',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2e1d14',
    fontFamily: 'serif',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#5a4b3b',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: { marginBottom: 30 },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e1d14',
    marginBottom: 10,
    fontFamily: 'serif',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#8d6943',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#8d6943',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#f5e6c4',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  disabled: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { fontSize: 16, color: '#2e1d14' },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d9cba7',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2e1d14',
    fontWeight: '600',
  },
  logout: { marginTop: 10, backgroundColor: '#D32F2F' },

  timeSaveButton: {
    flex: 1,
    marginRight: 5,
    backgroundColor: '#8d6943',
  },
  timeCancelButton: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#D32F2F',
     },
  });
};