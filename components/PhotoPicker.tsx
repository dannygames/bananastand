import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

interface EffectOption {
  id: string;
  label: string;
  promptModifier: string; // Text to append/modify the base prompt
}

interface Effect {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
  model: 'qwen' | 'nano-banana';
  options?: EffectOption[]; // Optional list of selectable options
  isVideoEffect?: boolean; // If true, generates video instead of editing image
}

interface CustomEffect extends Effect {
  isCustom: true;
}

interface PhotoPickerProps {
  onImageSelected?: (uri: string) => void;
}

// Predefined effects for each category
const FUNNY_EFFECTS: Effect[] = [
  { 
    id: 'funny-face', 
    name: 'Funny Face', 
    icon: 'happy-outline', 
    prompt: 'Transform face into', 
    model: 'qwen',
    options: [
      { id: 'cartoon', label: '😄 Cartoon Character', promptModifier: 'a funny cartoon character with exaggerated features' },
      { id: 'emoji', label: '😂 Emoji Style', promptModifier: 'an emoji-style face with bold expressions' },
      { id: 'caricature', label: '🎨 Caricature', promptModifier: 'a humorous caricature with exaggerated features' },
      { id: 'pixar', label: '🎬 Pixar Style', promptModifier: 'a Pixar 3D animation style character' },
    ]
  },
  { 
    id: 'cartoon-style', 
    name: 'Art Style', 
    icon: 'color-wand-outline', 
    prompt: 'Convert image to', 
    model: 'qwen',
    options: [
      { id: 'cartoon', label: '🎨 Cartoon', promptModifier: 'cartoon style with bold colors and outlines' },
      { id: 'anime', label: '⭐ Anime', promptModifier: 'anime art style with expressive eyes and features' },
      { id: 'comic', label: '📚 Comic Book', promptModifier: 'comic book style with halftone dots and bold lines' },
      { id: 'watercolor', label: '🖌️ Watercolor', promptModifier: 'watercolor painting style with soft blended colors' },
      { id: 'oil-painting', label: '🎨 Oil Painting', promptModifier: 'classical oil painting style' },
      { id: 'sketch', label: '✏️ Pencil Sketch', promptModifier: 'pencil sketch drawing style' },
    ]
  },
  { 
    id: 'photo-filter', 
    name: 'Photo Filter', 
    icon: 'camera-outline', 
    prompt: 'Apply', 
    model: 'nano-banana',
    options: [
      { id: 'vintage', label: '📷 Vintage', promptModifier: 'vintage film photography filter with warm tones and grain' },
      { id: 'black-white', label: '⚫⚪ Black & White', promptModifier: 'classic black and white photography' },
      { id: 'sepia', label: '🟤 Sepia', promptModifier: 'sepia tone vintage photography' },
      { id: 'cinematic', label: '🎬 Cinematic', promptModifier: 'cinematic color grading with enhanced contrast' },
    ]
  },
];

const REPLACE_EFFECTS: Effect[] = [
  { 
    id: 'background-change', 
    name: 'Background Change', 
    icon: 'person-outline', 
    prompt: 'Change the background to', 
    model: 'nano-banana',
    options: [
      { id: 'beach', label: '🏖️ Beach', promptModifier: 'a beautiful beach with ocean and sand' },
      { id: 'city', label: '🏙️ City', promptModifier: 'a modern city skyline' },
      { id: 'forest', label: '🌲 Forest', promptModifier: 'a lush forest with trees' },
      { id: 'mountains', label: '⛰️ Mountains', promptModifier: 'majestic mountains' },
      { id: 'space', label: '🚀 Space', promptModifier: 'outer space with stars and galaxies' },
      { id: 'studio', label: '📸 Studio', promptModifier: 'a professional photo studio background' },
    ]
  },
  { 
    id: 'remove-background', 
    name: 'Remove Background', 
    icon: 'cut-outline', 
    prompt: 'Remove the background and replace with', 
    model: 'qwen',
    options: [
      { id: 'white', label: '⚪ White', promptModifier: 'a clean white background' },
      { id: 'transparent', label: '◻️ Transparent', promptModifier: 'transparent background (PNG)' },
      { id: 'blur', label: '🌫️ Blur', promptModifier: 'a blurred version of the original background' },
      { id: 'gradient', label: '🎨 Gradient', promptModifier: 'a colorful gradient background' },
    ]
  },
  { 
    id: 'add-objects', 
    name: 'Add Objects', 
    icon: 'add-circle-outline', 
    prompt: 'Add', 
    model: 'qwen',
    options: [
      { id: 'sunglasses', label: '🕶️ Sunglasses', promptModifier: 'stylish sunglasses to the person' },
      { id: 'hat', label: '🎩 Hat', promptModifier: 'a fashionable hat to the person' },
      { id: 'animals', label: '🐕 Pets', promptModifier: 'cute pets like dogs or cats to the scene' },
      { id: 'flowers', label: '🌺 Flowers', promptModifier: 'beautiful flowers to the scene' },
      { id: 'effects', label: '✨ Special Effects', promptModifier: 'magical special effects like sparkles or glows' },
    ]
  },
];

