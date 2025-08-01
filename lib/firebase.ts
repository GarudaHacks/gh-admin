import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize storage
export const storage = getStorage(app)

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: "garudahacks.com",
});

let emulatorsConnected = false;

if (process.env.NEXT_PUBLIC_ENVIRONMENT === "development" && !emulatorsConnected) {
  connectAuthEmulator(auth, "http://localhost:9099", {
    disableWarnings: false,
  });
  connectFirestoreEmulator(db, "localhost", 8080);
  emulatorsConnected = true;
  console.log("Connected to Firebase emulators");
}

export default app;
