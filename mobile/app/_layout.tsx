
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    // If the user is not signed in and is trying to access anything other than the auth group,
    // send them to the login screen.
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } 
    // If the user *is* signed in and they are in the auth group (e.g. they hit the back button after logging in),
    // send them to the main app layout.
    else if (user && inAuthGroup) {
      router.replace('/(tabs)');
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

  // The Stack here allows you to push modal screens on top of the tab bar later on.
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
