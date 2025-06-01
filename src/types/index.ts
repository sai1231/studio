
import type { Timestamp } from 'firebase/firestore';

export interface Tag {
  id: string; // Could be randomly generated or same as name for simplicity if names are unique
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  icon?: React.ElementType;
}

export type ContentItemType = 'link' | 'note' | 'image' | 'todo' | 'voice';

// Data structure for Firestore document (excluding id, which is the doc key)
export interface ContentItemFirestoreData {
  type: ContentItemType;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string; // For links, OG image. For images, direct storage URL.
  audioUrl?: string;
  tags: Tag[]; // Array of Tag objects
  collectionId?: string; // Optional, if "None" is selected
  userId?: string; // TODO: Add when Firebase Auth is integrated
  sentiment?: {
    label: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  url_domain_category?: string;
  url_content_type?: string;
  dominantColors?: string[];
  extractedText?: string;
  createdAt: Timestamp; // Firestore server timestamp on creation
}

// Data structure used in the application code (includes id and converted createdAt)
export interface ContentItem extends Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> {
  id: string; // Firestore document ID
  tags: Tag[]; // Ensure tags are Tag[] for client-side consistency
  createdAt: string; // ISO date string (converted from Timestamp)
}

// Specific type for Link items, if needed for type guarding
export type LinkItem = ContentItem & {
  type: 'link';
  url: string;
};
