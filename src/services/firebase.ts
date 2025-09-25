// Use Firebase v9 compat mode for better React Native compatibility
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { User, ParkingLot, Investment, KYCFormData } from '../types';
import { KYCDocument } from './cloudinaryStorage';
import { firebaseConfig } from '../config/firebase.config';

// Initialize Firebase with compat mode
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase services using compat mode
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configure Firestore settings before any operations
let firestoreInitialized = false;

const initializeFirestore = async () => {
  if (firestoreInitialized) return;
  
  try {
    // Configure Firestore settings for better connectivity (must be done before any operations)
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      merge: true, // This prevents the override warning
      // Add connection settings to handle transport errors
      experimentalForceLongPolling: false, // Use WebSocket when possible
      ignoreUndefinedProperties: true
    });

    // Enable offline persistence for better reliability using modern approach
    await db.enablePersistence({ 
      synchronizeTabs: true,
      experimentalForceOwningTab: false
    });
    
    console.log('Firestore offline persistence enabled');
    firestoreInitialized = true;
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      console.log('Firestore persistence failed: Multiple tabs open, continuing without persistence');
    } else if (error.code === 'unimplemented') {
      console.log('Firestore persistence not available in this browser, continuing without persistence');
    } else {
      console.log('Firestore setup error:', error.message);
    }
    firestoreInitialized = true; // Mark as initialized even if persistence failed
  }
};

// Initialize Firestore immediately
initializeFirestore();

// Export initialization function for use in other modules
export const ensureFirestoreInitialized = initializeFirestore;

// Retry wrapper for Firestore operations to handle transport errors
const withRetry = async <T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a transport error that we can retry
      const isRetryableError = 
        error.code === 'unavailable' ||
        error.code === 'deadline-exceeded' ||
        error.code === 'internal' ||
        error.message?.includes('transport') ||
        error.message?.includes('WebChannelConnection');
      
      if (isRetryableError && attempt < maxRetries) {
        console.log(`Firestore operation failed (attempt ${attempt}/${maxRetries}), retrying...`);
        // Exponential backoff: wait 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }
  
  throw lastError;
};

