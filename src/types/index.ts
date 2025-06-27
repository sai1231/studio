
export interface Tag {
  id: string;
  name: string;
}

export interface Zone {
  id:string;
  name: string;
  icon?: string; 
}

export type ContentItemType = 'link' | 'note' | 'image' | 'todo' | 'voice' | 'movie'; // Added 'movie'

// Data structure used in the application code
export interface ContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description?: string;
  mindNote?: string;
  url?: string;
  imageUrl?: string;
  audioUrl?: string;
  tags: Tag[];
  zoneId?: string;
  userId?: string;
  createdAt: string; // ISO date string
  dueDate?: string; // ISO date string for TODO due dates
  domain?: string;
  contentType?: string;
  movieDetails?: MovieDetails; // Added for movie type
  status?: 'pending' | 'completed' | 'pending-analysis'; // For TODOs and content analysis
  searchKeywords?: string[]; // For Firestore-based search
}

export interface MovieDetails {
  posterPath?: string;
  releaseYear?: string;
  rating?: number;
  director?: string;
  cast?: string[];
  genres?: string[];
}

// Specific type for Link items, if needed for type guarding
export type LinkItem = ContentItem & {
  type: 'link';
  url: string;
};
