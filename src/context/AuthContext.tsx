
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
             // New user sign-up: assign the default 'free_user' role
            
            // 1. Get the 'free_user' role ID
            const rolesRef = collection(db, 'roles');
            const q = query(rolesRef, where("name", "==", "free_user"), limit(1));
            const roleQuerySnap = await getDocs(q);
            
            let freeUserRoleId: string | null = null;
            if (!roleQuerySnap.empty) {
                freeUserRoleId = roleQuerySnap.docs[0].id;
            } else {
                console.warn("'free_user' role not found. Please create it in the admin panel. New user will have no role.");
            }

            // 2. Create the user document with the roleId
            await setDoc(userDocRef, {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: Timestamp.now(),
                roleId: freeUserRoleId, // Assign role on creation
            });

          } else if (!userDocSnap.data().hasOwnProperty('roleId')) {
             // For backwards compatibility, ensure existing users have a roleId field
            await setDoc(userDocRef, { roleId: null }, { merge: true });
          }
        } catch (error) {
            console.error("Error creating or checking user document in Firestore:", error);
        }
        
        // In a production app, you'd get the token and check for a custom claim.
        // const tokenResult = await currentUser.getIdTokenResult();
        // setIsAdmin(!!tokenResult.claims.admin);
        
        // For development, we'll assume any logged-in user is an admin
        // to simplify testing without needing to set custom claims.
        setIsAdmin(true); 
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
