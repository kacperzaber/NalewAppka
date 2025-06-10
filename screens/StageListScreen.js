import { useEffect, useState } from 'react';
import { Button, FlatList, PixelRatio, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function StageListScreen({ route, navigation }) {
  const { liqueur } = route.params;
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStages();
  }, []);

  function normalize(size, screenWidth) {
    const scale = screenWidth / 375;
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }

  async function fetchStages() {
    setLoading(true);
    const { data, error } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id)
      .order('date', { ascending: true });

    if (error) {
      alert('Błąd pobierania etapów: ' + error.message);
    } else {
      setStages(data);
    }
    setLoading(false);
  }

  const renderItem = ({ item }) => (
    <View style={styles.stageItem}>
      <Text style={styles.stageDate}>{new Date(item.date).toLocaleDateString()}</Text>
      <Text style={styles.stageNote}>{item.note}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{liqueur.name}</Text>
      <Text style={styles.subTitle}>Etapy:</Text>

      {loading ? (
        <Text style={styles.message}>Ładowanie...</Text>
      ) : stages.length === 0 ? (
        <>
          <Text style={styles.message}>Brak etapów dla tej nalewki.</Text>
          <Button
            title="Dodaj etap"
            onPress={() => navigation.navigate('AddStage', { liqueur })}
            color="#a97458"
          />
        </>
      ) : (
        <>
          <FlatList
            data={stages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
          />
          <Button
            title="Dodaj etap"
            onPress={() => navigation.navigate('AddStage', { liqueur })}
            color="#a97458"
          />
        </>
      )}
    </View>
  );
}

export const createStyles = (width) => {
  const norm = (sz) => normalize(sz, width);

  return StyleSheet.create({

    container: {
      flex: 1,
      paddingHorizontal: norm(20),
      backgroundColor: '#2e1d14',
    },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f5e6c4',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 20,
    color: '#bba68f',
    marginBottom: 10,
  },
  stageItem: {
    backgroundColor: '#4a3c2f',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  stageDate: {
    color: '#a97458',
    fontWeight: '600',
    marginBottom: 5,
  },
  stageNote: {
    color: '#f5e6c4',
    fontSize: 16,
  },
  message: {
    color: '#f5e6c4',
    marginBottom: 10,
    fontSize: 16,
   },
  });
};
