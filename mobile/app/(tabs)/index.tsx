
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, SafeAreaView, TextInput } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getContentItems } from '@/services/contentService';
import type { ContentItem } from '@/types';
import ContentCard from '@/components/ContentCard';
import { Search } from 'lucide-react-native';

const HomeScreen = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(lowercasedTerm) ||
      (item.description && item.description.toLowerCase().includes(lowercasedTerm)) ||
      (item.domain && item.domain.toLowerCase().includes(lowercasedTerm)) ||
      (item.tags && item.tags.some(tag => tag.name.toLowerCase().includes(lowercasedTerm)))
    );
  }, [items, searchTerm]);


  const handleCardPress = (item: ContentItem) => {
    // For now, just log it. We can implement a detail view later.
    console.log('Pressed item:', item.title);
    Alert.alert("Item Pressed", item.title);
  };
  
  const renderHeader = () => (
    <>
      <Text style={styles.title}>Home</Text>
      <View style={styles.searchContainer}>
        <Search color="#999" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your memories..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
    </>
  );

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
      {items.length === 0 && !searchTerm ? (
        <View style={styles.centered}>
            <Text style={styles.title}>Welcome to Mati</Text>
            <Text style={styles.emptyText}>You haven't saved any content yet.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={({ item }) => <ContentCard item={item} onPress={() => handleCardPress(item)} />}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={<View style={{ height: 100 }} />}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyResultsContainer}>
              <Text style={styles.emptyResultsText}>No items found for "{searchTerm}"</Text>
            </View>
          }
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
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 16,
    paddingHorizontal: 8,
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;
