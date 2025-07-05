
export interface Tag {
  id: string;
  name: string;
}

export type ContentItemType = 'link' | 'note' | 'image' | 'voice' | 'movie';

export interface MovieDetails {
  posterPath?: string;
  releaseYear?: string;
  rating?: number;
  director?: string;
  cast?: string[];
  genres?: string[];
}

export interface ContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description?: string;
  mindNote?: string;
  url?: string;
  imageUrl?: string;
  audioUrl?: string;
  faviconUrl?: string;
  tags: Tag[];
  zoneId?: string;
  userId?: string;
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string for when the content should be deleted
  domain?: string;
  contentType?: string;
  movieDetails?: MovieDetails;
  status?: 'pending-analysis';
  colorPalette?: string[];
}
