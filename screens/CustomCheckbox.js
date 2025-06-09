import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CustomCheckbox({ label, checked, onPress }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [checked]);

  const checkmarkStyle = {
    transform: [{ scale }],
    opacity: scale,
  };

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        <Animated.Text style={[styles.checkmark, checkmarkStyle]}>
          ✓
        </Animated.Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  box: {
    height: 22,
    width: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#a97458',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boxChecked: {
    backgroundColor: '#a97458',
  },
  checkmark: {
    color: '#2e1d14',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    color: '#f5e6c4',
    fontSize: 16,
  },
});
