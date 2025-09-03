import { useThemeColor } from '@/hooks/useThemeColor';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface ShowcaseCardProps {
  title: string;
  subtitle?: string;
  imageUri: string;
  videoUri?: string; // Optional video URL for autoplay
  onPress?: () => void;
  style?: any;
  autoplay?: boolean; // Whether to autoplay the video
}

const { width } = Dimensions.get('window');
const cardWidth = width;

export function ShowcaseCard({ title, subtitle, imageUri, videoUri, onPress, style, autoplay = true }: ShowcaseCardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const [showVideo, setShowVideo] = useState(autoplay && !!videoUri);

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor }, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {showVideo && videoUri ? (
          <Video
            source={{ uri: videoUri }}
            style={styles.image}
            resizeMode={ResizeMode.COVER}
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
            onError={(error) => {
              console.log('Showcase video error:', error);
              setShowVideo(false); // Fallback to image on error
            }}
          />
        ) : (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.image}
            contentFit="cover"
          />
        )}
        <View style={styles.overlay} />
        <View style={styles.content}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
          )}
          <TouchableOpacity 
            style={[styles.tryButton, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
            onPress={onPress}
          >
            <ThemedText style={[styles.tryButtonText, { color: '#000' }]}>
              Try It Now
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    height: 320,
    borderRadius: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 32,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 18,
    opacity: 0.9,
    lineHeight: 20,
  },
  tryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 120,
  },
  tryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
