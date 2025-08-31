import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface PhotoPickerProps {
  onImageSelected?: (uri: string) => void;
}

export function PhotoPicker({ onImageSelected }: PhotoPickerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

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
        setSelectedImage(imageUri);
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
        setSelectedImage(imageUri);
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
            if (editDescription && editDescription.trim() && selectedImage) {
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
    if (!selectedImage) return;

    setIsEditing(true);
    
    try {
      console.log('🎨 Starting image edit with prompt:', prompt);
      console.log('📂 Image URI:', selectedImage.substring(0, 100) + '...');
      
      let imageBlob: Blob;
      
      if (selectedImage.startsWith('data:')) {
        // Handle base64 data URI
        console.log('📄 Converting base64 data URI to blob...');
        const response = await fetch(selectedImage);
        imageBlob = await response.blob();
      } else {
        // Handle file URI (from camera/gallery)
        console.log('📁 Fetching image from URI...');
        const response = await fetch(selectedImage);
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
        uri: selectedImage,
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
        
        // Update the selected image with the edited version
        setSelectedImage(editedImageUri);
        onImageSelected?.(editedImageUri);
        
        Alert.alert(
          'Edit Complete! ✨',
          'Your image has been successfully edited by AI.',
          [{ text: 'Great!', style: 'default' }]
        );
        
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
          {selectedImage ? 'Change Photo' : 'Select Photo'}
        </ThemedText>
      </TouchableOpacity>

      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          
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
                setSelectedImage(null);
                onImageSelected?.('');
              }}
            >
              <ThemedText style={styles.removeButtonText}>🗑️ Remove Photo</ThemedText>
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
  selectedImage: {
    width: Dimensions.get('window').width,
    height: 300,
    marginBottom: 24,
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
