export interface Tag {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  icon?: React.ElementType; // Lucide icon component
}

export type ContentItemType = 'link' | 'note' | 'image' | 'todo' | 'voice';

export interface ContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description?: string; // For notes, this is the main content
  url?: string; // Only for 'link' type
  imageUrl?: string; // For 'link' preview or 'image' type
  tags: Tag[];
  collectionId?: string;
  createdAt: string; // ISO date string
  sentiment?: { // Specific to 'link' type
    label: 'positive' | 'negative' | 'neutral';
    score: number;
  };
}

// For backward compatibility and specific link operations, we can still use LinkItem
// but ContentItem becomes the primary type for lists.
export type LinkItem = ContentItem & {
  type: 'link';
  url: string; // url is mandatory for LinkItem
};
