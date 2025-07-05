
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import type { ContentItem } from '@/types';

const contentCollection = collection(db, 'content');

export async function getContentItems(userId: string, countLimit?: number): Promise<ContentItem[]> {
  try {
    if (!userId) {
      console.warn("getContentItems called without a userId. Returning empty array.");
      return [];
    }
    const qConstraints: any[] = [
      where("userId", "==", userId),
      orderBy('createdAt', 'desc')
    ];

    if (countLimit && countLimit !== -1) {
      qConstraints.push(limit(countLimit));
    }

    const q = query(contentCollection, ...qConstraints);
    const querySnapshot = await getDocs(q);
    const items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt; // Firestore Timestamp
      items.push({
        id: doc.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
      } as ContentItem);
    });
    return items;
  } catch (error) {
    console.error("Failed to get content items from Firestore:", error);
    throw error;
  }
}
