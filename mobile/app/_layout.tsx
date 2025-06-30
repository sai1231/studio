import { Stack } from 'expo-router';
import { AuthProvider, useAuth, useProtectedRoute } from '@/context/AuthContext';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { isFirebaseConfigured } from '@/lib/firebase';
import { AlertTriangle } from 'lucide-react-native';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  
  useProtectedRoute(user);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
};

const FirebaseConfigError = () => (
  <View style={styles.errorContainer}>
    <AlertTriangle size={48} color="#f59e0b" />
    <Text style={styles.errorTitle}>Firebase Not Configured</Text>
    <Text style={styles.errorText}>
      Please add your Firebase project credentials to the file:
    </Text>
    <Text style={styles.errorPath}>mobile/lib/firebase.ts</Text>
  </View>
);

export default function RootLayout() {
  if (!isFirebaseConfigured) {
    return <FirebaseConfigError />;
  }

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#a8a29e',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorPath: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#fef3c7',
    backgroundColor: '#3f3f46',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  }
});
