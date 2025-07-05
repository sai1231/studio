
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getContentItems } from '@/services/contentService';
import type { ContentItem } from '@/types';
import ContentCard from '@/components/ContentCard';

const DashboardScreen = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getContentItems(user.uid)
        .then(fetchedItems => {
          setItems(fetchedItems);
        })
        .catch(error => {
          console.error("Failed to fetch dashboard items:", error);
          Alert.alert("Error", "Could not load your content.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  const handleCardPress = (item: ContentItem) => {
    // For now, just log it. We can implement a detail view later.
    console.log('Pressed item:', item.title);
    Alert.alert("Item Pressed", item.title);
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6750A4" />
        <Text style={styles.loadingText}>Loading your memories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.centered}>
            <Text style={styles.title}>Welcome to Mäti</Text>
            <Text style={styles.emptyText}>You haven't saved any content yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => <ContentCard item={item} onPress={() => handleCardPress(item)} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={() => <Text style={styles.title}>Dashboard</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F0F7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 16,
  },
  loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#666',
  },
  emptyText: {
      marginTop: 8,
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
  }
});

export default DashboardScreen;
