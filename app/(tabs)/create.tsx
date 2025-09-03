import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PhotoPicker } from '@/components/PhotoPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';

export default function CreateScreen() {
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const params = useLocalSearchParams();
  
  // Extract video data from navigation parameters
  const videoData = {
    id: params.videoId as string,
    title: params.videoTitle as string,
    thumbnail: params.videoThumbnail as string,
    videoUri: params.videoUri as string,
    participants: (() => {
      try {
        return params.participants ? JSON.parse(params.participants as string) : [];
      } catch (error) {
        console.warn('Failed to parse participants data:', error);
        return [];
      }
    })()
  };

  // Extract feature data from navigation parameters
  const featureData = {
    id: params.featureId as string,
    title: params.featureTitle as string,
    subtitle: params.featureSubtitle as string,
    thumbnail: params.featureThumbnail as string,
    videoUri: params.featureVideoUri as string,
  };

  const isFeature = params.isFeature === 'true';
  const hasVideoData = Boolean(videoData.id);
  const hasFeatureData = Boolean(featureData.id);
  const hasInspiration = hasVideoData || hasFeatureData;

  // Use feature data if it's a feature, otherwise use video data
  const inspirationData = isFeature ? {
    title: featureData.title,
    subtitle: featureData.subtitle,
    thumbnail: featureData.thumbnail,
    description: `Try the ${featureData.title?.toLowerCase() || 'this'} style on your photos`
  } : {
    title: videoData.title,
    subtitle: '',
    thumbnail: videoData.thumbnail,
    description: `Create your own version of this ${videoData.title?.toLowerCase() || 'amazing'} style`
  };

  // Debug logging
  if (hasInspiration) {
    console.log('Inspiration data received:', inspirationData);
    console.log('Thumbnail URI:', inspirationData.thumbnail);
    console.log('Is feature:', isFeature);
  }

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
      {hasInspiration && !selectedImageUri && (
        <View style={styles.videoInfoContainer}>
          <Image 
            source={{ uri: inspirationData.thumbnail }}
            style={styles.inspirationThumbnail}
            contentFit="cover"
          />
          <View style={styles.overlayContent}>
            <Image 
              source={require('@/assets/images/black-gradient.png')}
              style={styles.gradientBackground}
              contentFit="fill"
            />
            <ThemedText style={styles.videoInfoTitle}>
              {isFeature ? inspirationData.title : `Inspired by: ${inspirationData.title}`}
            </ThemedText>
            {inspirationData.subtitle && (
              <ThemedText style={styles.videoInfoSubtitle}>
                {inspirationData.subtitle}
              </ThemedText>
            )}
            <ThemedText style={styles.videoInfoDescription}>
              {inspirationData.description}
            </ThemedText>
          </View>
        </View>
      )}
      <PhotoPicker onImageSelected={handleImageSelected} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - will be set by ThemedView based on theme
  },
  videoInfoContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  inspirationThumbnail: {
    width: '100%',
    height: 200,
    zIndex: 1,
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    zIndex: 2,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  videoInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#ffffff',
  },
  videoInfoSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
    color: '#ffffff',
    opacity: 0.8,
  },
  videoInfoDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 20,
  },
});
