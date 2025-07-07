

import { db, app as firebaseApp } from '@/lib/firebase';
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
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import type { Role, PlanFeatures } from '@/types';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';


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

export async function createUser(details: { email: string; password?: string; displayName: string; roleId?: string | null }): Promise<void> {
    if (!db || !firebaseApp) throw new Error("Firestore is not configured.");
    if (!details.password) {
        throw new Error("Password is required to create a user from the client.");
    }
    
    // Use a secondary Firebase app instance to create the user.
    // This prevents the admin from being signed out.
    const secondaryApp = initializeApp(firebaseApp.options, `secondary-app-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const newUserCredential = await createUserWithEmailAndPassword(secondaryAuth, details.email, details.password);
        
        await updateProfile(newUserCredential.user, { displayName: details.displayName });

        const userDocRef = doc(db, 'users', newUserCredential.user.uid);
        await setDoc(userDocRef, {
            email: details.email,
            displayName: details.displayName,
            photoURL: null,
            createdAt: Timestamp.now(),
            roleId: details.roleId || null,
        }, { merge: true });

    } catch (error) {
        console.error("Error creating user with secondary app:", error);
        throw error; // re-throw to be handled by the dialog
    } finally {
        // Sign out from the secondary app and clean it up
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
    }
}

export async function changeUserPassword(userId: string, newPassword?: string): Promise<void> {
    console.log(`[MOCK] Changing password for user ${userId} to "${newPassword}"`);
    // NOTE: This is a mock function. Changing another user's password requires
    // the Firebase Admin SDK and must be done on a secure backend (e.g., Firebase Functions).
    // It cannot be implemented securely on the client-side.
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Promise.resolve();
}


export async function getRolesWithFeatures(): Promise<Role[]> {
    if (!db) return [];
    const rolesCollection = collection(db, 'roles');
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
    if (!db) throw new Error("Firestore is not configured.");
    const rolesCollection = collection(db, 'roles');
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
  if (!db) throw new Error("Firestore is not configured.");
  const roleDoc = doc(db, 'roles', roleId);
  await updateDoc(roleDoc, { features });
}


export async function getUsersByRoleId(roleId: string): Promise<AdminUser[]> {
    if (!db) return [];
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
    if (!db) throw new Error("Firestore is not configured.");
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
    if (!db) throw new Error("Firestore is not configured.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { roleId: roleId });
}

export async function getRoleById(roleId: string): Promise<Role | null> {
    if (!db) return null;
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

export async function getUserRoleId(userId: string): Promise<string | null> {
    if (!db) return null;
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
        return userDoc.data().roleId || null;
    }
    return null;
}


export async function getUsersWithDetails(): Promise<AdminUser[]> {
    if (!db) return [];
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
    if (!db) return undefined;
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
  if (!db) throw new Error("Firestore is not configured.");
  const batch = writeBatch(db);
  const rolesCollection = collection(db, 'roles');
  
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
