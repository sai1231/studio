
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Bookmark } from 'lucide-react-native';

const ZonesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Bookmark size={48} color="#6750A4" />
        <Text style={styles.title}>Zones</Text>
        <Text style={styles.subtitle}>This screen will display your zones.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F0F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 80, // Offset for tab bar
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ZonesScreen;
