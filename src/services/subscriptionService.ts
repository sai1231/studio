
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import type { Plan, PlanFeatures } from '@/types';

const plansCollection = collection(db, 'plans');

export async function getPlans(): Promise<Plan[]> {
  try {
    const querySnapshot = await getDocs(plansCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Plan));
  } catch (error) {
    console.error("Failed to get plans from Firestore:", error);
    throw error;
  }
}

export async function updatePlan(planId: string, features: PlanFeatures): Promise<void> {
  try {
    const planDoc = doc(db, 'plans', planId);
    await updateDoc(planDoc, { features });
  } catch (error) {
    console.error(`Failed to update plan ${planId} in Firestore:`, error);
    throw error;
  }
}

export async function createDefaultPlans(): Promise<void> {
  const freePlanRef = doc(db, 'plans', 'free');
  const proPlanRef = doc(db, 'plans', 'pro');

  try {
    const freePlanSnap = await getDoc(freePlanRef);
    const proPlanSnap = await getDoc(proPlanRef);

    if (freePlanSnap.exists() && proPlanSnap.exists()) {
      console.log("Default plans already exist.");
      return;
    }

    const batch = writeBatch(db);

    if (!freePlanSnap.exists()) {
      const freePlanData: Omit<Plan, 'id'> = {
        name: 'Free',
        features: {
          contentLimit: 100,
          maxZones: 2,
          aiSuggestions: 10,
          accessAdvancedEnrichment: false,
          accessDeclutterTool: false,
        },
      };
      batch.set(freePlanRef, freePlanData);
    }

    if (!proPlanSnap.exists()) {
      const proPlanData: Omit<Plan, 'id'> = {
        name: 'Pro',
        features: {
          contentLimit: -1,
          maxZones: -1,
          aiSuggestions: -1,
          accessAdvancedEnrichment: true,
          accessDeclutterTool: true,
        },
      };
      batch.set(proPlanRef, proPlanData);
    }

    await batch.commit();
    console.log("Default plans created successfully.");

  } catch (error) {
    console.error("Failed to create default plans in Firestore:", error);
    throw error;
  }
}
