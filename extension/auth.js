import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, getIdToken } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let auth;

if (isFirebaseConfigured) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} else {
    console.error("Firebase is not configured in the extension. Please update extension/firebase-config.js");
}

const provider = auth ? new GoogleAuthProvider() : null;

export function onUserChanged(callback) {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
}

export async function signIn() {
    if (!auth || !provider) {
        throw new Error("Firebase auth not initialized.");
    }
    return signInWithPopup(auth, provider);
}

export async function signOut() {
    if (!auth) return;
    return firebaseSignOut(auth);
}

export async function getCurrentUserToken() {
    if (!auth || !auth.currentUser) {
        return null;
    }
    return getIdToken(auth.currentUser);
}
