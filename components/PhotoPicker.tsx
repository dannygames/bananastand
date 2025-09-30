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

// Import API service
import { ApiService, buildApiUrl } from '@/services/api';

interface ImageVersion {
  uri: string;
  prompt?: string;
  timestamp: Date;
  isOriginal?: boolean;
  isVideo?: boolean;
  videoType?: string;
  isMultiImageEdit?: boolean;
  sourceImages?: string[]; // Store source image URIs for multi-image edits
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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [selectedSourceImages, setSelectedSourceImages] = useState<string[]>([]);
  const [isMultiImageMode, setIsMultiImageMode] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const currentImage = imageVersions.length > 0 ? imageVersions[currentImageIndex] : null;

  // Effect to scroll to the current image when index changes
  useEffect(() => {
    if (scrollViewRef.current && imageVersions.length > 0 && currentImageIndex >= 0 && !isUserScrolling) {
      const screenWidth = Dimensions.get('window').width;
      const targetX = currentImageIndex * screenWidth;
      
      // Use a shorter delay and more reliable timing
      const scrollTimeout = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: targetX,
          animated: true,
        });
      }, 150);

      return () => clearTimeout(scrollTimeout);
    }
  }, [currentImageIndex, isUserScrolling]);

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
      'Select Photos',
      'Choose how you want to add photos',
      [
        {
          text: 'Single Photo (Camera)',
          onPress: takePhoto,
        },
        {
          text: 'Single Photo (Library)',
          onPress: pickImage,
        },
        {
          text: 'Multiple Photos',
          onPress: pickMultipleImages,
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
        setIsMultiImageMode(false);
        setSelectedSourceImages([]);
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
        setIsMultiImageMode(false);
        setSelectedSourceImages([]);
        onImageSelected?.(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const pickMultipleImages = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5, // Limit to 5 images for performance
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('📸 Selected multiple images:', result.assets.length);
        
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedSourceImages(imageUris);
        setIsMultiImageMode(true);
        
        // Add all images to the carousel as source images
        const newVersions: ImageVersion[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          timestamp: new Date(),
          isOriginal: true,
        }));
        
        setImageVersions(newVersions);
        setCurrentImageIndex(0);
        onImageSelected?.(imageUris[0]);
        
        // Show prompt for multi-image editing
        setTimeout(() => {
          Alert.alert(
            'Multiple Images Selected',
            `You've selected ${imageUris.length} images. You can now edit them individually or combine them using the Edit button.`,
            [{ text: 'Got it!', style: 'default' }]
          );
        }, 500);
      }
    } catch (error) {
      console.error('Error picking multiple images:', error);
      Alert.alert('Error', 'Failed to select multiple images. Please try again.');
    }
  };

  const handleEditPhoto = () => {
    if (isEditing) return; // Prevent multiple simultaneous edits

    if (isMultiImageMode && selectedSourceImages.length > 1) {
      // Multi-image editing
      Alert.alert(
        'Edit Multiple Images',
        `You have ${selectedSourceImages.length} images selected. Choose how to edit:`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Edit Current Image Only',
            onPress: () => showModelSelector(false),
          },
          {
            text: 'Combine All Images',
            onPress: () => showModelSelector(true),
          },
        ]
      );
    } else {
      // Single image editing
      showModelSelector(false);
    }
  };

  const showModelSelector = (combineImages: boolean) => {
    Alert.alert(
      'Choose AI Model',
      'Select which AI model to use for editing:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Qwen',
          onPress: () => showEditPrompt(combineImages, 'qwen'),
        },
        {
          text: 'Nano Banana',
          onPress: () => showEditPrompt(combineImages, 'nano'),
        },
      ]
    );
  };

  const showEditPrompt = (combineImages: boolean, model: 'qwen' | 'nano') => {
    const modelName = model === 'qwen' ? 'Qwen' : 'Nano Banana';
    const promptTitle = combineImages ? `Combine Images (${modelName})` : `Edit Photo (${modelName})`;
    const promptMessage = combineImages 
      ? `Describe how you want to combine all ${selectedSourceImages.length} images:`
      : 'Describe the edit you want to make to this photo:';

    Alert.prompt(
      promptTitle,
      promptMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Apply',
          onPress: async (editDescription) => {
            if (editDescription && editDescription.trim()) {
              if (combineImages) {
                await processMultiImageEdit(editDescription.trim(), model);
              } else {
                await processImageEdit(editDescription.trim(), model);
              }
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

  const uploadImageToR2 = async (imageUri: string): Promise<string> => {
    console.log('📡 Uploading image to R2...');
    
    const publicUrl = await ApiService.uploadImage(imageUri);
    
    console.log('✅ Image uploaded to R2:', publicUrl);
    return publicUrl;
  };

  const processMultiImageEdit = async (prompt: string, model: 'qwen' | 'nano') => {
    if (!selectedSourceImages.length) return;

    setIsEditing(true);
    
    try {
      console.log('🎨 Starting multi-image edit with prompt:', prompt);
      console.log('🤖 Using model:', model);
      console.log('📂 Number of source images:', selectedSourceImages.length);
      
      // Upload all source images to R2 if they're not already there
      const imageUrls: string[] = [];
      
      for (let i = 0; i < selectedSourceImages.length; i++) {
        const imageUri = selectedSourceImages[i];
        console.log(`📡 Processing image ${i + 1}/${selectedSourceImages.length}...`);
        
        if (imageUri.startsWith('http')) {
          imageUrls.push(imageUri);
        } else {
          const uploadedUrl = await uploadImageToR2(imageUri);
          imageUrls.push(uploadedUrl);
        }
      }
      
      // Call the appropriate API endpoint based on model
      const endpoint = model === 'qwen' ? '/edit-image-qwen' : '/edit-image';
      const response = await fetch(`${buildApiUrl(endpoint)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: imageUrls,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edit failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      let editedImageUri: string;

      if (model === 'qwen') {
        // Handle Qwen API response: { success: true, editedImageData: { images: [...] } }
        if (result.success && result.editedImageData?.images && result.editedImageData.images.length > 0) {
          editedImageUri = result.editedImageData.images[0].url;
        } else {
          throw new Error('Invalid Qwen response format');
        }
      } else {
        // Handle Nano Banana API response: { success: true, editedImageData: "base64..." }
        if (result.success && result.editedImageData) {
          editedImageUri = `data:image/jpeg;base64,${result.editedImageData}`;
        } else {
          throw new Error(result.error || result.details || 'Failed to edit images');
        }
      }
      
      // Add the new edited version to the carousel
      const newVersion: ImageVersion = {
        uri: editedImageUri,
        prompt: `${model === 'qwen' ? 'Qwen' : 'Nano Banana'}: ${prompt}`,
        timestamp: new Date(),
        isOriginal: false,
        isMultiImageEdit: true,
        sourceImages: selectedSourceImages
      };
      
      setImageVersions(prev => {
        const newVersions = [...prev, newVersion];
        // Delay the index update to avoid conflicts with useEffect
        requestAnimationFrame(() => {
          setCurrentImageIndex(newVersions.length - 1);
        });
        return newVersions;
      });
      onImageSelected?.(editedImageUri);
      
      console.log('✅ Multi-image edit completed successfully');
      
    } catch (error) {
      console.error('❌ Multi-image edit failed:', error);
      
      Alert.alert(
        'Edit Failed',
        `Sorry, we couldn't edit your images. ${error instanceof Error ? error.message : 'Please try again.'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsEditing(false);
    }
  };

  const processImageEdit = async (prompt: string, model: 'qwen' | 'nano') => {
    if (!currentImage) return;

    setIsEditing(true);
    
    try {
      console.log('🎨 Starting image edit with prompt:', prompt);
      console.log('🤖 Using model:', model);
      console.log('📂 Image URI:', currentImage.uri.substring(0, 100) + '...');
      
      // First, upload the current image to R2 if it's not already there
      let imageUrl = currentImage.uri;
      
      if (!currentImage.uri.startsWith('http')) {
        imageUrl = await uploadImageToR2(currentImage.uri);
      }
      
      // Call the appropriate API endpoint based on model
      const endpoint = model === 'qwen' ? '/edit-image-qwen' : '/edit-image';
      const response = await fetch(`${buildApiUrl(endpoint)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: [imageUrl],
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edit failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log(`📊 ${model} edit result:`, result);

      let editedImageUri: string;

      if (model === 'qwen') {
        // Handle Qwen API response: { success: true, editedImageData: { images: [...] } }
        if (result.success && result.editedImageData?.images && result.editedImageData.images.length > 0) {
          editedImageUri = result.editedImageData.images[0].url;
        } else {
          throw new Error('Invalid Qwen response format: missing editedImageData.images array or URL');
        }
      } else {
        // Handle Nano Banana API response: { success: true, editedImageData: "base64..." }
        if (result.success && result.editedImageData) {
          editedImageUri = `data:image/jpeg;base64,${result.editedImageData}`;
        } else {
          throw new Error(result.error || result.details || 'Failed to edit image');
        }
      }
      
      // Add the new edited version to the carousel
      const newVersion: ImageVersion = {
        uri: editedImageUri,
        prompt: `${model === 'qwen' ? 'Qwen' : 'Nano Banana'}: ${prompt}`,
        timestamp: new Date(),
        isOriginal: false
      };
      
      setImageVersions(prev => {
        const newVersions = [...prev, newVersion];
        // Delay the index update to avoid conflicts with useEffect
        requestAnimationFrame(() => {
          setCurrentImageIndex(newVersions.length - 1);
        });
        return newVersions;
      });
      onImageSelected?.(editedImageUri);
      
      console.log('✅ Image edit completed successfully with URI:', editedImageUri.substring(0, 100) + '...');
      
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

  const pollVideoStatus = async (predictionId: string): Promise<string> => {
    return await ApiService.pollVideoUntilComplete(predictionId);
  };

  const generateVideo = async (videoType: string, prompt: string) => {
    if (!currentImage) return;

    setIsGeneratingVideo(true);

    try {
      console.log('🎬 Starting video generation...');
      console.log('📝 Video Type:', videoType);
      console.log('📝 Prompt:', prompt);
      console.log('📝 Prompt length:', prompt?.length || 0);
      console.log('📝 Prompt type:', typeof prompt);
      console.log('🖼️ Image URI:', currentImage.uri.substring(0, 100) + '...');

      // First, upload the image to R2 if it's not already there
      let imageUrl = currentImage.uri;
      
      if (!currentImage.uri.startsWith('http')) {
        console.log('📡 Uploading image to R2 first...');
        imageUrl = await uploadImageToR2(currentImage.uri);
      }

      console.log('🎬 Starting video generation with R2 image URL...');

      // Call the video generation API
      const result = await ApiService.startVideoGeneration(imageUrl, prompt);
      console.log('📋 Video API Result received');

      if (result.success && result.predictionId) {
        console.log('✅ Video generation started, prediction ID:', result.predictionId);
        
        // Poll for the video result
        const videoUrl = await pollVideoStatus(result.predictionId);
        
        console.log('✅ Video generation completed successfully');
        console.log('🎥 Video URL:', videoUrl);
        
        // Add the video to the carousel
        const newVideoVersion: ImageVersion = {
          uri: videoUrl,
          prompt: prompt,
          timestamp: new Date(),
          isOriginal: false,
          isVideo: true,
          videoType: videoType
        };
        
        setImageVersions(prev => {
          const newVersions = [...prev, newVideoVersion];
          // Delay the index update to avoid conflicts with useEffect
          requestAnimationFrame(() => {
            setCurrentImageIndex(newVersions.length - 1);
          });
          return newVersions;
        });
        onImageSelected?.(videoUrl);
        
        console.log('✅ Video added to carousel');
      } else {
        throw new Error(result.error || 'Failed to start video generation');
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
    <View style={[styles.container, { backgroundColor }]}>
      {imageVersions.length === 0 ? (
        // Empty state - Instagram-style onboarding
        <View style={[styles.emptyState, { backgroundColor }]}>
          <View style={styles.emptyStateContent}>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={50} color={iconColor} />
            </View>
            <ThemedText style={styles.emptyStateTitle}>Add a Photo</ThemedText>
            <ThemedText style={styles.emptyStateSubtitle}>
              Take a photo or choose from your library to get started
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: tintColor }]}
              onPress={showImagePickerOptions}
            >
              <Text style={[styles.primaryActionButtonText, { color: backgroundColor }]}>
                Add Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Instagram-style full screen layout
        <View style={[styles.fullScreenContainer, { backgroundColor }]}>
          {/* Full Screen Image Carousel */}
          <View style={styles.mediaContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.fullScreenCarousel}
              onScrollBeginDrag={() => {
                setIsUserScrolling(true);
              }}
              onScroll={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < imageVersions.length) {
                  setCurrentImageIndex(newIndex);
                }
              }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                if (newIndex !== currentImageIndex) {
                  setCurrentImageIndex(newIndex);
                }
                setIsUserScrolling(false);
              }}
            >
              {imageVersions.map((version, index) => (
                <View 
                  key={index} 
                  style={[styles.fullScreenSlide, { backgroundColor }]}
                >
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
                { 
                  opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1,
                  backgroundColor: `rgba(${backgroundColor === '#fff' ? '0, 0, 0' : '255, 255, 255'}, 0.6)`
                }
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
              <Ionicons name="close" size={24} color={backgroundColor === '#fff' ? '#ffffff' : '#000000'} />
            </TouchableOpacity>

            {/* Loading Overlay */}
            {(isEditing || isGeneratingVideo || isSaving) && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={textColor} />
                  <Text style={[styles.loadingText, { color: textColor }]}>
                    {isEditing ? 'Editing image...' : isGeneratingVideo ? 'Generating video...' : 'Saving media...'}
                  </Text>
                  <Text style={[styles.loadingSubtext, { color: textColor }]}>
                    {isEditing 
                      ? 'Editing your photo' 
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
          <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom + 20, 80), backgroundColor }]}>
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
                {currentImage?.isMultiImageEdit 
                  ? `Combined from ${currentImage.sourceImages?.length || 0} images: ${currentImage.prompt}`
                  : currentImage?.isOriginal 
                    ? (isMultiImageMode ? `Original (${currentImageIndex + 1}/${imageVersions.length})` : 'Original')
                    : currentImage?.isVideo 
                      ? currentImage.prompt 
                      : currentImage?.prompt
                }
              </ThemedText>
              {isMultiImageMode && !currentImage?.isMultiImageEdit && (
                <ThemedText style={styles.multiImageHint}>
                  {selectedSourceImages.length} images selected • Swipe to browse • Tap Edit to combine
                </ThemedText>
              )}
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
                      <Ionicons name="hourglass-outline" size={26} color={textColor} />
                    ) : (
                      <Feather name="edit-3" size={26} color={textColor} />
                    )}
                  </View>
                  <Text style={[styles.actionButtonLabel, { color: textColor }]}>
                    {isEditing ? 'Editing' : isMultiImageMode && selectedSourceImages.length > 1 ? 'Combine' : 'Edit'}
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
                      <Ionicons name="hourglass-outline" size={26} color={textColor} />
                    ) : (
                      <Ionicons name="videocam" size={26} color={textColor} />
                    )}
                  </View>
                  <Text style={[styles.actionButtonLabel, { color: textColor }]}>
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
                      <Ionicons name="hourglass-outline" size={26} color={textColor} />
                    ) : (
                      <Ionicons name="download-outline" size={26} color={textColor} />
                    )}
                  </View>
                  <Text style={[styles.actionButtonLabel, { color: textColor }]}>
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
                    <Ionicons name="camera" size={26} color={textColor} />
                  </View>
                  <Text style={[styles.actionButtonLabel, { color: textColor }]}>New</Text>
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
    // backgroundColor will be set dynamically based on theme
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set dynamically based on theme
    paddingHorizontal: 40,
    paddingTop: 0, // Reduced top padding for better centering
    paddingBottom: 40,
  },
  emptyStateContent: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 300,
    flex: 1,
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
    // color will be set by ThemedText based on theme
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34, // Add proper line height
    marginTop: 8, // Add small top margin for breathing room
  },
  emptyStateSubtitle: {
    fontSize: 16,
    // color will be set by ThemedText based on theme
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    opacity: 0.7,
  },
  primaryActionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 160,
    // backgroundColor will be set dynamically to tintColor
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  primaryActionButtonText: {
    // color will be set dynamically based on theme
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Full screen layout styles
  fullScreenContainer: {
    flex: 1,
    // backgroundColor will be set dynamically based on theme
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
    // backgroundColor will be set dynamically based on theme
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    // color will be set dynamically based on theme
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    // color will be set dynamically based on theme with opacity
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
    opacity: 0.7,
  },
  // Bottom action bar styles
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor will be set dynamically based on theme
    paddingBottom: 80, // Significantly increased for safe area
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 280, // Increased to accommodate media controls
    justifyContent: 'flex-start',
    zIndex: 20, // Ensure it's above other content
  },
  mediaInfo: {
    marginBottom: 16,
    marginTop: 20, // Add space between story dots and media info
  },
  mediaInfoText: {
    // color will be set by ThemedText based on theme
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaTimestamp: {
    // color will be set by ThemedText based on theme
    fontSize: 13,
    opacity: 0.7,
  },
  multiImageHint: {
    // color will be set by ThemedText based on theme
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
    fontStyle: 'italic',
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
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    zIndex: 25,
  },
  actionButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    // Shadow removed for cleaner look
  },
  actionButtonLabel: {
    // color will be set dynamically based on theme
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
