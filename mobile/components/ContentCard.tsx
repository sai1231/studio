
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import type { ContentItem } from '@/types';
import { Globe } from 'lucide-react-native';

interface ContentCardProps {
  item: ContentItem;
  onPress: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      {item.imageUrl ? (
        <Image
          style={styles.image}
          source={{ uri: item.imageUrl }}
          contentFit="cover"
          transition={300}
        />
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.domain && (
            <View style={styles.domainContainer}>
                <Globe size={14} color="#666" />
                <Text style={styles.domainText} numberOfLines={1}>
                    {item.domain}
                </Text>
            </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minHeight: 34,
  },
  domainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  domainText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
});

export default ContentCard;
