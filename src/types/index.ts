
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
  url?: string;
  imageUrl?: string; 
  audioUrl?: string;
  tags: Tag[]; 
  zoneId: string; // Renamed from collectionId
  userId?: string; 
  createdAt: string; // ISO date string
}

// Specific type for Link items, if needed for type guarding
export type LinkItem = ContentItem & {
  type: 'link';
  url: string;
};
