import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { VideoPreviewCard } from './VideoPreviewCard';

interface VideoSectionProps {
  title: string;
  videos: Array<{
    id: string;
    title: string;
    thumbnailUri: string;
    videoUri?: string;
    participants?: string[];
  }>;
  onVideoPress?: (videoId: string) => void;
  onSeeAllPress?: () => void;
}

export function VideoSection({ title, videos, onVideoPress, onSeeAllPress }: VideoSectionProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <TouchableOpacity 
          style={styles.seeAllButton}
          onPress={onSeeAllPress}
        >
          <ThemedText style={[styles.seeAllText, { color: tintColor }]}>
            See all
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={tintColor} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {videos.map((video, index) => (
          <VideoPreviewCard
            key={video.id}
            title={video.title}
            thumbnailUri={video.thumbnailUri}
            videoUri={video.videoUri}
            participants={video.participants}
            onPress={() => onVideoPress?.(video.id)}
            width={160}
            height={180}
            autoplay={true}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollView: {
    paddingLeft: 20,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 12,
  },
});
