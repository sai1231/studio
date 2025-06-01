

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
  audioUrl?: string; // For 'voice' type
  tags: Tag[];
  collectionId: string; // User-selected collection, mandatory
  createdAt: string; // ISO date string
  sentiment?: { // Specific to 'link' type
    label: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  /**
   * For items of type 'link', this field stores the domain of the URL.
   * Examples: "Instagram", "TikTok", "Medium", "YouTube".
   * Populated by a background process.
   */
  url_domain_category?: string;
  /**
   * For items of type 'link', this field stores the specific content type within that domain.
   * Examples: "Post", "Reel", "Article", "Video", "Tweet".
   * Populated by a background process.
   */
  url_content_type?: string;
}

// For backward compatibility and specific link operations, we can still use LinkItem
// but ContentItem becomes the primary type for lists.
export type LinkItem = ContentItem & {
  type: 'link';
  url: string; // url is mandatory for LinkItem
};

