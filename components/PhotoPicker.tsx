import { useThemeColor } from '@/hooks/useThemeColor';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// API Configuration
const API_BASE_URL = 'https://www.someonereal.com/api';
// For development, you can change this to:
// const API_BASE_URL = 'http://localhost:3000/api';

interface ImageVersion {
  uri: string;
  prompt?: string;
  timestamp: Date;
  isOriginal?: boolean;
  isVideo?: boolean;
  videoType?: string;
}

interface PhotoPickerProps {
  onImageSelected?: (uri: string) => void;
}

export function PhotoPicker({ onImageSelected }: PhotoPickerProps) {
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
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
      const apiResponse = await fetch(`${API_BASE_URL}/edit-image-gemini`, {
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
    if (isGeneratingVideo || !currentImage) return;

    Alert.alert(
      'Create Video',
      'Choose the type of video you want to create:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Normal',
          onPress: () => generateVideo('normal', 'Create a smooth, natural video animation from this image'),
        },
        {
          text: 'Funny',
          onPress: () => generateVideo('funny', 'Create a fun, comedic video animation with exaggerated movements and humor'),
        },
        {
          text: 'Custom',
          onPress: () => showCustomVideoPrompt(),
        },
      ]
    );
  };

  const showCustomVideoPrompt = () => {
    Alert.prompt(
      'Custom Video',
      'Describe the type of video animation you want:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate Video',
          onPress: (customPrompt) => {
            if (customPrompt && customPrompt.trim()) {
              generateVideo('custom', customPrompt.trim());
            } else {
              Alert.alert('No Description', 'Please provide a description for the video.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const generateVideo = async (videoType: string, prompt: string) => {
    if (!currentImage) return;

    setIsGeneratingVideo(true);

    try {
      console.log('🎬 Starting video generation...');
      console.log('📝 Video Type:', videoType);
      console.log('📝 Prompt:', prompt);
      console.log('🖼️ Image URI:', currentImage.uri.substring(0, 100) + '...');

      // Convert image to data URL if it's a local file URI
      let imageUrl = currentImage.uri;
      
      if (!currentImage.uri.startsWith('data:') && !currentImage.uri.startsWith('http')) {
        console.log('🔄 Converting local file URI to data URL...');
        
        try {
          const response = await fetch(currentImage.uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
          console.log('📦 Image blob size:', blob.size, 'bytes, type:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('Image file is empty or could not be loaded');
          }
          
          // Convert blob to data URL using FileReader (React Native compatible)
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Extract base64 part from data URL
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
          });
          
          const mimeType = blob.type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
          
          console.log('✅ Converted to data URL, length:', imageUrl.length);
        } catch (conversionError) {
          console.error('❌ Failed to convert image:', conversionError);
          throw new Error('Failed to prepare image for video generation');
        }
      }

      // Call the video generation API
      const response = await fetch(`${API_BASE_URL}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          prompt: prompt,
          videoType: videoType,
          originalPrompt: currentImage.prompt || 'Original image'
        }),
      });

      console.log('📡 Video API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Video API Error:', errorText);
        throw new Error(`Video API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 Video API Result received');

      if (result.success && result.videoUrl) {
        console.log('✅ Video generation completed successfully');
        console.log('🎥 Video URL length:', result.videoUrl.length);
        
        // Add the video to the carousel
        const newVideoVersion: ImageVersion = {
          uri: result.videoUrl,
          prompt: `${videoType}: ${prompt}`,
          timestamp: new Date(),
          isOriginal: false,
          isVideo: true,
          videoType: videoType
        };
        
        setImageVersions(prev => {
          const newVersions = [...prev, newVideoVersion];
          setCurrentImageIndex(newVersions.length - 1); // Move to the new video
          return newVersions;
        });
        onImageSelected?.(result.videoUrl);
        
        console.log('✅ Video added to carousel');
      } else {
        throw new Error(result.error || result.details || 'Failed to generate video');
      }

    } catch (error) {
      console.error('❌ Video generation failed:', error);
      
      Alert.alert(
        'Video Generation Failed',
        `Sorry, we couldn't create your video. ${error instanceof Error ? error.message : 'Please try again.'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsGeneratingVideo(false);
    }
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
                {version.isVideo ? (
                  <Video
                    source={{ uri: version.uri }}
                    style={styles.selectedImage}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={index === currentImageIndex}
                    isLooping
                  />
                ) : (
                  <Image source={{ uri: version.uri }} style={styles.selectedImage} />
                )}
                <View style={styles.imageInfo}>
                  <ThemedText style={styles.imageInfoText}>
                    {version.isOriginal 
                      ? '📷 Original' 
                      : version.isVideo 
                        ? `🎬 ${version.prompt}` 
                        : `✏️ ${version.prompt}`
                    }
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
              style={[
                styles.primaryButton, 
                styles.videoButton, 
                { backgroundColor: isGeneratingVideo ? '#999' : '#007AFF' }
              ]}
              onPress={handleMakeVideo}
              disabled={isGeneratingVideo || isEditing}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isGeneratingVideo ? '🎬 Creating Video...' : '🎬 Make Video'}
              </ThemedText>
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
