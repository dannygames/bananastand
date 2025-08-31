import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ImageVersion {
  uri: string;
  prompt?: string;
  timestamp: Date;
  isOriginal?: boolean;
}

interface PhotoPickerProps {
  onImageSelected?: (uri: string) => void;
}

export function PhotoPicker({ onImageSelected }: PhotoPickerProps) {
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const scrollViewRef = useRef<ScrollView>(null);

  const currentImage = imageVersions.length > 0 ? imageVersions[currentImageIndex] : null;

  // Effect to scroll to the current image when index changes
  useEffect(() => {
    if (scrollViewRef.current && imageVersions.length > 0) {
      const screenWidth = Dimensions.get('window').width;
      scrollViewRef.current.scrollTo({
        x: currentImageIndex * screenWidth,
        animated: true,
      });
    }
  }, [currentImageIndex]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Sorry, we need camera and photo library permissions to make this work!'
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to select a photo',
      [
        {
          text: 'Camera',
          onPress: takePhoto,
        },
        {
          text: 'Photo Library',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const newVersion: ImageVersion = {
          uri: imageUri,
          timestamp: new Date(),
          isOriginal: true
        };
        setImageVersions([newVersion]);
        setCurrentImageIndex(0);
        onImageSelected?.(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const newVersion: ImageVersion = {
          uri: imageUri,
          timestamp: new Date(),
          isOriginal: true
        };
        setImageVersions([newVersion]);
        setCurrentImageIndex(0);
        onImageSelected?.(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleEditPhoto = () => {
    if (isEditing) return; // Prevent multiple simultaneous edits

    Alert.prompt(
      'Edit Photo',
      'Describe the edit you want to make to this photo:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Apply Edit',
          onPress: async (editDescription) => {
            if (editDescription && editDescription.trim() && currentImage) {
              await processImageEdit(editDescription.trim());
            } else {
              Alert.alert('No Description', 'Please provide a description for the edit.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const processImageEdit = async (prompt: string) => {
    if (!currentImage) return;

    setIsEditing(true);
    
    try {
      console.log('🎨 Starting image edit with prompt:', prompt);
      console.log('📂 Image URI:', currentImage.uri.substring(0, 100) + '...');
      
      let imageBlob: Blob;
      
      if (currentImage.uri.startsWith('data:')) {
        // Handle base64 data URI
        console.log('📄 Converting base64 data URI to blob...');
        const response = await fetch(currentImage.uri);
        imageBlob = await response.blob();
      } else {
        // Handle file URI (from camera/gallery)
        console.log('📁 Fetching image from URI...');
        const response = await fetch(currentImage.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        imageBlob = await response.blob();
      }
      
      console.log('📦 Image blob size:', imageBlob.size, 'bytes, type:', imageBlob.type);
      
      if (imageBlob.size === 0) {
        throw new Error('Image file is empty or could not be loaded');
      }
      
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      // For React Native, we need to create a proper file-like object
      const imageFile = {
        uri: currentImage.uri,
        type: imageBlob.type || 'image/jpeg',
        name: 'image.jpg',
      };
      
      formData.append('image', imageFile as any);

      console.log('📡 Sending request to API...');

      // Call your API with explicit headers
      const apiResponse = await fetch('http://localhost:3000/api/edit-image-gemini', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with boundary
      });

      console.log('📡 API Response status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error (${apiResponse.status}): ${errorText}`);
      }

      const result = await apiResponse.json();

      if (result.success && result.editedImageData) {
        // Convert base64 to data URI
        const editedImageUri = `data:image/jpeg;base64,${result.editedImageData}`;
        
        // Add the new edited version to the carousel
        const newVersion: ImageVersion = {
          uri: editedImageUri,
          prompt: prompt,
          timestamp: new Date(),
          isOriginal: false
        };
        
        setImageVersions(prev => {
          const newVersions = [...prev, newVersion];
          setCurrentImageIndex(newVersions.length - 1); // Move to the new image (last index)
          return newVersions;
        });
        onImageSelected?.(editedImageUri);
        
        console.log('✅ Image edit completed successfully');
      } else {
        throw new Error(result.error || result.details || 'Failed to edit image');
      }
      
    } catch (error) {
      console.error('❌ Image edit failed:', error);
      
      Alert.alert(
        'Edit Failed',
        `Sorry, we couldn't edit your image. ${error instanceof Error ? error.message : 'Please try again.'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleMakeVideo = () => {
    Alert.alert('Make Video', 'Video creation functionality coming soon!');
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { borderColor: tintColor }]}
        onPress={showImagePickerOptions}
      >
        <ThemedText style={[styles.buttonText, { color: tintColor }]}>
          {imageVersions.length > 0 ? 'Change Photo' : 'Select Photo'}
        </ThemedText>
      </TouchableOpacity>

      {imageVersions.length > 0 && (
        <View style={styles.imageContainer}>
          {/* Image Carousel */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carouselContainer}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              if (newIndex !== currentImageIndex) {
                setCurrentImageIndex(newIndex);
              }
            }}
          >
            {imageVersions.map((version, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image source={{ uri: version.uri }} style={styles.selectedImage} />
                <View style={styles.imageInfo}>
                  <ThemedText style={styles.imageInfoText}>
                    {version.isOriginal ? '📷 Original' : `✏️ ${version.prompt}`}
                  </ThemedText>
                  <ThemedText style={styles.imageTimestamp}>
                    {version.timestamp.toLocaleTimeString()}
                  </ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Carousel Indicators */}
          {imageVersions.length > 1 && (
            <View style={styles.indicatorContainer}>
              {imageVersions.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: index === currentImageIndex ? tintColor : '#ccc',
                    },
                  ]}
                />
              ))}
              <ThemedText style={styles.indicatorText}>
                {currentImageIndex + 1} of {imageVersions.length}
              </ThemedText>
            </View>
          )}
          
          {/* Primary Action Buttons */}
          <View style={styles.primaryButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton, 
                styles.editButton, 
                { backgroundColor: isEditing ? '#999' : tintColor }
              ]}
              onPress={handleEditPhoto}
              disabled={isEditing}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isEditing ? '🔄 Editing...' : '✏️ Edit Photo'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.videoButton, { backgroundColor: '#007AFF' }]}
              onPress={handleMakeVideo}
            >
              <ThemedText style={styles.primaryButtonText}>🎬 Make Video</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Secondary Action */}
          <View style={styles.secondaryButtonContainer}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                if (imageVersions.length === 1) {
                  // Remove all images
                  setImageVersions([]);
                  setCurrentImageIndex(0);
                  onImageSelected?.('');
                } else {
                  // Remove current image version
                  const newVersions = imageVersions.filter((_, index) => index !== currentImageIndex);
                  setImageVersions(newVersions);
                  const newIndex = Math.min(currentImageIndex, newVersions.length - 1);
                  setCurrentImageIndex(newIndex);
                  if (newVersions.length > 0) {
                    onImageSelected?.(newVersions[newIndex].uri);
                  }
                }
              }}
            >
              <ThemedText style={styles.removeButtonText}>
                🗑️ {imageVersions.length === 1 ? 'Remove Photo' : 'Remove Version'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    marginLeft: -32,
    marginRight: -32,
  },
  carouselContainer: {
    width: Dimensions.get('window').width,
    height: 360,
  },
  imageSlide: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
  },
  selectedImage: {
    width: Dimensions.get('window').width,
    height: 300,
    marginBottom: 8,
  },
  imageInfo: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageInfoText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  imageTimestamp: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  indicatorText: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
  primaryButtonsContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 32,
    marginBottom: 20,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  editButton: {
    // Additional styling for edit button if needed
  },
  videoButton: {
    // Additional styling for video button if needed
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  secondaryButtonContainer: {
    paddingHorizontal: 32,
    marginTop: 8,
  },
  removeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  removeButtonText: {
    color: '#ff4444',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
