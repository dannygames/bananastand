import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface VideoPreviewCardProps {
  title: string;
  thumbnailUri: string;
  videoUri?: string; // Optional video URL for autoplay
  participants?: string[];
  onPress?: () => void;
  width?: number;
  height?: number;
  autoplay?: boolean; // Whether to autoplay the video
}

const { width: screenWidth } = Dimensions.get('window');
const defaultCardWidth = (screenWidth - 48) / 2; // 2 cards per row with padding

export function VideoPreviewCard({ 
  title, 
  thumbnailUri, 
  videoUri,
  participants = [], 
  onPress,
  width = defaultCardWidth,
  height = 180,
  autoplay = true
}: VideoPreviewCardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const [showVideo, setShowVideo] = useState(autoplay && !!videoUri);

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor, width, height }]} 
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
              console.log('Video error:', error);
              setShowVideo(false); // Fallback to thumbnail on error
            }}
          />
        ) : (
          <>
            <Image 
              source={{ uri: thumbnailUri }} 
              style={styles.image}
              contentFit="cover"
            />
            <View style={styles.overlay} />
            
            {/* Play button overlay - only show if not autoplaying video */}
            {!showVideo && (
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color="#ffffff" />
              </View>
            )}
          </>
        )}
        
        {/* Title overlay */}
        <View style={styles.titleOverlay}>
          <Image 
            source={require('@/assets/images/black-gradient.png')}
            style={styles.gradientBackground}
            contentFit="fill"
          />
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
        </View>

        {/* Participants indicators */}
        {participants.length > 0 && (
          <View style={styles.participantsContainer}>
            {participants.slice(0, 2).map((participant, index) => (
              <View key={index} style={styles.participantAvatar}>
                <Image 
                  source={{ uri: participant }} 
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              </View>
            ))}
            {participants.length > 2 && (
              <View style={styles.moreParticipants}>
                <Ionicons name="add" size={16} color="#ffffff" />
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  moreParticipants: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: '#ffffff',
  },
});
