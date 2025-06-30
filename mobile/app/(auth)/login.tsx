
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '@/lib/firebase';
import { Brain } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props} style={{ height: 24, width: 24, marginRight: 12}}>
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.11-5.52c-2.17 1.45-4.92 2.3-8.78 2.3-6.76 0-12.47-4.55-14.51-10.61H2.26v5.7C6.22 42.66 14.48 48 24 48z"/>
        <path fill="#FBBC05" d="M9.49 29.08c-.43-1.3-.66-2.67-.66-4.08s.23-2.78.66-4.08v-5.7H2.26C.88 18.25 0 21.05 0 24s.88 5.75 2.26 8.66l7.23-5.58z"/>
        <path fill="#EA4335" d="M24 9.4c3.54 0 6.66 1.21 9.13 3.62l6.29-6.29C35.91 2.5 30.48 0 24 0 14.48 0 6.22 5.34 2.26 13.22l7.23 5.7c2.04-6.06 7.75-10.62 14.51-10.62z"/>
    </svg>
);


const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // IMPORTANT: Replace these with your own client IDs from Google Cloud Console
    clientId: "YOUR_GOOGLE_CLIENT_ID_FOR_WEB_HERE",
    iosClientId: "YOUR_GOOGLE_CLIENT_ID_FOR_IOS_HERE",
    androidClientId: "YOUR_GOOGLE_CLIENT_ID_FOR_ANDROID_HERE",
  });

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        setIsGoogleLoading(true);
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);
        try {
          await signInWithCredential(auth, credential);
          // The root layout will handle the redirect
        } catch (error: any) {
          Alert.alert('Google Sign-In Failed', error.message);
        } finally {
          setIsGoogleLoading(false);
        }
      } else if (response?.type === 'error') {
        Alert.alert('Google Sign-In Error', response.error?.message || 'An unknown error occurred.');
        setIsGoogleLoading(false);
      }
    };
    handleGoogleResponse();
  }, [response]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The root layout will handle the redirect
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    promptAsync().catch(error => {
        Alert.alert('Google Sign-In Error', 'Could not start the sign-in process.');
        setIsGoogleLoading(false);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Brain size={48} color="#6750A4" />
        <Text style={styles.title}>Mati</Text>
      </View>
      <Text style={styles.subtitle}>Welcome back</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleEmailLogin} disabled={isLoading || isGoogleLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

         <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
          {isGoogleLoading ? (
            <ActivityIndicator color="#6750A4" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Sign In with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => Alert.alert('Sign Up', 'Sign up functionality can be added here.')}>
        <Text style={styles.footerText}>
          Don't have an account? <Text style={styles.linkText}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F0F7',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6750A4',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#6750A4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
  },
  googleButton: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#6750A4',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
