// Firebase Configuration
// IMPORTANT: In production, these values should be stored in environment variables
// and not committed to version control

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJ03SMvaPinT5bBiaAoex1Jam3StJuh7Y",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "newapp2-7bf2e.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "newapp2-7bf2e",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "newapp2-7bf2e.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "939990037154",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:939990037154:web:47aee976644f0a05bcddfb",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-W6N8WY9N3G"
};

// Validate required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
}