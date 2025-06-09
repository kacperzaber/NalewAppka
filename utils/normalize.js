import { PixelRatio } from 'react-native';

export function normalize(size, screenWidth) {
  const scale = screenWidth / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
