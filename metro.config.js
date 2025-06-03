const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Jeśli masz pliki SVG i chcesz je obsługiwać inaczej, możesz odkomentować poniższą linię:
// config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

// Ścieżka do pustego modułu, który musisz stworzyć (emptyModule.js)
const emptyModule = path.resolve(__dirname, 'emptyModule.js');

config.resolver.extraNodeModules = {
  https: require.resolve('stream-http'),  // zamiennik https
  http: require.resolve('stream-http'),
  stream: require.resolve('readable-stream'),
  crypto: require.resolve('react-native-crypto'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  net: emptyModule,   // mock modułu net
  tls: emptyModule,   // mock modułu tls
  // dodaj inne shimy, jeśli potrzebujesz
};

// Dodaj to, żeby Metro poprawnie znalazł extraNodeModules
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
