

export interface Tag {
  id: string;
  name: string;
}

export interface Zone {
  id:string;
  name: string;
  icon?: string; 
  latestItem?: ContentItem;
}

export type ContentItemType = 'link' | 'note' | 'image' | 'voice' | 'movie'; // Removed 'todo'

// This is the new Role interface which now includes features
export interface Role {
  id: string;
  name: string;
  features: PlanFeatures;
}

// Represents a subscription tier like "Free" or "Pro"
export interface Plan {
  id: string;
  name: string;
  features: PlanFeatures;
}

// This interface remains, as it's a good structure for features
export interface PlanFeatures {
  [key: string]: number | boolean;
  contentLimit: number;
  maxZones: number;
  aiSuggestions: number;
  accessAdvancedEnrichment: boolean;
  accessDeclutterTool: boolean;
  allowPdfUploads: boolean;
  allowVoiceNotes: boolean;
  allowTemporaryContent: boolean;
  hasAdminAccess: boolean;
}

// Data structure used in the application code
export interface ContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description?: string;
  mindNote?: string;
  url?: string;
  imageUrl?: string;
  imageAspectRatio?: number;
  audioUrl?: string;
  faviconUrl?: string;
  tags: Tag[];
  zoneId?: string;
  userId?: string;
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string for when the content should be deleted
  domain?: string;
  contentType?: string;
  movieDetails?: MovieDetails; // Added for movie type
  status?: 'pending-analysis'; // Status is now only for content enrichment
  colorPalette?: string[];
}

export interface MovieDetails {
  posterPath?: string;
  releaseYear?: string;
  rating?: number;
  director?: string;
  cast?: string[];
  genres?: string[];
}

export interface SearchFilters {
  zoneId?: string | null;
  contentType?: string | null;
  tagNames?: string[];
  domain?: string | null;
}

// Specific type for Link items, if needed for type guarding
export type LinkItem = ContentItem & {
  type: 'link';
  url: string;
};

// New types for the single Task List document model
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  createdAt: string; // ISO date string
  dueDate?: string; // ISO date string
}

export interface TaskList {
  id: string;
  userId: string;
  tasks: Task[];
}

    