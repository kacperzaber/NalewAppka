import { registerRootComponent } from 'expo';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Buffer } from 'buffer';
import { EventEmitter } from 'events';
import 'react-native-url-polyfill/auto';

// Globalne ustawienia dla Buffer i EventEmitter (potrzebne dla supabase itp.)
if (!global.Buffer) {
  global.Buffer = Buffer;
}
if (!global.EventEmitter) {
  global.EventEmitter = EventEmitter;
}

// Import ekranów
import AddLiqueurScreen from './screens/AddLiqueurScreen';
import AddStageScreen from './screens/AddStageScreen';
import EditIngredients from './screens/EditIngredients'; // <- nowy ekran
import EditLiqueurScreen from './screens/EditLiqueur';
import HomeScreen from './screens/HomeScreen';
import LiqueurDetails from './screens/LiqueurDetails';
import LoginScreen from './screens/LoginScreen';
import StageListScreen from './screens/StageListScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Moje Nalewki', headerShown: false }}
        />
        <Stack.Screen
          name="AddLiqueur"
          component={AddLiqueurScreen}
          options={{ title: 'Dodaj nalewkę', headerShown: false }}
        />
        <Stack.Screen
          name="EditLiqueur"
          component={EditLiqueurScreen}
          options={{ title: '', headerShown: false }}
        />
        <Stack.Screen
          name="LiqueurDetails"
          component={LiqueurDetails}
          options={{ title: '', headerShown: false }}
        />
        <Stack.Screen
          name="StageList"
          component={StageListScreen}
          options={{ title: 'Etapy nalewki' }}
        />
        <Stack.Screen
          name="AddStage"
          component={AddStageScreen}
          options={{ title: '', headerShown: false }}
        />
        <Stack.Screen
          name="EditIngredients"
          component={EditIngredients}
          options={{ title: '',headerShown: false   }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
