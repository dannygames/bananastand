import { ShowcaseCard } from '@/components/ShowcaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VideoSection } from '@/components/VideoSection';
import { Config } from '@/constants/Config';
import { useThemeColor } from '@/hooks/useThemeColor';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// Sample data for showcase features
const showcaseFeatures = [
  {
    id: 'pixel-art',
    title: 'Pixel Art',
    subtitle: 'Transform to Pixel Art Style',
    imageUri: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'portrait-mode',
    title: 'Portrait Mode',
    subtitle: 'Professional depth effects',
    imageUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'vintage-filter',
    title: 'Vintage Style',
    subtitle: 'Retro photo transformations',
    imageUri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
];

// Sample data for video previews
const duoVideos = [
  {
    id: 'romantic-lift',
    title: 'Romantic Lift',
    thumbnailUri: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1494790108755-2616b612b2bc?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop'
    // ],
  },
  {
    id: 'future-baby',
    title: 'Future Baby Girl',
    thumbnailUri: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop'
    // ],
  },
  {
    id: 'dream-dance',
    title: 'Dream Dance',
    thumbnailUri: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?w=50&h=50&fit=crop'
    // ],
  },
];

const coupleVideos = [
  {
    id: 'sunset-walk',
    title: 'Sunset Walk',
    thumbnailUri: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1494790108755-2616b612b2bc?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop'
    // ],
  },
  {
    id: 'coffee-date',
    title: 'Coffee Date',
    thumbnailUri: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop'
    // ],
  },
  {
    id: 'adventure-hike',
    title: 'Adventure Hike',
    thumbnailUri: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    // participants: [
    //   'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=50&h=50&fit=crop',
    //   'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?w=50&h=50&fit=crop'
    // ],
  },
];

const digitalForensicsVideos = [
  {
    id: 'deepfake-detection',
    title: 'Deepfake Detection',
    thumbnailUri: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  },
  {
    id: 'image-authenticity',
    title: 'Image Authenticity',
    thumbnailUri: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 'face-verification',
    title: 'Face Verification',
    thumbnailUri: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=300&fit=crop',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  },
];

export default function HomeScreen() {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const showcaseScrollRef = useRef<ScrollView>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const insets = useSafeAreaInsets();

  // Redirect to create tab if home tab is disabled
  useEffect(() => {
    if (!Config.features.homeTabEnabled) {
      router.replace('/(tabs)/create');
    }
  }, []);

  const handleFeatureTryPress = (featureId: string) => {
    // Find the feature data
    const featureData = showcaseFeatures.find(feature => feature.id === featureId);
    
    if (featureData) {
      // Navigate to create tab with feature data
      router.push({
        pathname: '/(tabs)/create',
        params: {
          featureId: featureData.id,
          featureTitle: featureData.title,
          featureSubtitle: featureData.subtitle,
          featureThumbnail: featureData.imageUri,
          featureVideoUri: featureData.videoUri || '',
          isFeature: 'true'
        }
      });
    } else {
      // Fallback to just navigate to create tab
      router.push('/(tabs)/create');
    }
  };

  const handleVideoPress = (videoId: string) => {
    // Find the video data from all sections
    const allVideos = [...duoVideos, ...coupleVideos, ...digitalForensicsVideos];
    const videoData = allVideos.find(video => video.id === videoId);
    
    if (videoData) {
      // Navigate to create tab with video data
      router.push({
        pathname: '/(tabs)/create',
        params: {
          videoId: videoData.id,
          videoTitle: videoData.title,
          videoThumbnail: videoData.thumbnailUri,
          videoUri: videoData.videoUri || '',
          participants: JSON.stringify((videoData as any).participants || [])
        }
      });
    } else {
      // Fallback to just navigate to create tab
      router.push('/(tabs)/create');
    }
  };

  const handleSeeAllPress = (section: string) => {
    Alert.alert(
      'See All',
      `This would show all ${section} videos.`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleGetStartedPress = () => {
    router.push('/(tabs)/create');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 100, 120) }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Feature Showcase Carousel - Full Screen */}
        <View style={styles.showcaseSection}>
            <ScrollView
              ref={showcaseScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                if (newIndex !== currentFeatureIndex && newIndex >= 0 && newIndex < showcaseFeatures.length) {
                  setCurrentFeatureIndex(newIndex);
                }
              }}
              scrollEventThrottle={16}
              contentContainerStyle={styles.showcaseContent}
            >
              {showcaseFeatures.map((feature, index) => (
                <View key={feature.id} style={styles.showcaseSlide}>
                  <ShowcaseCard
                    title={feature.title}
                    subtitle={feature.subtitle}
                    imageUri={feature.imageUri}
                    videoUri={feature.videoUri}
                    onPress={() => handleFeatureTryPress(feature.id)}
                    autoplay={true}
                  />
                </View>
              ))}
            </ScrollView>
            
            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {showcaseFeatures.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentFeatureIndex 
                        ? tintColor 
                        : backgroundColor === '#000000' 
                          ? 'rgba(255, 255, 255, 0.4)'  // Light dots for dark mode
                          : 'rgba(0, 0, 0, 0.3)',       // Dark dots for light mode
                    },
                  ]}
                  onPress={() => {
                    setCurrentFeatureIndex(index);
                    showcaseScrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
                  }}
                />
              ))}
            </View>
        </View>

        {/* Content with Safe Area */}
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right']}>
          {/* Video Sections */}
          <VideoSection
            title="Duo Videos"
            videos={duoVideos}
            onVideoPress={handleVideoPress}
            onSeeAllPress={() => handleSeeAllPress('duo')}
          />

          <VideoSection
            title="Couple Videos"
            videos={coupleVideos}
            onVideoPress={handleVideoPress}
            onSeeAllPress={() => handleSeeAllPress('couple')}
          />

          <VideoSection
            title="Digital Forensics"
            videos={digitalForensicsVideos}
            onVideoPress={handleVideoPress}
            onSeeAllPress={() => handleSeeAllPress('digital forensics')}
          />

          {/* Get Started Section */}
          <View style={styles.getStartedSection}>
            <ThemedText style={styles.getStartedTitle}>
              Ready to create something amazing?
            </ThemedText>
            <ThemedText style={styles.getStartedSubtitle}>
              Upload your photo and start transforming it with AI
            </ThemedText>
            <TouchableOpacity
              style={[styles.getStartedButton, { backgroundColor: tintColor }]}
              onPress={handleGetStartedPress}
            >
              <ThemedText style={[styles.getStartedButtonText, { color: backgroundColor }]}>
                Get Started
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentSafeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proText: {
    fontSize: 14,
    fontWeight: '700',
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  referralText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showcaseSection: {
    marginBottom: 40,
  },
  showcaseContent: {
    alignItems: 'center',
  },
  showcaseSlide: {
    width: screenWidth,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  getStartedSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  getStartedTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  getStartedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 22,
  },
  getStartedButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 160,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
