

'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
  limit,
} from 'firebase/firestore';
import type { Plan, PlanFeatures } from '@/types';

const defaultFeatures: PlanFeatures = {
  contentLimit: 0,
  maxZones: 0,
  aiSuggestions: 0,
  accessAdvancedEnrichment: false,
  accessDeclutterTool: false,
  allowPdfUploads: false,
  allowVoiceNotes: false,
  allowTemporaryContent: false,
  hasAdminAccess: false,
};

export async function getPlans(): Promise<Plan[]> {
  if (!db) return [];
  const plansCollection = collection(db, 'plans');
  const plansSnapshot = await getDocs(plansCollection);
  return plansSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      features: { ...defaultFeatures, ...(data.features || {}) },
    } as Plan;
  }).sort((a,b) => a.name.localeCompare(b.name));
}

export async function updatePlan(planId: string, features: Partial<PlanFeatures>): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  const planDoc = doc(db, 'plans', planId);
  await updateDoc(planDoc, { features });
}

export async function createDefaultPlans(): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  const batch = writeBatch(db);
  const plansCollection = collection(db, 'plans');

  const plansToCreate = [
    {
      name: 'Free',
      features: {
        ...defaultFeatures,
        contentLimit: 100,
        maxZones: 2,
        aiSuggestions: 10,
      }
    },
    {
      name: 'Pro',
      features: {
        ...defaultFeatures,
        contentLimit: -1, // Unlimited
        maxZones: -1,
        aiSuggestions: -1,
        accessAdvancedEnrichment: true,
        accessDeclutterTool: true,
        allowPdfUploads: true,
        allowVoiceNotes: true,
        allowTemporaryContent: true,
      }
    }
  ];

  for (const plan of plansToCreate) {
    const q = query(plansCollection, where("name", "==", plan.name), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const newPlanRef = doc(plansCollection, plan.name.toLowerCase()); // Use name as ID
      batch.set(newPlanRef, plan);
    }
  }

  await batch.commit();
}
