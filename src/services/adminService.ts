
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
import type { Role, PlanFeatures } from '@/types';

const rolesCollection = collection(db, 'roles');

export interface AdminUser {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string; // ISO String
    contentCount: number;
    zonesCreated: number;
    role?: Role;
}

export async function getRolesWithFeatures(): Promise<Role[]> {
    const rolesSnapshot = await getDocs(rolesCollection);
    return rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      features: doc.data().features || {},
    } as Role)).sort((a,b) => a.name.localeCompare(b.name));
}

export async function createRole(name: string): Promise<Role> {
    const defaultFeatures: PlanFeatures = {
      contentLimit: 100,
      maxZones: 5,
      aiSuggestions: 25,
      accessAdvancedEnrichment: false,
      accessDeclutterTool: false,
    };
    const newRole = { name, features: defaultFeatures };
    const docRef = await addDoc(rolesCollection, newRole);
    return { id: docRef.id, ...newRole };
}

export async function updateRoleFeatures(roleId: string, features: PlanFeatures): Promise<void> {
  const roleDoc = doc(db, 'roles', roleId);
  await updateDoc(roleDoc, { features });
}


export async function getUsersByRoleId(roleId: string): Promise<AdminUser[]> {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, where("roleId", "==", roleId));
    const querySnapshot = await getDocs(q);
    // This is a simplified return for the delete dialog, not a full AdminUser
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
    } as AdminUser));
}

export async function deleteAndReassignRole(roleIdToDelete: string, reassignments: Map<string, string | null>): Promise<void> {
    const batch = writeBatch(db);
    for (const [userId, newRoleId] of reassignments.entries()) {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { roleId: newRoleId });
    }
    const roleRef = doc(db, 'roles', roleIdToDelete);
    batch.delete(roleRef);
    await batch.commit();
}


export async function updateUserRole(userId: string, roleId: string | null): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { roleId: roleId });
}


export async function getUsersWithDetails(): Promise<AdminUser[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);

    if (usersSnapshot.empty) {
        return [];
    }

    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        const contentQuery = query(collection(db, 'content'), where('userId', '==', userId));
        const zonesQuery = query(collection(db, 'zones'), where('userId', '==', userId));
        
        const [contentSnapshot, zonesSnapshot] = await Promise.all([getDocs(contentQuery), getDocs(zonesQuery)]);

        let role: Role | undefined = undefined;
        if (userData.roleId) {
            try {
                const roleDoc = await getDoc(doc(db, 'roles', userData.roleId));
                if (roleDoc.exists()) {
                    role = { id: roleDoc.id, ...roleDoc.data() } as Role;
                }
            } catch(e) {
                console.error(`Could not fetch role for user ${userId}:`, e);
            }
        }

        return {
            id: userId,
            email: userData.email || '',
            displayName: userData.displayName || null,
            photoURL: userData.photoURL || null,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
            contentCount: contentSnapshot.size,
            zonesCreated: zonesSnapshot.size,
            role,
        };
    });

    return Promise.all(userPromises);
}

export async function getUserById(id: string): Promise<AdminUser | undefined> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const userDocRef = doc(db, 'users', id);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        return undefined;
    }

    const userData = userDocSnap.data();
    
    const contentQuery = query(collection(db, 'content'), where('userId', '==', id));
    const zonesQuery = query(collection(db, 'zones'), where('userId', '==', id));
    
    const [contentSnapshot, zonesSnapshot] = await Promise.all([getDocs(contentQuery), getDocs(zonesQuery)]);

    let role: Role | undefined = undefined;
    if (userData.roleId) {
        try {
            const roleDoc = await getDoc(doc(db, 'roles', userData.roleId));
            if (roleDoc.exists()) {
                role = { id: roleDoc.id, ...roleDoc.data() } as Role;
            }
        } catch(e) {
            console.error(`Could not fetch role for user ${id}:`, e);
        }
    }

    return {
        id: id,
        email: userData.email || '',
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
        contentCount: contentSnapshot.size,
        zonesCreated: zonesSnapshot.size,
        role,
    };
}


export async function createDefaultRoles(): Promise<void> {
  const batch = writeBatch(db);
  
  const rolesToCheck = [
    {
      name: 'free_user',
      features: {
        contentLimit: 100,
        maxZones: 2,
        aiSuggestions: 10,
        accessAdvancedEnrichment: false,
        accessDeclutterTool: false,
      }
    },
    {
      name: 'pro_user',
      features: {
        contentLimit: -1,
        maxZones: -1,
        aiSuggestions: -1,
        accessAdvancedEnrichment: true,
        accessDeclutterTool: true,
      }
    },
    {
      name: 'admin',
      features: {
        contentLimit: -1,
        maxZones: -1,
        aiSuggestions: -1,
        accessAdvancedEnrichment: true,
        accessDeclutterTool: true,
      }
    }
  ];

  for (const role of rolesToCheck) {
      const q = query(rolesCollection, where("name", "==", role.name), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
          const newRoleRef = doc(rolesCollection);
          batch.set(newRoleRef, role);
      }
  }

  await batch.commit();
}