const ENVIRONMENT_EFFECTS: Effect[] = [
  { 
    id: 'weather-change', 
    name: 'Weather Change', 
    icon: 'sunny-outline', 
    prompt: 'Change the weather in this image to', 
    model: 'qwen',
    options: [
      { id: 'sunny', label: '☀️ Sunny', promptModifier: 'bright sunny weather with clear blue skies' },
      { id: 'rainy', label: '🌧️ Rainy', promptModifier: 'rainy weather with rain drops and wet surfaces' },
      { id: 'snowy', label: '❄️ Snowy', promptModifier: 'snowy weather with falling snow and snow-covered ground' },
      { id: 'foggy', label: '🌫️ Foggy', promptModifier: 'foggy weather with thick fog and reduced visibility' },
      { id: 'cloudy', label: '☁️ Cloudy', promptModifier: 'cloudy overcast weather with gray clouds' },
      { id: 'stormy', label: '⛈️ Stormy', promptModifier: 'stormy weather with dark clouds and lightning' },
    ]
  },
  { 
    id: 'time-of-day', 
    name: 'Time of Day', 
    icon: 'time-outline', 
    prompt: 'Change the lighting and time of day in this image to', 
    model: 'nano-banana',
    options: [
      { id: 'dawn', label: '🌅 Dawn', promptModifier: 'early morning dawn with soft golden light' },
      { id: 'day', label: '☀️ Day', promptModifier: 'bright midday with full sunlight' },
      { id: 'dusk', label: '🌇 Dusk', promptModifier: 'evening dusk with warm orange and pink tones' },
      { id: 'night', label: '🌙 Night', promptModifier: 'nighttime with dark sky and artificial lighting' },
      { id: 'golden-hour', label: '✨ Golden Hour', promptModifier: 'golden hour with warm soft lighting' },
    ]
  },
  { 
    id: 'season-change', 
    name: 'Season Change', 
    icon: 'leaf-outline', 
    prompt: 'Transform the scene to', 
    model: 'qwen',
    options: [
      { id: 'spring', label: '🌸 Spring', promptModifier: 'spring season with blooming flowers and fresh green leaves' },
      { id: 'summer', label: '☀️ Summer', promptModifier: 'summer season with lush green foliage and bright sunlight' },
      { id: 'fall', label: '🍂 Fall', promptModifier: 'fall season with colorful autumn leaves and warm tones' },
      { id: 'winter', label: '❄️ Winter', promptModifier: 'winter season with snow, bare trees, and cold atmosphere' },
    ]
  },
];

const VIDEO_EFFECTS: Effect[] = [
  { 
    id: 'funny-video', 
    name: 'Funny', 
    icon: 'happy-outline', 
    prompt: 'Make it funny', 
    model: 'qwen',
    isVideoEffect: true
  },
  { 
    id: 'custom-video', 
    name: 'Custom', 
    icon: 'create-outline', 
    prompt: '', 
    model: 'qwen',
    isVideoEffect: true
  },
];

