

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

// IMPORTANT: These are mock implementations for client-side development.
// In a real production app, these actions MUST be performed on a secure backend
// (e.g., Firebase Functions) using the Firebase Admin SDK to ensure security.

const mockUsers: AdminUser[] = []; // In-memory store for newly created users

export async function createUser(details: { email: string; password?: string; displayName: string; roleId?: string | null }): Promise<AdminUser> {
    console.log(`[MOCK] Creating user:`, { email: details.email, displayName: details.displayName, roleId: details.roleId });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // This is NOT how you would do it in production.
    // The Admin SDK would be used to create the user in Firebase Auth.
    const newUser: AdminUser = {
        id: `mock_user_${Date.now()}`,
        email: details.email,
        displayName: details.displayName,
        photoURL: null,
        createdAt: new Date().toISOString(),
        contentCount: 0,
        zonesCreated: 0,
        role: undefined, // Will be resolved by getUsersWithDetails
    };
    
    // This is a client-side mock, so we add to an in-memory array.
    // A real implementation would not need this.
    mockUsers.unshift(newUser);

    // In a real app, you would also create a document in the 'users' collection here
    // with the assigned roleId.
    // e.g., await setDoc(doc(db, 'users', newUser.id), { ...otherData, roleId: details.roleId });
    
    return newUser;
}

export async function changeUserPassword(userId: string, newPassword?: string): Promise<void> {
    console.log(`[MOCK] Changing password for user ${userId} to "${newPassword}"`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real production app, you would use the Firebase Admin SDK's
    // updateUser method.
    // e.g., admin.auth().updateUser(userId, { password: newPassword });
    
    // Since this is a mock, we just resolve successfully.
    return Promise.resolve();
}


export async function getRolesWithFeatures(): Promise<Role[]> {
    const rolesSnapshot = await getDocs(rolesCollection);
    return rolesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        // Merge fetched features with defaults to ensure all keys are present
        features: { ...defaultFeatures, ...(data.features || {}) },
      } as Role
    }).sort((a,b) => a.name.localeCompare(b.name));
}

export async function createRole(name: string): Promise<Role> {
    // When creating a new role, start with a slightly more generous default set.
    const newRoleFeatures: PlanFeatures = {
      ...defaultFeatures,
      contentLimit: 100,
      maxZones: 5,
      aiSuggestions: 25,
      allowPdfUploads: false,
      allowVoiceNotes: false,
      allowTemporaryContent: false,
      hasAdminAccess: false,
    };
    const newRole = { name, features: newRoleFeatures };
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

export async function getRoleById(roleId: string): Promise<Role | null> {
    if (!roleId) return null;
    const roleDoc = await getDoc(doc(db, 'roles', roleId));
    if (roleDoc.exists()) {
        const data = roleDoc.data();
        return {
            id: roleDoc.id,
            name: data.name,
            features: { ...defaultFeatures, ...(data.features || {}) },
        } as Role;
    }
    return null;
}


export async function getUsersWithDetails(): Promise<AdminUser[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);

    let allUsersFromDb: AdminUser[] = [];

    if (!usersSnapshot.empty) {
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
      allUsersFromDb = await Promise.all(userPromises);
    }
    
    // Combine mock users (for newly created ones) with DB users
    return [...mockUsers, ...allUsersFromDb];
}

export async function getUserById(id: string): Promise<AdminUser | undefined> {
    // Check mock users first
    const mockUser = mockUsers.find(u => u.id === id);
    if (mockUser) {
        return mockUser;
    }
  
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
        ...defaultFeatures,
        contentLimit: 100,
        maxZones: 2,
        aiSuggestions: 10,
        hasAdminAccess: false,
      }
    },
    {
      name: 'pro_user',
      features: {
        ...defaultFeatures,
        contentLimit: -1,
        maxZones: -1,
        aiSuggestions: -1,
        accessAdvancedEnrichment: true,
        accessDeclutterTool: true,
        allowPdfUploads: true,
        allowVoiceNotes: true,
        allowTemporaryContent: true,
        hasAdminAccess: false,
      }
    },
    {
      name: 'admin',
      features: {
        ...defaultFeatures,
        contentLimit: -1,
        maxZones: -1,
        aiSuggestions: -1,
        accessAdvancedEnrichment: true,
        accessDeclutterTool: true,
        allowPdfUploads: true,
        allowVoiceNotes: true,
        allowTemporaryContent: true,
        hasAdminAccess: true,
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
