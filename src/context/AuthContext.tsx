

'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { getRoleById } from '@/services/adminService';
import type { Role } from '@/types';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  role: Role | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  role: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    // If firebase isn't configured, auth and db will be null.
    // This check prevents the app from crashing.
    if (!auth || !db) {
      setUser(null);
      setIsAdmin(false);
      setRole(null);
      setIsLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          let userRoleId: string | null = null;
          
          if (userDocSnap.exists() && userDocSnap.data().hasOwnProperty('roleId')) {
            userRoleId = userDocSnap.data().roleId;

            // Also ensure photoURL is updated if it has changed since last login
            if (currentUser.photoURL && userDocSnap.data().photoURL !== currentUser.photoURL) {
              await setDoc(userDocRef, { photoURL: currentUser.photoURL }, { merge: true });
            }

          } else {
            // New user, or existing user missing a role. Assign 'free_user'.
            const rolesRef = collection(db, 'roles');
            const q = query(rolesRef, where("name", "==", "free_user"), limit(1));
            const roleQuerySnap = await getDocs(q);
            
            if (!roleQuerySnap.empty) {
                userRoleId = roleQuerySnap.docs[0].id;
            } else {
                console.warn("'free_user' role not found. Please create it in the admin panel.");
            }
            
            const docData = {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: Timestamp.now(),
                roleId: userRoleId,
            };

            await setDoc(userDocRef, docData, { merge: true });
          }
          
          let fetchedRole: Role | null = null;
          if (userRoleId) {
            fetchedRole = await getRoleById(userRoleId);
            setRole(fetchedRole || null);
          } else {
            setRole(null);
          }
          
          // Set admin status based on the role's features
          // In a production app, you would use this line:
          // setIsAdmin(fetchedRole?.features?.hasAdminAccess || false);

        } catch (error) {
            console.error("Error in AuthContext during user setup:", error);
            setIsAdmin(false); // Default to not admin on error
        }
      } else {
        setIsAdmin(false);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, role }}>
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
