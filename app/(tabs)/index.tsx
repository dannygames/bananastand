import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PhotoPicker } from '@/components/PhotoPicker';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');

  const handleImageSelected = (uri: string) => {
    console.log('Selected image:', uri);
    setSelectedImageUri(uri);
    
    if (uri && uri.startsWith('http')) {
      // Image has been uploaded to R2 and is ready for video generation
      console.log('✅ Image uploaded to R2 and ready for video generation');
    } else if (uri) {
      // Local image selected
      console.log('📱 Local image selected, will be uploaded when generating video');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <PhotoPicker onImageSelected={handleImageSelected} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - will be set by ThemedView based on theme
  },
});