export function PhotoPicker({ onImageSelected }: PhotoPickerProps) {
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [selectedSourceImages, setSelectedSourceImages] = useState<string[]>([]);
  const [isMultiImageMode, setIsMultiImageMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'Funny' | 'Replace' | 'Environment' | 'Video Effect' | 'Custom'>('Funny');
  const [isEffectsExpanded, setIsEffectsExpanded] = useState(false);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  const [hasLoadedEffects, setHasLoadedEffects] = useState(false);
  const [showCustomEffectModal, setShowCustomEffectModal] = useState(false);
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectPrompt, setNewEffectPrompt] = useState('');
  const [newEffectModel, setNewEffectModel] = useState<'qwen' | 'nano-banana'>('qwen');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<Effect | CustomEffect | null>(null);
  const [showCustomOptionModal, setShowCustomOptionModal] = useState(false);
  const [customOptionInput, setCustomOptionInput] = useState('');
  const [editingCustomEffect, setEditingCustomEffect] = useState<CustomEffect | null>(null);
  const [showSaveCustomOptionPrompt, setShowSaveCustomOptionPrompt] = useState(false);
  const [lastUsedCustomOption, setLastUsedCustomOption] = useState<{ effect: Effect | CustomEffect; option: EffectOption } | null>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const currentImage = imageVersions.length > 0 ? imageVersions[currentImageIndex] : null;

  // Load custom effects from AsyncStorage on mount
  useEffect(() => {
    const loadCustomEffects = async () => {
      try {
        const savedEffects = await AsyncStorage.getItem('@custom_effects');
        if (savedEffects) {
          const parsedEffects = JSON.parse(savedEffects);
          setCustomEffects(parsedEffects);
          console.log('✅ Loaded custom effects:', parsedEffects.length);
        }
      } catch (error) {
        console.error('❌ Error loading custom effects:', error);
      } finally {
        setHasLoadedEffects(true);
      }
    };

    loadCustomEffects();
  }, []);

  // Save custom effects to AsyncStorage whenever they change
  useEffect(() => {
    // Don't save until we've loaded effects from storage
    if (!hasLoadedEffects) return;

    const saveCustomEffects = async () => {
      try {
        if (customEffects.length === 0) {
          // Clear storage if no effects
          await AsyncStorage.removeItem('@custom_effects');
          console.log('🗑️ Cleared custom effects from storage');
        } else {
          await AsyncStorage.setItem('@custom_effects', JSON.stringify(customEffects));
          console.log('💾 Saved custom effects:', customEffects.length);
        }
      } catch (error) {
        console.error('❌ Error saving custom effects:', error);
      }
    };

    saveCustomEffects();
  }, [customEffects, hasLoadedEffects]);

  // Effect to show save prompt after custom option is used
  useEffect(() => {
    if (showSaveCustomOptionPrompt) {
      // Delay to let the effect apply first
      const timer = setTimeout(() => {
        handleSaveCustomOption();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSaveCustomOptionPrompt]);

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
      'Select Photo',
      'Choose how you want to add a photo',
      [
        {
          text: 'Camera',
          onPress: takePhoto,
        },
        {
          text: 'Library',
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

  const applyEffect = async (effect: Effect | CustomEffect, option?: EffectOption) => {
    console.log('✨ Applying effect:', effect.name);
    if (!currentImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    // Check if current media is a video
    if (currentImage.isVideo) {
      Alert.alert(
        'Videos Not Supported', 
        'Effects can only be applied to images. Please select an image to use image or video effects.'
      );
      return;
    }

    // If effect has options but no option selected, show options modal
    if (effect.options && effect.options.length > 0 && !option) {
      setSelectedEffect(effect);
      setShowOptionsModal(true);
      return;
    }

    // Build the final prompt
    let finalPrompt = effect.prompt;
    if (option) {
      finalPrompt = option.promptModifier || effect.prompt;
      if (effect.prompt && option.promptModifier) {
        finalPrompt = `${effect.prompt} ${option.promptModifier}`;
      }
    }

    console.log('📝 Final prompt:', finalPrompt);

    // Handle video effects
    if (effect.isVideoEffect) {
      // For custom video with empty prompt, show custom input
      if (effect.id === 'custom-video' && !finalPrompt) {
        setSelectedEffect(effect);
        setShowCustomOptionModal(true);
        return;
      }
      
      // Generate video
      await generateVideo('custom', finalPrompt);
      return;
    }

    // Map 'nano-banana' to 'nano' for the API
    const model = effect.model === 'nano-banana' ? 'nano' : effect.model;
    
    if (isMultiImageMode && selectedSourceImages.length > 1) {
      await processMultiImageEdit(finalPrompt, model as 'qwen' | 'nano');
    } else {
      await processImageEdit(finalPrompt, model as 'qwen' | 'nano');
    }
  };

  const handleOptionSelected = (option: EffectOption | 'custom') => {
    if (!selectedEffect) return;

    if (option === 'custom') {
      // Show custom input modal
      setShowOptionsModal(false);
      setShowCustomOptionModal(true);
    } else {
      // Apply the predefined option
      setShowOptionsModal(false);
      applyEffect(selectedEffect, option);
      setSelectedEffect(null);
    }
  };

  const handleCustomOptionSubmit = () => {
    if (!selectedEffect || !customOptionInput.trim()) {
      Alert.alert('Missing Input', 'Please enter your custom option.');
      return;
    }

    const customOption: EffectOption = {
      id: 'custom',
      label: 'Custom',
      promptModifier: customOptionInput.trim(),
    };

    setShowCustomOptionModal(false);
    
    // Handle video effects differently
    if (selectedEffect.isVideoEffect) {
      // For video effects, directly generate video with the custom prompt
      generateVideo('custom', customOptionInput.trim());
      setCustomOptionInput('');
      setSelectedEffect(null);
      return;
    }
    
    // Store for potential saving (image effects only)
    setLastUsedCustomOption({ effect: selectedEffect, option: customOption });
    
    // Apply the effect
    applyEffect(selectedEffect, customOption);
    
    // Ask if user wants to save this as a reusable custom effect
    setShowSaveCustomOptionPrompt(true);
    
    // Reset
    setCustomOptionInput('');
    setSelectedEffect(null);
  };

  const handleSaveCustomOption = () => {
    if (!lastUsedCustomOption) return;

    Alert.prompt(
      'Save Custom Effect',
      'Give this effect a name so you can use it again:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setShowSaveCustomOptionPrompt(false);
            setLastUsedCustomOption(null);
          }
        },
        {
          text: 'Save',
          onPress: (effectName) => {
            if (effectName && effectName.trim()) {
              const newEffect: CustomEffect = {
                id: `custom-${Date.now()}`,
                name: effectName.trim(),
                icon: lastUsedCustomOption.effect.icon,
                prompt: `${lastUsedCustomOption.effect.prompt} ${lastUsedCustomOption.option.promptModifier}`,
                model: lastUsedCustomOption.effect.model,
                isCustom: true,
              };
              
              setCustomEffects(prev => [...prev, newEffect]);
              Alert.alert('Success', `Custom effect "${newEffect.name}" saved!`);
            }
            setShowSaveCustomOptionPrompt(false);
            setLastUsedCustomOption(null);
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleCreateCustomEffect = () => {
    if (!newEffectName.trim() || !newEffectPrompt.trim()) {
      Alert.alert('Missing Information', 'Please provide both a name and prompt for your effect.');
      return;
    }

    if (editingCustomEffect) {
      // Update existing effect
      const updatedEffect: CustomEffect = {
        ...editingCustomEffect,
        name: newEffectName.trim(),
        prompt: newEffectPrompt.trim(),
        model: newEffectModel,
      };

      setCustomEffects(prev => prev.map(effect => 
        effect.id === editingCustomEffect.id ? updatedEffect : effect
      ));
      
      Alert.alert('Success', `Custom effect "${updatedEffect.name}" updated!`);
    } else {
      // Create new effect
      const newEffect: CustomEffect = {
        id: `custom-${Date.now()}`,
        name: newEffectName.trim(),
        icon: 'sparkles-outline',
        prompt: newEffectPrompt.trim(),
        model: newEffectModel,
        isCustom: true,
      };

      setCustomEffects(prev => [...prev, newEffect]);
      Alert.alert('Success', `Custom effect "${newEffect.name}" created!`);
    }

    setShowCustomEffectModal(false);
    
    // Reset form
    setNewEffectName('');
    setNewEffectPrompt('');
    setNewEffectModel('qwen');
    setEditingCustomEffect(null);
  };

  const handleEditCustomEffect = (effect: CustomEffect) => {
    setEditingCustomEffect(effect);
    setNewEffectName(effect.name);
    setNewEffectPrompt(effect.prompt);
    setNewEffectModel(effect.model);
    setShowCustomEffectModal(true);
  };

  const handleDeleteCustomEffect = (effect: CustomEffect) => {
    Alert.alert(
      'Delete Effect',
      `Are you sure you want to delete "${effect.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCustomEffects(prev => prev.filter(e => e.id !== effect.id));
            Alert.alert('Deleted', `"${effect.name}" has been deleted.`);
          },
        },
      ]
    );
  };

  const handleLongPressCustomEffect = (effect: CustomEffect) => {
    Alert.alert(
      effect.name,
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => handleEditCustomEffect(effect),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteCustomEffect(effect),
        },
      ]
    );
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

      // First, ensure the image is uploaded to R2
      let imageUrl = currentImage.uri;
      
      // Check if it's already on R2 (not just any http URL)
      const isR2Url = currentImage.uri.includes('r2.dev') || currentImage.uri.includes('r2.cloudflarestorage.com');
      
      if (!isR2Url) {
        console.log('📡 Image is not on R2, uploading to R2 first...');
        
        if (currentImage.uri.startsWith('http')) {
          // It's an external URL (like fal.media), download and re-upload
          console.log('📥 Downloading external image to re-upload to R2...');
          const fileName = `temp_${Date.now()}.jpg`;
          const tempUri = `${FileSystem.documentDirectory}${fileName}`;
          
          const downloadResult = await FileSystem.downloadAsync(currentImage.uri, tempUri);
          imageUrl = await uploadImageToR2(downloadResult.uri);
          
          // Clean up temp file
          try {
            await FileSystem.deleteAsync(tempUri);
          } catch (e) {
            console.log('⚠️ Could not delete temp file');
          }
        } else {
          // It's a local URI (data: or file:), upload directly
          imageUrl = await uploadImageToR2(currentImage.uri);
        }
      }

      console.log('🎬 Starting video generation with R2 image URL:', imageUrl.substring(0, 100) + '...');

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

            {/* Floating Save button - below close button */}
            <TouchableOpacity
              style={[
                styles.floatingSaveButton,
                { 
                  opacity: (isEditing || isGeneratingVideo || isSaving) ? 0.3 : 1,
                  backgroundColor: `rgba(${backgroundColor === '#fff' ? '0, 0, 0' : '255, 255, 255'}, 0.6)`
                }
              ]}
              onPress={handleSaveMedia}
              disabled={isEditing || isGeneratingVideo || isSaving}
            >
              <Ionicons name="download-outline" size={24} color={backgroundColor === '#fff' ? '#ffffff' : '#000000'} />
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

            {/* AI Editing Effects Section */}
            <View style={styles.effectsContainer}>
              {/* Collapsible Header */}
              <TouchableOpacity 
                style={styles.effectsHeader}
                onPress={() => setIsEffectsExpanded(!isEffectsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={[styles.effectsTitle, { color: textColor }]}>AI Editing Effects</Text>
                <Ionicons 
                  name={isEffectsExpanded ? "chevron-down" : "chevron-up"} 
                  size={24} 
                  color={textColor} 
                />
              </TouchableOpacity>
              
              {currentImage?.isVideo && isEffectsExpanded && (
                <View style={styles.videoWarningContainer}>
                  <Ionicons name="information-circle-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                  <Text style={[styles.videoWarningText, { color: textColor }]}>
                    Effects can only be applied to images. Please select an image to use effects.
                  </Text>
                </View>
              )}
              
              {isEffectsExpanded && (
                <>
                  {/* Tabs */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsScrollContainer}
                    contentContainerStyle={styles.tabsContainer}
                  >
                    {(['Funny', 'Replace', 'Environment', 'Video Effect', 'Custom'] as const).map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        style={styles.tab}
                        onPress={() => setSelectedTab(tab)}
                      >
                        <Text 
                          style={[
                            styles.tabText, 
                            { color: textColor },
                            selectedTab === tab && styles.tabTextActive
                          ]}
                        >
                          {tab}
                        </Text>
                        {selectedTab === tab && (
                          <View style={[styles.tabIndicator, { backgroundColor: textColor }]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Effects Content */}
                  <View style={styles.effectsContent}>
                    {selectedTab === 'Funny' && FUNNY_EFFECTS.map((effect) => (
                      <TouchableOpacity 
                        key={effect.id}
                        style={[
                          styles.effectItem, 
                          { 
                            borderBottomColor: textColor + '20',
                            opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                          }
                        ]}
                        onPress={() => applyEffect(effect)}
                        disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                      >
                        <View style={styles.effectItemLeft}>
                          <Ionicons name={effect.icon} size={24} color={textColor} />
                          <View style={styles.effectItemTextContainer}>
                            <Text style={[styles.effectItemText, { color: textColor }]}>{effect.name}</Text>
                            <Text style={[styles.effectItemModel, { color: textColor }]}>
                              Model: {effect.model === 'nano-banana' ? 'Nano Banana' : 'Qwen'}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    ))}

                    {selectedTab === 'Replace' && REPLACE_EFFECTS.map((effect) => (
                      <TouchableOpacity 
                        key={effect.id}
                        style={[
                          styles.effectItem, 
                          { 
                            borderBottomColor: textColor + '20',
                            opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                          }
                        ]}
                        onPress={() => applyEffect(effect)}
                        disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                      >
                        <View style={styles.effectItemLeft}>
                          <Ionicons name={effect.icon} size={24} color={textColor} />
                          <View style={styles.effectItemTextContainer}>
                            <Text style={[styles.effectItemText, { color: textColor }]}>{effect.name}</Text>
                            <Text style={[styles.effectItemModel, { color: textColor }]}>
                              Model: {effect.model === 'nano-banana' ? 'Nano Banana' : 'Qwen'}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    ))}

                    {selectedTab === 'Environment' && ENVIRONMENT_EFFECTS.map((effect) => (
                      <TouchableOpacity 
                        key={effect.id}
                        style={[
                          styles.effectItem, 
                          { 
                            borderBottomColor: textColor + '20',
                            opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                          }
                        ]}
                        onPress={() => applyEffect(effect)}
                        disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                      >
                        <View style={styles.effectItemLeft}>
                          <Ionicons name={effect.icon} size={24} color={textColor} />
                          <View style={styles.effectItemTextContainer}>
                            <Text style={[styles.effectItemText, { color: textColor }]}>{effect.name}</Text>
                            <Text style={[styles.effectItemModel, { color: textColor }]}>
                              Model: {effect.model === 'nano-banana' ? 'Nano Banana' : 'Qwen'}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    ))}

                    {selectedTab === 'Video Effect' && VIDEO_EFFECTS.map((effect) => (
                      <TouchableOpacity 
                        key={effect.id}
                        style={[
                          styles.effectItem, 
                          { 
                            borderBottomColor: textColor + '20',
                            opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                          }
                        ]}
                        onPress={() => applyEffect(effect)}
                        disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                      >
                        <View style={styles.effectItemLeft}>
                          <Ionicons name={effect.icon} size={24} color={textColor} />
                          <View style={styles.effectItemTextContainer}>
                            <Text style={[styles.effectItemText, { color: textColor }]}>{effect.name}</Text>
                            <Text style={[styles.effectItemModel, { color: textColor }]}>
                              {effect.prompt || 'Custom video animation'}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                      </TouchableOpacity>
                    ))}

                    {selectedTab === 'Custom' && (
                      <>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Custom Effects</Text>
                        
                        {customEffects.length === 0 && (
                          <View style={styles.emptyCustomEffects}>
                            <Text style={[styles.emptyCustomEffectsText, { color: textColor }]}>
                              No custom effects yet.{'\n'}
                              Use "Custom Option" in any effect or tap "Create New Effect" below.
                            </Text>
                          </View>
                        )}
                        
                        {customEffects.map((effect) => (
                          <TouchableOpacity 
                            key={effect.id}
                            style={[
                              styles.effectItem, 
                              { 
                                borderBottomColor: textColor + '20',
                                opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                              }
                            ]}
                            onPress={() => applyEffect(effect)}
                            onLongPress={() => handleLongPressCustomEffect(effect)}
                            disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                          >
                            <View style={styles.effectItemLeft}>
                              <Ionicons name={effect.icon} size={24} color={textColor} />
                              <View style={styles.effectItemTextContainer}>
                                <Text style={[styles.effectItemText, { color: textColor }]}>{effect.name}</Text>
                                <Text style={[styles.effectItemModel, { color: textColor }]}>
                                  Model: {effect.model === 'nano-banana' ? 'Nano Banana' : 'Qwen'}
                                </Text>
                                <Text style={[styles.effectItemHint, { color: textColor }]}>
                                  Long press to edit or delete
                                </Text>
                              </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                          </TouchableOpacity>
                        ))}

                        <TouchableOpacity 
                          style={[
                            styles.effectItem, 
                            { 
                              borderBottomColor: textColor + '20',
                              opacity: (currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving) ? 0.4 : 1
                            }
                          ]}
                          onPress={() => setShowCustomEffectModal(true)}
                          disabled={currentImage?.isVideo || isEditing || isGeneratingVideo || isSaving}
                        >
                          <View style={styles.effectItemLeft}>
                            <Ionicons name="add-circle-outline" size={24} color={tintColor} />
                            <Text style={[styles.effectItemText, { color: tintColor }]}>+ Create New Effect</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={tintColor} style={{ opacity: 0.5 }} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Custom Effect Creation Modal */}
      <Modal
        visible={showCustomEffectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomEffectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editingCustomEffect ? 'Edit Custom Effect' : 'Create Custom Effect'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCustomEffectModal(false);
                setEditingCustomEffect(null);
                setNewEffectName('');
                setNewEffectPrompt('');
                setNewEffectModel('qwen');
              }}>
                <Ionicons name="close" size={28} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: textColor }]}>Effect Name</Text>
              <TextInput
                style={[styles.modalInput, { color: textColor, borderColor: textColor + '40' }]}
                placeholder="Enter effect name..."
                placeholderTextColor={textColor + '60'}
                value={newEffectName}
                onChangeText={setNewEffectName}
              />

              <Text style={[styles.modalLabel, { color: textColor }]}>Effect Prompt</Text>
              <TextInput
                style={[styles.modalTextArea, { color: textColor, borderColor: textColor + '40' }]}
                placeholder="Describe what this effect should do..."
                placeholderTextColor={textColor + '60'}
                value={newEffectPrompt}
                onChangeText={setNewEffectPrompt}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.modalLabel, { color: textColor }]}>AI Model</Text>
              <View style={styles.modelSelector}>
                <TouchableOpacity
                  style={[
                    styles.modelOption,
                    { borderColor: textColor + '40' },
                    newEffectModel === 'qwen' && { backgroundColor: tintColor, borderColor: tintColor }
                  ]}
                  onPress={() => setNewEffectModel('qwen')}
                >
                  <Text style={[
                    styles.modelOptionText,
                    { color: newEffectModel === 'qwen' ? '#fff' : textColor }
                  ]}>
                    Qwen
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modelOption,
                    { borderColor: textColor + '40' },
                    newEffectModel === 'nano-banana' && { backgroundColor: tintColor, borderColor: tintColor }
                  ]}
                  onPress={() => setNewEffectModel('nano-banana')}
                >
                  <Text style={[
                    styles.modelOptionText,
                    { color: newEffectModel === 'nano-banana' ? '#fff' : textColor }
                  ]}>
                    Nano Banana
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: textColor + '40' }]}
                onPress={() => {
                  setShowCustomEffectModal(false);
                  setEditingCustomEffect(null);
                  setNewEffectName('');
                  setNewEffectPrompt('');
                  setNewEffectModel('qwen');
                }}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate, { backgroundColor: tintColor }]}
                onPress={handleCreateCustomEffect}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {editingCustomEffect ? 'Update Effect' : 'Create Effect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Effect Options Selection Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {selectedEffect?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={28} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.optionsSubtitle, { color: textColor }]}>
                Select an option:
              </Text>
              
              {selectedEffect?.options?.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionButton, { borderColor: textColor + '20' }]}
                  onPress={() => handleOptionSelected(option)}
                  disabled={isEditing || isGeneratingVideo || isSaving}
                >
                  <Text style={[styles.optionButtonText, { color: textColor }]}>
                    {option.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              ))}

              {/* Custom Option */}
              <TouchableOpacity
                style={[styles.optionButton, styles.customOptionButton, { borderColor: tintColor }]}
                onPress={() => handleOptionSelected('custom')}
                disabled={isEditing || isGeneratingVideo || isSaving}
              >
                <View style={styles.customOptionContent}>
                  <Ionicons name="create-outline" size={24} color={tintColor} />
                  <Text style={[styles.optionButtonText, { color: tintColor }]}>
                    ✏️ Custom Option
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={tintColor} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Option Input Modal */}
      <Modal
        visible={showCustomOptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomOptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {selectedEffect?.isVideoEffect ? 'Custom Video' : `Custom ${selectedEffect?.name}`}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCustomOptionModal(false);
                setCustomOptionInput('');
              }}>
                <Ionicons name="close" size={28} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: textColor }]}>
                {selectedEffect?.isVideoEffect 
                  ? 'Describe the video animation:' 
                  : 'Describe your custom option:'
                }
              </Text>
              {selectedEffect?.prompt && !selectedEffect?.isVideoEffect && (
                <Text style={[styles.customInputHint, { color: textColor }]}>
                  Base prompt: "{selectedEffect?.prompt}"
                </Text>
              )}
              <TextInput
                style={[styles.modalTextArea, { color: textColor, borderColor: textColor + '40' }]}
                placeholder={selectedEffect?.isVideoEffect 
                  ? "e.g., Create a fun, comedic video animation with exaggerated movements..."
                  : "e.g., a magical sunset with purple clouds..."
                }
                placeholderTextColor={textColor + '60'}
                value={customOptionInput}
                onChangeText={setCustomOptionInput}
                multiline
                numberOfLines={4}
                autoFocus
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: textColor + '40' }]}
                onPress={() => {
                  setShowCustomOptionModal(false);
                  setCustomOptionInput('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate, { backgroundColor: tintColor }]}
                onPress={handleCustomOptionSubmit}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  floatingSaveButton: {
    position: 'absolute',
    top: 114, // Below the close button (60 + 44 + 10)
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
  // Effects Container Styles
  effectsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  effectsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  effectsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  videoWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  videoWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  tabsScrollContainer: {
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
  tab: {
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.6,
  },
  tabTextActive: {
    opacity: 1,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
  effectsContent: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  effectItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  effectItemTextContainer: {
    flex: 1,
  },
  effectItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  effectItemModel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  effectItemHint: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emptyCustomEffects: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyCustomEffectsText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modelSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modelOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  modelOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 2,
  },
  modalButtonCreate: {
    // backgroundColor set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Options Modal Styles
  optionsSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  customOptionButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  customOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInputHint: {
    fontSize: 13,
    opacity: 0.6,
    fontStyle: 'italic',
    marginBottom: 12,
    marginTop: 4,
  },
});
