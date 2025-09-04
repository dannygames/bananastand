import { useThemeColor } from '@/hooks/useThemeColor';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function Credits() {
  const [isVisible, setIsVisible] = useState(false);
  const [creditsCount, setCreditsCount] = useState(150); // Starting credits count
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  
  // For button styling in dark/light mode
  const buttonBackgroundColor = useThemeColor({ light: '#0a7ea4', dark: '#333333' }, 'tint');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'background');
  const iconColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'background');

  const openCredits = () => setIsVisible(true);
  const closeCredits = () => setIsVisible(false);

  return (
    <>
      {/* Credits Button - Fixed in top right */}
      <View style={[styles.creditsButton, { top: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={openCredits}
          style={[styles.buttonContainer, { backgroundColor: buttonBackgroundColor }]}
          activeOpacity={0.7}
        >
          <View style={styles.buttonContent}>
            <IconSymbol size={16} name="creditcard.fill" color={iconColor} />
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>{creditsCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Credits Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCredits}
      >
        <Pressable style={styles.modalOverlay} onPress={closeCredits}>
          <BlurView intensity={20} style={styles.blurContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <ThemedView style={[styles.modalContent, { backgroundColor }]}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Credits</ThemedText>
                  <TouchableOpacity
                    onPress={closeCredits}
                    style={[styles.closeButton, { backgroundColor: buttonBackgroundColor }]}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.scrollContent}>
                  <View style={styles.section}>
                    <View style={styles.creditsInfo}>
                      <IconSymbol size={48} name="creditcard.fill" color={tintColor} />
                      <ThemedText style={styles.creditsNumber}>{creditsCount} Credits</ThemedText>
                    </View>
                    <ThemedText style={styles.creditsDescription}>
                      Use credits to generate videos and apply effects
                    </ThemedText>
                  </View>

                  <View style={styles.section}>
                    <TouchableOpacity
                      style={[styles.buyButton, { backgroundColor: tintColor }]}
                      onPress={() => {
                        // Handle buy more credits action
                        console.log('Buy more credits pressed');
                      }}
                      activeOpacity={0.8}
                    >
                      <IconSymbol size={20} name="cart.fill" color={backgroundColor} />
                      <ThemedText style={[styles.buyButtonText, { color: backgroundColor }]}>
                        Buy More Credits
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </ThemedView>
            </Pressable>
          </BlurView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  creditsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  buttonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: Math.min(screenWidth * 0.9, 400),
    maxHeight: screenHeight * 0.8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
    alignItems: 'center',
  },
  creditsInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
    paddingVertical: 16,
  },
  creditsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  creditsDescription: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
