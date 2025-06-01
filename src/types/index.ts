
export interface Tag {
  id: string;
  name: string;
}

export interface Zone { // Renamed from Collection
  id:string;
  name: string;
  icon?: React.ElementType;
}

export type ContentItemType = 'link' | 'note' | 'image' | 'todo' | 'voice';

// Data structure used in the application code
export interface ContentItem {
  id: string; 
  type: ContentItemType;
  title: string;
  description?: string;
  mindNote?: string; // Added Mind Note field
  url?: string;
  imageUrl?: string; 
  audioUrl?: string;
  tags: Tag[]; 
  zoneId?: string; 
  userId?: string; 
  createdAt: string; // ISO date string
  domain?: string; // e.g., instagram.com, youtube.com
  contentType?: string; // e.g., Reel, Post, Article, Video
}

// Specific type for Link items, if needed for type guarding
export type LinkItem = ContentItem & {
  type: 'link';
  url: string;
};

