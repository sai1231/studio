
import { Stack } from 'expo-router';
import { AuthProvider, useAuth, useProtectedRoute } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

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

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
