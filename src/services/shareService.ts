
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import type { Share } from '@/types';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const sharesCollection = collection(db, 'shares');

/**
 * Creates a secure, unique, and unguessable share link configuration in Firestore.
 * @param shareData - The configuration for the share link.
 * @returns The full Share object including the new unique ID.
 */
export async function createShareLink(shareData: {
  userId: string;
  contentId?: string;
  zoneId?: string;
  type: 'item' | 'zone';
  expiresAt: Date | null;
  password?: string;
}): Promise<Share> {
  if (!db) throw new Error('Firestore is not configured.');
  if (!shareData.userId) throw new Error('User ID is required to create a share link.');
  if (!shareData.contentId && !shareData.zoneId) throw new Error('Either contentId or zoneId must be provided.');

  const uniqueId = randomBytes(8).toString('hex'); // Generates a 16-character hex string
  const docRef = doc(sharesCollection, uniqueId);
  
  let hashedPassword = undefined;
  if (shareData.password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(shareData.password, salt);
  }

  const newShare: Omit<Share, 'id'> = {
    userId: shareData.userId,
    contentId: shareData.contentId,
    zoneId: shareData.zoneId,
    type: shareData.type,
    createdAt: new Date().toISOString(),
    expiresAt: shareData.expiresAt ? shareData.expiresAt.toISOString() : null,
    password: hashedPassword,
  };

  const dataToSave = {
    ...newShare,
    contentId: newShare.contentId ?? null, // Ensure undefined is converted to null
    zoneId: newShare.zoneId ?? null,       // Ensure undefined is converted to null
    createdAt: Timestamp.fromDate(new Date(newShare.createdAt)),
    expiresAt: newShare.expiresAt ? Timestamp.fromDate(new Date(newShare.expiresAt)) : null,
  };

  await setDoc(docRef, dataToSave);

  return { id: uniqueId, ...newShare };
}

/**
 * Fetches the data for a specific share link.
 * @param shareId - The unique ID of the share link.
 * @returns The Share object or null if not found.
 */
export async function getShareData(shareId: string): Promise<Share | null> {
    if (!db) throw new Error("Firestore is not configured.");
    const docRef = doc(sharesCollection, shareId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }
    
    const data = docSnap.data();
    
    const share: Share = {
        id: docSnap.id,
        userId: data.userId,
        type: data.type,
        contentId: data.contentId,
        zoneId: data.zoneId,
        createdAt: data.createdAt.toDate().toISOString(),
        expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
        password: data.password, // Keep the hashed password
    };
    
    // Check for expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return null; // Link has expired
    }

    return share;
}
