import { useThemeColor } from '@/hooks/useThemeColor';
import { Feather, Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';

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
  const [isSaving, setIsSaving] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

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
    try {
      console.log('📋 Requesting permissions...');
      
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📷 Camera permission status:', cameraStatus);
      
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📁 Media library permission status:', mediaLibraryStatus);
      
      if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Sorry, we need camera and photo library permissions to make this work!'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request permissions. Please check your device settings.'
      );
      return false;
    }
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
          text: 'Apply',
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

  const handleSaveMedia = async () => {
    if (!currentImage || isSaving) return;

    setIsSaving(true);

    try {
      console.log('💾 Starting media save...');
      console.log('📁 Media type:', currentImage.isVideo ? 'video' : 'image');
      console.log('📂 Media URI:', currentImage.uri.substring(0, 100) + '...');

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to save media.'
        );
        return;
      }

      let localUri: string;

      // Handle different URI types
      if (currentImage.uri.startsWith('data:')) {
        // Data URL - need to save to temp file first
        console.log('💾 Converting data URL to file...');
        
        const fileExtension = currentImage.isVideo ? 'mp4' : 'jpg';
        const fileName = `${currentImage.isVideo ? 'video' : 'image'}_${Date.now()}.${fileExtension}`;
        const tempUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Extract base64 data and write to file
        const base64Data = currentImage.uri.split(',')[1];
        await FileSystem.writeAsStringAsync(tempUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        localUri = tempUri;
        console.log('✅ Temp file created:', tempUri);
      } else if (currentImage.uri.startsWith('http')) {
        // HTTP URL - download first
        console.log('📥 Downloading from URL...');
        
        const fileExtension = currentImage.isVideo ? 'mp4' : 'jpg';
        const fileName = `${currentImage.isVideo ? 'video' : 'image'}_${Date.now()}.${fileExtension}`;
        const tempUri = `${FileSystem.documentDirectory}${fileName}`;
        
        const downloadResult = await FileSystem.downloadAsync(currentImage.uri, tempUri);
        localUri = downloadResult.uri;
        console.log('✅ Downloaded to:', localUri);
      } else {
        // Local file URI - use directly
        localUri = currentImage.uri;
        console.log('✅ Using local file directly');
      }

      // Save to media library
      console.log('💾 Saving to media library...');
      const asset = await MediaLibrary.createAssetAsync(localUri);
      
      // Add to album if desired (optional)
      const albumName = 'AI Creations';
      try {
        let album = await MediaLibrary.getAlbumAsync(albumName);
        if (!album) {
          album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
        console.log(`✅ Saved to ${albumName} album`);
      } catch (albumError) {
        console.log('📁 Saved to camera roll (album creation failed)');
      }

      // Clean up temp file if we created one
      if (currentImage.uri.startsWith('data:') || currentImage.uri.startsWith('http')) {
        try {
          await FileSystem.deleteAsync(localUri);
          console.log('🗑️ Cleaned up temp file');
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up temp file');
        }
      }

      Alert.alert(
        'Saved! 💾',
        `Your ${currentImage.isVideo ? 'video' : 'image'} has been saved to your photo library.`,
        [{ text: 'Great!', style: 'default' }]
      );

      console.log('✅ Media save completed successfully');

    } catch (error) {
      console.error('❌ Media save failed:', error);
      
      Alert.alert(
        'Save Failed',
        `Sorry, we couldn't save your ${currentImage.isVideo ? 'video' : 'image'}. ${error instanceof Error ? error.message : 'Please try again.'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {imageVersions.length === 0 ? (
        // Empty state - Instagram-style onboarding
        <View style={styles.emptyState}>
          <View style={styles.emptyStateContent}>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={50} color="rgba(255, 255, 255, 0.8)" />
            </View>
            <ThemedText style={styles.emptyStateTitle}>Share a moment</ThemedText>
            <ThemedText style={styles.emptyStateSubtitle}>
              Take a photo or choose from your library to get started
            </ThemedText>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={showImagePickerOptions}
            >
              <Text style={styles.primaryActionButtonText}>
                Add Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Instagram-style full screen layout
        <View style={styles.fullScreenContainer}>
          {/* Full Screen Image Carousel */}
          <View style={styles.mediaContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.fullScreenCarousel}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                if (newIndex !== currentImageIndex) {
                  setCurrentImageIndex(newIndex);
                }
              }}
            >
              {imageVersions.map((version, index) => (
                <View key={index} style={styles.fullScreenSlide}>
                  {version.isVideo ? (
                    <Video
                      source={{ uri: version.uri }}
                      style={styles.fullScreenMedia}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={index === currentImageIndex}
                      isLooping
                    />
                  ) : (
                    <Image 
                      source={{ uri: version.uri }} 
                      style={styles.fullScreenMedia}
                      contentFit="contain"
                    />
                  )}
                </View>
              ))}
            </ScrollView>
            
            {/* Floating X button - top right */}
            <TouchableOpacity
              style={[
                styles.floatingCloseButton,
                { opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1 }
              ]}
              onPress={() => {
                if (imageVersions.length === 1) {
                  // Remove all images if only one left
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
              disabled={isEditing || isGeneratingVideo || isSaving}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Loading Overlay */}
            {(isEditing || isGeneratingVideo || isSaving) && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>
                    {isEditing ? 'Editing image...' : isGeneratingVideo ? 'Generating video...' : 'Saving media...'}
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    {isEditing 
                      ? 'AI is enhancing your photo' 
                      : isGeneratingVideo 
                        ? 'Creating your video animation'
                        : 'Saving to your photo library'
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Instagram-style bottom action bar */}
          <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom + 20, 80) }]}>
            {/* Story dots indicator */}
            {imageVersions.length > 1 && (
                <View style={styles.mediaDotsContainer}>
                  {imageVersions.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.mediaDot,
                        {
                          backgroundColor: index === currentImageIndex 
                            ? 'rgba(255, 255, 255, 1)' 
                            : 'rgba(255, 255, 255, 0.3)',
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            
            {/* Media info */}
            <View style={styles.mediaInfo}>
              <ThemedText style={styles.mediaInfoText} numberOfLines={2}>
                {currentImage?.isOriginal 
                  ? 'Original' 
                  : currentImage?.isVideo 
                    ? currentImage.prompt 
                    : currentImage?.prompt
                }
              </ThemedText>
              {/* <ThemedText style={styles.mediaTimestamp}>
                {currentImage?.timestamp.toLocaleString()}
              </ThemedText> */}
            </View>

            {/* Media controls (moved from top) */}
            {/* <View style={styles.mediaControlsRow}>
              <TouchableOpacity
                style={styles.mediaControlButton}
                onPress={showImagePickerOptions}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaControlButton}
                onPress={() => {
                  if (imageVersions.length === 1) {
                    setImageVersions([]);
                    setCurrentImageIndex(0);
                    onImageSelected?.('');
                  } else {
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
                <Ionicons name="trash-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View> */}

            {/* Action buttons row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1 }
                ]}
                onPress={handleEditPhoto}
                disabled={isEditing || isGeneratingVideo || isSaving}
              >
                <View style={styles.actionButtonContainer}>
                  <View style={styles.iconContainer}>
                    {isEditing ? (
                      <Ionicons name="hourglass-outline" size={26} color="#ffffff" />
                    ) : (
                      <Feather name="edit-3" size={26} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.actionButtonLabel}>
                    {isEditing ? 'Editing' : 'Edit'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1 }
                ]}
                onPress={handleMakeVideo}
                disabled={isEditing || isGeneratingVideo || isSaving}
              >
                <View style={styles.actionButtonContainer}>
                  <View style={styles.iconContainer}>
                    {isGeneratingVideo ? (
                      <Ionicons name="hourglass-outline" size={26} color="#ffffff" />
                    ) : (
                      <Ionicons name="videocam" size={26} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.actionButtonLabel}>
                    {isGeneratingVideo ? 'Creating' : 'Video'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1 }
                ]}
                onPress={handleSaveMedia}
                disabled={isEditing || isGeneratingVideo || isSaving}
              >
                <View style={styles.actionButtonContainer}>
                  <View style={styles.iconContainer}>
                    {isSaving ? (
                      <Ionicons name="hourglass-outline" size={26} color="#ffffff" />
                    ) : (
                      <Ionicons name="download-outline" size={26} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.actionButtonLabel}>
                    {isSaving ? 'Saving' : 'Save'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1 }
                ]}
                onPress={showImagePickerOptions}
                disabled={isEditing || isGeneratingVideo || isSaving}
              >
                <View style={styles.actionButtonContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="camera" size={26} color="#ffffff" />
                  </View>
                  <Text style={styles.actionButtonLabel}>New</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingTop: 60, // Add top padding to prevent text cutoff
    paddingBottom: 40,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  cameraIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },

  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34, // Add proper line height
    marginTop: 8, // Add small top margin for breathing room
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryActionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 160,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryActionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Full screen layout styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    marginBottom: 280, // Increased to account for larger bottom action bar with controls
    zIndex: 1, // Keep media below overlays
  },
  fullScreenCarousel: {
    flex: 1,
  },
  fullScreenSlide: {
    width: Dimensions.get('window').width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMedia: {
    width: Dimensions.get('window').width,
    flex: 1,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 60, // Account for status bar
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, // Above everything else
    elevation: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    minWidth: 200,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  // Bottom action bar styles
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingBottom: 80, // Significantly increased for safe area
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 280, // Increased to accommodate media controls
    justifyContent: 'flex-start',
    zIndex: 20, // Ensure it's above other content
    elevation: 20, // For Android
  },
  mediaInfo: {
    marginBottom: 16,
    marginTop: 20, // Add space between story dots and media info
  },
  mediaInfoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  mediaControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  mediaControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mediaDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12, // Add bottom margin for separation
  },
  mediaDot: {
    height: 4,
    width: 20,
    borderRadius: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    zIndex: 25,
    elevation: 25,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    zIndex: 25,
    elevation: 25,
  },
  actionButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  actionButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
