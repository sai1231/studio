
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // We don't want to navigate until we know the user's auth state.
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    // If the user is not signed in and the current screen is not in the auth group,
    // redirect them to the login page.
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } 
    // If the user is signed in and the current screen is in the auth group,
    // redirect them to the dashboard.
    else if (user && inAuthGroup) {
      router.replace('/dashboard');
    }
  }, [user, segments, isLoading, router]);

  // Show a loading spinner while we check for a user.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render the main navigator. The useEffect above will handle redirection.
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
