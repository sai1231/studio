
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Plan } from '@/types';

const adminRolesCollection = collection(db, 'adminRoles');

export interface AdminRole {
    id: string;
    name: string;
}

export interface AdminUser {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string; // ISO String
    subscription: {
        tier: 'Free' | 'Pro';
    };
    contentCount: number;
    zonesCreated: number;
    role?: AdminRole;
}

export async function getAdminRoles(): Promise<AdminRole[]> {
    const rolesSnapshot = await getDocs(adminRolesCollection);
    return rolesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as AdminRole)).sort((a,b) => a.name.localeCompare(b.name));
}

export async function createAdminRole(name: string): Promise<AdminRole> {
    const docRef = await addDoc(adminRolesCollection, { name });
    return { id: docRef.id, name };
}

export async function getUsersByRoleId(roleId: string): Promise<AdminUser[]> {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, where("adminRoleId", "==", roleId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
    } as AdminUser));
}

export async function deleteAdminRole(roleId: string): Promise<void> {
    const affectedUsers = await getUsersByRoleId(roleId);
    
    const batch = writeBatch(db);

    // Un-assign the role from all affected users
    affectedUsers.forEach(user => {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, { adminRoleId: null });
    });

    // Delete the role document itself
    const roleRef = doc(db, 'adminRoles', roleId);
    batch.delete(roleRef);

    await batch.commit();
}


export async function updateUserRole(userId: string, roleId: string | null): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { adminRoleId: roleId });
}


// Fetches all users from the 'users' collection and enriches them with subscription and content count.
// NOTE: This approach fetches associated data for each user individually, which can be inefficient
// for a large number of users (N+1 query problem). In a production app with many users,
// this data should be denormalized onto the user document or fetched via a dedicated backend endpoint.
export async function getUsersWithSubscription(): Promise<AdminUser[]> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);

    if (usersSnapshot.empty) {
        return [];
    }

    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // 1. Fetch subscription tier
        let subscriptionTier: 'Free' | 'Pro' = 'Free'; // Default to Free
        try {
            const subQuery = query(collection(db, 'users', userId, 'subscriptions'), limit(1));
            const subSnapshot = await getDocs(subQuery);
            if (!subSnapshot.empty) {
                const subData = subSnapshot.docs[0].data();
                if (subData.tier === 'Pro') {
                   subscriptionTier = 'Pro';
                }
            }
        } catch (e) {
            console.error(`Could not fetch subscription for user ${userId}:`, e);
        }

        // 2. Fetch content count
        let contentCount = 0;
        try {
            const contentQuery = query(collection(db, 'content'), where('userId', '==', userId));
            const contentSnapshot = await getDocs(contentQuery);
            contentCount = contentSnapshot.size;
        } catch (e) {
            console.error(`Could not fetch content count for user ${userId}:`, e);
        }

        // 3. Fetch zones count
        let zonesCreated = 0;
        try {
            const zonesQuery = query(collection(db, 'zones'), where('userId', '==', userId));
            const zonesSnapshot = await getDocs(zonesQuery);
            zonesCreated = zonesSnapshot.size;
        } catch (e) {
            console.error(`Could not fetch zones count for user ${userId}:`, e);
        }

        // 4. Fetch admin role
        let role: AdminRole | undefined = undefined;
        const adminRoleId = userData.adminRoleId;
        if (adminRoleId) {
            try {
                const roleDoc = await getDoc(doc(db, 'adminRoles', adminRoleId));
                if (roleDoc.exists()) {
                    role = { id: roleDoc.id, ...roleDoc.data() } as AdminRole;
                }
            } catch(e) {
                console.error(`Could not fetch role for user ${userId}:`, e);
            }
        }

        const createdAt = userData.createdAt; // Firestore Timestamp or ISO string

        return {
            id: userId,
            email: userData.email || '',
            displayName: userData.displayName || null,
            photoURL: userData.photoURL || null,
            createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
            subscription: { tier: subscriptionTier },
            contentCount: contentCount,
            zonesCreated: zonesCreated,
            role,
        };
    });

    return Promise.all(userPromises);
}

export async function getUserById(id: string): Promise<AdminUser | undefined> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    const userDocRef = doc(db, 'users', id);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        return undefined;
    }

    const userData = userDocSnap.data();
    
    // Fetch subscription tier
    let subscriptionTier: 'Free' | 'Pro' = 'Free';
    try {
        const subQuery = query(collection(db, 'users', id, 'subscriptions'), limit(1));
        const subSnapshot = await getDocs(subQuery);
        if (!subSnapshot.empty) {
            const subData = subSnapshot.docs[0].data();
             if (subData.tier === 'Pro') {
               subscriptionTier = 'Pro';
            }
        }
    } catch (e) {
        console.error(`Could not fetch subscription for user ${id}:`, e);
    }

    // Fetch content count
    let contentCount = 0;
    try {
        const contentQuery = query(collection(db, 'content'), where('userId', '==', id));
        const contentSnapshot = await getDocs(contentQuery);
        contentCount = contentSnapshot.size;
    } catch (e) {
        console.error(`Could not fetch content count for user ${id}:`, e);
    }

    // Fetch zones count
    let zonesCreated = 0;
    try {
        const zonesQuery = query(collection(db, 'zones'), where('userId', '==', id));
        const zonesSnapshot = await getDocs(zonesQuery);
        zonesCreated = zonesSnapshot.size;
    } catch (e) {
        console.error(`Could not fetch zones count for user ${id}:`, e);
    }

    // Fetch admin role
    let role: AdminRole | undefined = undefined;
    const adminRoleId = userData.adminRoleId;
    if (adminRoleId) {
        try {
            const roleDoc = await getDoc(doc(db, 'adminRoles', adminRoleId));
            if (roleDoc.exists()) {
                role = { id: roleDoc.id, ...roleDoc.data() } as AdminRole;
            }
        } catch(e) {
            console.error(`Could not fetch role for user ${id}:`, e);
        }
    }


    const createdAt = userData.createdAt;

    return {
        id: id,
        email: userData.email || '',
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
        subscription: { tier: subscriptionTier },
        contentCount: contentCount,
        zonesCreated: zonesCreated,
        role,
    };
}


export async function updateUserSubscriptionTier(userId: string, newTier: 'Free' | 'Pro'): Promise<void> {
    const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');
    const q = query(subscriptionsRef, limit(1));
    const subscriptionSnapshot = await getDocs(q);

    const planId = newTier.toLowerCase();
    const planRef = doc(db, 'plans', planId);
    
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) {
        throw new Error(`Plan document for tier "${newTier}" does not exist in the 'plans' collection.`);
    }

    const subscriptionData = {
        plan: planRef,
        status: newTier === 'Pro' ? 'active' : 'free_tier',
        tier: newTier,
    };

    if (subscriptionSnapshot.empty) {
        await addDoc(subscriptionsRef, subscriptionData);
    } else {
        const subscriptionDocRef = subscriptionSnapshot.docs[0].ref;
        await updateDoc(subscriptionDocRef, subscriptionData);
    }
}
