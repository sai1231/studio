export interface Tag {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  icon?: React.ElementType; // Lucide icon component
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  tags: Tag[];
  collectionId?: string;
  createdAt: string; // ISO date string
  sentiment?: {
    label: 'positive' | 'negative' | 'neutral';
    score: number;
  };
}
