import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, onError }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { signInWithGoogle: authSignInWithGoogle } = useAuth();

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      // Web client ID for Supabase authentication
      webClientId: '847043325640-afio933snemh8egu0deevm4grmi7ehtc.apps.googleusercontent.com',
      // iOS client ID for native iOS sign-in UI - replace with your iOS client ID
      iosClientId: '847043325640-afio933snemh8egu0deevm4grmi7ehtc.apps.googleusercontent.com',
      // Optional: if you want to access Google services on behalf of the user
      offlineAccess: true,
      // Optional: specify additional scopes
      scopes: ['profile', 'email'],
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices();
      
      // Sign in and get user info
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token for Supabase authentication
      const tokens = await GoogleSignin.getTokens();
      
      console.log('Google Sign-In successful:', userInfo);
      console.log('ID Token:', tokens.idToken);
      
      // Send the idToken to Supabase for authentication
      const { error: authError } = await authSignInWithGoogle(tokens.idToken);
      
      if (authError) {
        console.error('Supabase authentication error:', authError);
        onError(authError.message || 'Authentication failed');
        return;
      }
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in flow
        onError('Sign-in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign-in is in progress
        onError('Sign-in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        onError('Google Play Services not available');
      } else {
        // Some other error happened
        onError(error.message || 'An error occurred during Google Sign-In');
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: tintColor }]}
      onPress={signInWithGoogle}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Google Logo SVG would go here - using text for now */}
        <View style={[styles.logoContainer, { backgroundColor: '#fff' }]}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={[styles.buttonText, { color: textColor }]}>
          Continue with Google
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
