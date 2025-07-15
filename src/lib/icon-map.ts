
import { Bookmark, Briefcase, Home, Library } from 'lucide-react';
import type React from 'react';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
};

export const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return Bookmark;
};
