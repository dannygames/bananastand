import { StyleSheet } from 'react-native';

import { PhotoPicker } from '@/components/PhotoPicker';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <PhotoPicker onImageSelected={(uri) => console.log('Selected image:', uri)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - will be set by ThemedView based on theme
  },
});
