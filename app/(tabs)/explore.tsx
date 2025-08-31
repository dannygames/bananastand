import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HelpScreen() {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={false}
        >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Help & Tutorial</ThemedText>
          <ThemedText style={styles.subtitle}>
            Learn how to use Bananastand's AI-powered photo editing and video generation
          </ThemedText>
        </View>

        {/* Step 1 */}
        <View style={styles.stepContainer}>
          <View style={[styles.stepNumber, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.stepNumberText, { color: backgroundColor }]}>1</ThemedText>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="camera" size={24} color={tintColor} />
              <ThemedText style={styles.stepTitle}>Add Your Photo</ThemedText>
            </View>
            <ThemedText style={styles.stepDescription}>
              Tap "Add Photo" to get started. You can either take a new photo with your camera or choose an existing one from your photo library.
            </ThemedText>
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={16} color="#FFA500" />
              <ThemedText style={styles.tipText}>
                Tip: Photos work best when they have good lighting and clear subjects
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.stepContainer}>
          <View style={[styles.stepNumber, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.stepNumberText, { color: backgroundColor }]}>2</ThemedText>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Feather name="edit-3" size={24} color={tintColor} />
              <ThemedText style={styles.stepTitle}>AI Photo Editing</ThemedText>
            </View>
            <ThemedText style={styles.stepDescription}>
              Tap the "Edit" button and describe what you want to change. Our AI will enhance your photo based on your description.
            </ThemedText>
            <View style={styles.exampleBox}>
              <ThemedText style={styles.exampleTitle}>Example prompts:</ThemedText>
              <ThemedText style={styles.exampleText}>• "Make the sky more dramatic"</ThemedText>
              <ThemedText style={styles.exampleText}>• "Add warm sunset lighting"</ThemedText>
              <ThemedText style={styles.exampleText}>• "Remove the background"</ThemedText>
              <ThemedText style={styles.exampleText}>• "Make it look vintage"</ThemedText>
            </View>
          </View>
        </View>

        {/* Step 3 */}
        <View style={styles.stepContainer}>
          <View style={[styles.stepNumber, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.stepNumberText, { color: backgroundColor }]}>3</ThemedText>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="videocam" size={24} color={tintColor} />
              <ThemedText style={styles.stepTitle}>Create Videos</ThemedText>
            </View>
            <ThemedText style={styles.stepDescription}>
              Transform your photos into engaging video animations. Choose from preset styles or describe your own custom animation.
            </ThemedText>
            <View style={styles.videoOptions}>
              <View style={styles.videoOption}>
                <ThemedText style={styles.videoOptionTitle}>Normal</ThemedText>
                <ThemedText style={styles.videoOptionDesc}>Smooth, natural animation</ThemedText>
              </View>
              <View style={styles.videoOption}>
                <ThemedText style={styles.videoOptionTitle}>Funny</ThemedText>
                <ThemedText style={styles.videoOptionDesc}>Comedic, exaggerated movements</ThemedText>
              </View>
              <View style={styles.videoOption}>
                <ThemedText style={styles.videoOptionTitle}>Custom</ThemedText>
                <ThemedText style={styles.videoOptionDesc}>Describe your own animation style</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Step 4 */}
        <View style={styles.stepContainer}>
          <View style={[styles.stepNumber, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.stepNumberText, { color: backgroundColor }]}>4</ThemedText>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="layers-outline" size={24} color={tintColor} />
              <ThemedText style={styles.stepTitle}>Multiple Versions</ThemedText>
            </View>
            <ThemedText style={styles.stepDescription}>
              Create multiple edited versions of your photo. Swipe between them using the dots at the bottom to compare different edits.
            </ThemedText>
            <View style={styles.featureBox}>
              <View style={styles.featureItem}>
                <Ionicons name="swap-horizontal" size={20} color={tintColor} />
                <ThemedText style={styles.featureText}>Swipe to compare versions</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="close" size={20} color="#FF6B6B" />
                <ThemedText style={styles.featureText}>Tap X to remove unwanted versions</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Step 5 */}
        <View style={styles.stepContainer}>
          <View style={[styles.stepNumber, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.stepNumberText, { color: backgroundColor }]}>5</ThemedText>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="download-outline" size={24} color={tintColor} />
              <ThemedText style={styles.stepTitle}>Save & Share</ThemedText>
            </View>
            <ThemedText style={styles.stepDescription}>
              When you're happy with your creation, tap "Save" to download it to your photo library. Share your enhanced photos and videos with friends!
            </ThemedText>
            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={16} color="#4ECDC4" />
              <ThemedText style={styles.tipText}>
                Saved content goes to your "AI Creations" album for easy access
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <ThemedText style={styles.tipsTitle}>Pro Tips</ThemedText>
          
          <View style={styles.tipItem}>
            <Ionicons name="flash" size={20} color="#FFD700" />
            <View style={styles.tipContent}>
              <ThemedText style={styles.tipItemTitle}>Be Specific</ThemedText>
              <ThemedText style={styles.tipItemText}>
                Detailed descriptions produce better AI results. Instead of "make it better," try "add golden hour lighting with warm tones."
              </ThemedText>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="time" size={20} color="#9B59B6" />
            <View style={styles.tipContent}>
              <ThemedText style={styles.tipItemTitle}>Be Patient</ThemedText>
              <ThemedText style={styles.tipItemText}>
                AI processing takes time. High-quality edits and videos can take 30-60 seconds to generate.
              </ThemedText>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="refresh" size={20} color="#E74C3C" />
            <View style={styles.tipContent}>
              <ThemedText style={styles.tipItemTitle}>Experiment</ThemedText>
              <ThemedText style={styles.tipItemText}>
                Try different prompts and styles. Each edit creates a new version, so you can always go back to the original.
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Ready to get started? Head to the Home tab and add your first photo!
          </ThemedText>
        </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set by ThemedView based on theme
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Extra bottom padding for tab bar
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    maxWidth: 300,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  stepNumberText: {
    // color will be set dynamically to contrast with tint color background
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.8,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  tipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  exampleBox: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  videoOptions: {
    gap: 12,
  },
  videoOption: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  videoOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoOptionDesc: {
    fontSize: 14,
    opacity: 0.7,
  },
  featureBox: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
    opacity: 0.8,
  },
  tipsSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  tipsTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipItemText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },
});