// Authentication functions
export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    
    // Update last login timestamp
    if (userCredential.user) {
      const userRef = db.collection('users').doc(userCredential.user.uid);
      await userRef.update({
        lastLoginAt: new Date()
      });
    }
    
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logoutUser = async () => {
  try {
    await auth.signOut();
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (error: any) {
    throw new Error(error.message);
  }
};



// User management functions
export const createUserProfile = async (uid: string, userData: any) => {
  try {
    await withRetry(async () => {
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        kycStatus: 'pending',
        kycDocs: {
          idProof: userData.idProof || '', // Now stores cloud storage download URL
          addressProof: userData.addressProof || '', // Now stores cloud storage download URL
          uploadedAt: new Date()
        },
        portfolio: [],
        createdAt: new Date()
      });
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      return userSnap.data() as User;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateKYCStatus = async (uid: string, status: 'pending' | 'verified' | 'rejected') => {
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      kycStatus: status
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get KYC documents for admin verification
export const getKYCDocumentsForUser = async (uid: string) => {
  try {
    // First try to get documents from the documents subcollection (new format)
    const documentsRef = db.collection('users').doc(uid).collection('documents');
    const documentsSnap = await documentsRef.get();
    
    if (!documentsSnap.empty) {
      const documents: KYCDocument[] = [];
      documentsSnap.forEach(doc => {
        const data = doc.data();
        
        // Handle missing url field - construct from publicId if available
        let url = data.url;
        let publicId = data.publicId;
        
        if (!url && publicId) {
          // Construct Cloudinary URL from publicId using environment variable
          const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ddfmwdhzn';
          url = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
        }
        
        // Include all documents, even if URL is missing (we'll handle this in the viewer)
        documents.push({
          id: data.id || doc.id,
          type: data.type || 'unknown',
          url: url || '',
          publicId: publicId || '',
          size: data.size || 0,
          uploadedAt: data.uploadedAt || new Date().toISOString(),
          verified: data.verified || false,
          filename: data.filename || 'Unknown file',
          userId: data.userId || uid
        });
        
        if (!url && !publicId) {
          console.warn(`Document ${doc.id} has no URL or publicId`);
        }
      });
      return documents;
    }
    
    // Fallback to old format (kycDocs field) for backward compatibility
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      const kycDocs = userData?.kycDocs || {};
      
      // Convert Firestore data to array format for display
      const documents: KYCDocument[] = [];
      
      for (const [docType, docData] of Object.entries(kycDocs)) {
        if (docType !== 'lastUpdated' && typeof docData === 'object' && docData !== null) {
          const doc = docData as any;
          documents.push({
            id: doc.id || `${docType}_${Date.now()}`,
            type: doc.type || docType,
            url: doc.url || '',
            publicId: doc.publicId || '',
            size: doc.size || 0,
            uploadedAt: doc.uploadedAt || new Date().toISOString(),
            verified: doc.verified || false,
            filename: doc.filename || `${docType}_document`,
            userId: uid
          });
        }
      }
      
      return documents;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching KYC documents:', error);
    throw new Error(error.message);
  }
};



// File upload functions
export const uploadDocument = async (file: any, path: string): Promise<string> => {
  try {
    const storageRef = storage.ref(path);
    await storageRef.put(file);
    const downloadURL = await storageRef.getDownloadURL();
    return downloadURL;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Parking lot functions
export const getParkingLots = async (): Promise<ParkingLot[]> => {
  try {
    const lotsRef = db.collection('parkingLots');
    const querySnapshot = await lotsRef.where('availability', '==', true).get();
    
    const lots: ParkingLot[] = [];
    querySnapshot.forEach((doc) => {
      lots.push({ id: doc.id, ...doc.data() } as ParkingLot);
    });
    
    return lots;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getParkingLotById = async (id: string): Promise<ParkingLot | null> => {
  try {
    const lotRef = db.collection('parkingLots').doc(id);
    const lotSnap = await lotRef.get();
    
    if (lotSnap.exists) {
      return { id: lotSnap.id, ...lotSnap.data() } as ParkingLot;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Investment functions
export const createInvestment = async (investmentData: Omit<Investment, 'investmentId' | 'createdAt'>): Promise<string> => {
  try {
    const investmentRef = await db.collection('investments').add({
      ...investmentData,
      createdAt: new Date()
    });
    
    // Update parking lot available lots if selectedLots is provided
    if (investmentData.selectedLots && investmentData.parkingLotId) {
      const parkingLotRef = db.collection('parkingLots').doc(investmentData.parkingLotId);
      const parkingLotDoc = await parkingLotRef.get();
      
      if (parkingLotDoc.exists) {
        const parkingLotData = parkingLotDoc.data();
        const currentAvailableLots = parkingLotData?.availableLots || 0;
        const newAvailableLots = Math.max(0, currentAvailableLots - investmentData.selectedLots);
        
        await parkingLotRef.update({
          availableLots: newAvailableLots,
          availability: newAvailableLots > 0,
          updatedAt: new Date()
        });
      }
    }
    
    return investmentRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Create pending investment that requires admin approval
export const createPendingInvestment = async (
  userId: string,
  parkingLotId: string,
  amount: number,
  selectedLots: number = 1,
  paymentMethod: string = 'offline'
): Promise<string> => {
  try {
    const investmentData = {
      userId,
      parkingLotId,
      amount,
      selectedLots,
      paymentStatus: 'pending' as const,
      adminApprovalStatus: 'pending' as const,
      paymentMethod,
      leaseAccepted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      payoutHistory: []
    };
    
    const investmentRef = await db.collection('investments').add(investmentData);
    
    return investmentRef.id;
  } catch (error: any) {
    throw new Error(`Failed to create pending investment: ${error.message}`);
  }
};

export const getUserInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const investmentsRef = db.collection('investments');
    const querySnapshot = await investmentsRef
      .where('userId', '==', userId)
      .where('adminApprovalStatus', '==', 'approved')
      .get();
    
    const investments: Investment[] = [];
    querySnapshot.forEach((doc) => {
      investments.push({ investmentId: doc.id, ...doc.data() } as Investment);
    });
    
    return investments;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Cleanup function to remove old documents without proper URLs
export const cleanupInvalidKYCDocuments = async (): Promise<number> => {
  try {
    let deletedCount = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Check documents subcollection
      const documentsRef = db.collection('users').doc(userId).collection('documents');
      const documentsSnapshot = await documentsRef.get();
      
      for (const docSnapshot of documentsSnapshot.docs) {
        const data = docSnapshot.data();
        
        // Check if document is invalid
        const hasValidUrl = data.url && typeof data.url === 'string' && data.url.trim() !== '' && !data.url.startsWith('test://');
        const hasValidPublicId = data.publicId && typeof data.publicId === 'string' && data.publicId.trim() !== '';
        
        // Delete documents that don't have EITHER a valid url OR a valid publicId
        if (!hasValidUrl && !hasValidPublicId) {
          console.log(`Deleting invalid document: ${docSnapshot.id} for user: ${userId}`, {
            url: data.url,
            publicId: data.publicId,
            type: data.type
          });
          await docSnapshot.ref.delete();
          deletedCount++;
        }
      }
    }
    
    console.log(`Cleanup completed. Deleted ${deletedCount} invalid documents.`);
    return deletedCount;
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    throw new Error(`Cleanup failed: ${error.message}`);
  }
};

export { auth, db, storage };
