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
          onPress: (editDescription) => {
            if (editDescription && editDescription.trim()) {
              console.log('Edit description:', editDescription);
              Alert.alert('Edit Requested', `Your edit request: "${editDescription}" has been submitted.`);
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
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={handleEditPhoto}
            >
              <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={handleMakeVideo}
            >
              <ThemedText style={styles.actionButtonText}>Make Video</ThemedText>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: '#ff4444' }]}
            onPress={() => {
              setSelectedImage(null);
              onImageSelected?.('');
            }}
          >
            <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
          </TouchableOpacity>
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
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    marginLeft: -32,
    marginRight: -32,
  },
  selectedImage: {
    width: Dimensions.get('window').width,
    height: 300,
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
