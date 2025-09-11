import { AppleSignInButton } from '@/components/AppleSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Config } from '@/constants/Config';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, bypassAuth } = useAuth();
  const router = useRouter();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    router.push('/auth/signup');
  };

  const handleBypassAuth = () => {
    bypassAuth();
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Welcome Back</ThemedText>
        <ThemedText style={styles.subtitle}>Sign in to your account</ThemedText>

        <View style={styles.form}>
          <AppleSignInButton
            onSuccess={() => router.replace('/(tabs)')}
            onError={(error) => Alert.alert('Error', error)}
          />

          <GoogleSignInButton
            onSuccess={() => router.replace('/(tabs)')}
            onError={(error) => Alert.alert('Error', error)}
          />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: textColor + '40' }]} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: textColor + '40' }]} />
          </View>

          <TextInput
            style={[styles.input, { color: textColor, borderColor: tintColor }]}
            placeholder="Email"
            placeholderTextColor={textColor + '80'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { color: textColor, borderColor: tintColor }]}
            placeholder="Password"
            placeholderTextColor={textColor + '80'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={backgroundColor} />
            ) : (
              <Text style={[styles.buttonText, { color: backgroundColor }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          {Config.features.bypassAuthEnabled && (
            <TouchableOpacity
              style={[styles.bypassButton, { borderColor: tintColor }]}
              onPress={handleBypassAuth}
            >
              <Text style={[styles.bypassButtonText, { color: tintColor }]}>
                Bypass Authentication (Dev)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.link} onPress={goToSignUp}>
          <ThemedText style={styles.linkText}>
            Don't have an account? <Text style={{ color: tintColor }}>Sign Up</Text>
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 40,
  },
  form: {
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bypassButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  bypassButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  link: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
  },
});
