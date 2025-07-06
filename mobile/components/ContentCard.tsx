
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import type { ContentItem } from '@/types';
import { Globe, StickyNote, FileImage, Mic, Film, FileText, Youtube, Twitter, Github } from 'lucide-react-native';
import SpotifyIcon from './SpotifyIcon';
import { format, isSameYear, parseISO } from 'date-fns';

interface ContentCardProps {
  item: ContentItem;
  onPress: () => void;
}

const getTypeSpecifics = (item: ContentItem) => {
  switch (item.type) {
    case 'link':
      return { icon: Globe, color: 'blue' };
    case 'note':
      return { icon: StickyNote, color: 'yellow' };
    case 'image':
      return { icon: FileImage, color: 'gray' };
    case 'voice':
      return { icon: Mic, color: 'purple' };
    case 'movie':
      return { icon: Film, color: 'orange' };
    default:
      return { icon: StickyNote, color: 'gray' };
  }
};

const domainIconMap: { [key: string]: React.ElementType } = {
  'github.com': Github,
  'youtube.com': Youtube,
  'youtu.be': Youtube,
  'x.com': Twitter,
  'twitter.com': Twitter,
  'open.spotify.com': SpotifyIcon,
  'spotify.com': SpotifyIcon,
};

const getPlainTextDescription = (htmlString: string | undefined): string => {
    if (!htmlString) return '';
    // Basic regex to strip HTML tags. Not perfect but good enough for display.
    return htmlString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '); 
};

// Sub-components for each card type for clarity
const ImageCard: React.FC<{ item: ContentItem; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.card}>
    <Image
      style={styles.imageFill}
      source={{ uri: item.imageUrl }}
      contentFit="cover"
      transition={300}
    />
  </TouchableOpacity>
);

const NoteCard: React.FC<{ item: ContentItem; onPress: () => void }> = ({ item, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.card, styles.noteCard]}>
        <Text style={styles.quoteMark}>“</Text>
        <Text style={styles.noteText} numberOfLines={8}>
            {getPlainTextDescription(item.description)}
        </Text>
  </TouchableOpacity>
);

const PdfCard: React.FC<{ item: ContentItem; onPress: () => void }> = ({ item, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.card, styles.centeredCard]}>
        <FileText size={48} color="#6750A4" />
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
        <Text style={styles.subtitle}>PDF Document</Text>
    </TouchableOpacity>
);

const DefaultCard: React.FC<{ item: ContentItem; onPress: () => void }> = ({ item, onPress }) => {
    const [faviconError, setFaviconError] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setFaviconError(false);
        setImageError(false);
    }, [item.id]);

    const hasImage = item.imageUrl && !imageError;
    const specifics = getTypeSpecifics(item);

    const TitleIcon = useMemo(() => {
        if (item.type !== 'link') {
            return <specifics.icon size={16} color="#666" />;
        }
        const DomainIcon = item.domain ? domainIconMap[item.domain] : null;
        if (DomainIcon) {
            return <DomainIcon size={16} color="#333" />;
        }
        if (item.faviconUrl && !faviconError) {
            return <Image source={{ uri: item.faviconUrl }} style={styles.favicon} onError={() => setFaviconError(true)} />;
        }
        return <Globe size={16} color="#666" />;
    }, [item, specifics, faviconError]);

    const displayTitle = useMemo(() => {
        if (item.type === 'voice') {
            try {
                const createdAtDate = parseISO(item.createdAt);
                const formatString = isSameYear(new Date(), createdAtDate)
                ? 'MMM d, h:mm a'
                : 'MMM d, yyyy';
                return format(createdAtDate, formatString);
            } catch (e) {
                return item.title || "Voice Note";
            }
        }
        return item.title || "Untitled";
    }, [item.createdAt, item.title, item.type]);


    return (
        <TouchableOpacity onPress={onPress} style={styles.card}>
            {hasImage && (
                <Image
                    style={styles.image}
                    source={{ uri: item.imageUrl }}
                    contentFit="cover"
                    transition={300}
                    onError={() => setImageError(true)}
                />
            )}
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    {TitleIcon}
                    <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>
                </View>
                {item.description && (
                    <Text style={styles.description} numberOfLines={3}>
                        {getPlainTextDescription(item.description)}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};


const ContentCard: React.FC<ContentCardProps> = ({ item, onPress }) => {
    if (item.type === 'image') {
        return <ImageCard item={item} onPress={onPress} />;
    }
    if (item.type === 'note') {
        return <NoteCard item={item} onPress={onPress} />;
    }
    if (item.contentType === 'PDF' && item.type === 'link') {
        return <PdfCard item={item} onPress={onPress} />;
    }
    return <DefaultCard item={item} onPress={onPress} />;
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
  imageFill: {
    width: '100%',
    height: '100%',
    aspectRatio: 1,
  },
  content: {
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  favicon: {
    width: 16,
    height: 16,
    marginTop: 2,
    borderRadius: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  noteCard: {
    padding: 16,
    justifyContent: 'center',
    minHeight: 150,
  },
  quoteMark: {
    position: 'absolute',
    top: 0,
    left: 8,
    fontSize: 60,
    color: '#F2F0F7',
    fontWeight: 'bold',
  },
  noteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#444',
  },
  centeredCard: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ContentCard;
