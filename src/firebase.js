import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDi69JpdFGmRO42Y3U0baphzZDJMoDTzT0",
  authDomain: "sammarathon2026-40ea8.firebaseapp.com",
  projectId: "sammarathon2026-40ea8",
  storageBucket: "sammarathon2026-40ea8.firebasestorage.app",
  messagingSenderId: "479551172462",
  appId: "1:479551172462:web:6b1ff18b2b505261ff1b7f",
  measurementId: "G-GLX67EWV6X"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
