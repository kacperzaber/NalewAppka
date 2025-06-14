import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AddLiqueurScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [userId, setUserId] = useState(null);

  // Pobieramy aktualnego użytkownika po załadowaniu komponentu
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.log('Błąd pobierania użytkownika:', error);
        return;
      }
      if (user) {
        setUserId(user.id);
      }
    };

    fetchUser();
  }, []);

  const onSave = async () => {
    Keyboard.dismiss();
    console.log('Kliknięto Zapisz');

    if (!name.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę nalewki');
      return;
    }

    if (!userId) {
      Alert.alert('Błąd', 'Nie można pobrać danych użytkownika. Spróbuj ponownie.');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('nalewki')
        .insert({ name, user_id: userId , status: 'recipes'})
        .select();

      if (insertError) {
        Alert.alert('Błąd', insertError.message);
        console.log('Błąd inserta:', insertError);
      } else {
        console.log('Dodano nalewkę:', data);
        Alert.alert('Sukces', 'Nalewka została dodana!');
         navigation.navigate('Home', { action: 'add', item: data.id });
      }
    } catch (e) {
      console.log('Błąd w onSave:', e);
      Alert.alert('Błąd', 'Coś poszło nie tak');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Nowa nalewka</Text>

        <TextInput
          style={styles.input}
          placeholder="Nazwa nalewki"
          placeholderTextColor="#bba68f"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={onSave}
          blurOnSubmit={false}
        />

        <TouchableOpacity style={styles.button} onPress={onSave} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Zapisz</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e1d14',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    color: '#f5e6c4',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  input: {
    backgroundColor: '#4a3c2f',
    color: '#f5e6c4',
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a674f',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#a97458',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#2e1d14',
    fontSize: 18,
    fontWeight: '700',
  },
});
