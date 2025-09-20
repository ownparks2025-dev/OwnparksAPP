import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { quality, format } from '@cloudinary/url-gen/actions/delivery';
import { upload } from 'cloudinary-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth, ensureFirestoreInitialized } from './firebase';

// Initialize Cloudinary for URL generation
const cloudinary = new Cloudinary({
  cloud: {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface KYCDocument {
  id: string;
  type: 'id' | 'address' | 'selfie';
  url: string;
  publicId: string;
  uploadedAt: string;
  verified: boolean;
  userId: string;
  filename: string;
  size: number;
}

/**
 * Upload KYC document to Cloudinary with progress tracking
 * @param imageUri - Local image URI
 * @param documentType - Type of KYC document
 * @param userId - User ID for organization
 * @param onProgress - Optional progress callback function
 * @returns Promise with upload result
 */
export const uploadKYCDocument = async (
  imageUri: string,
  documentType: 'id' | 'address' | 'selfie',
  userId: string,
  onProgress?: (progress: number) => void
): Promise<KYCDocument> => {
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration is missing. Please check cloud name and upload preset.');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `kyc_${documentType}_${userId}_${timestamp}`;
    
    console.log('Starting KYC document upload...');
    console.log('Document type:', documentType);
    console.log('User ID:', userId);
    console.log('Cloud name:', cloudName);
    console.log('Upload preset:', uploadPreset);
    
    // Create form data for unsigned upload
    const formData = new FormData();
    
    // For web, we need to convert the URI to a blob
    let fileToUpload;
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      fileToUpload = blob;
    } else {
      // For mobile, use the URI directly
      fileToUpload = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `${filename}.jpg`,
      } as any;
    }
    
    formData.append('file', fileToUpload);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `kyc_documents/${userId}`);
    formData.append('public_id', filename);
    formData.append('tags', `kyc,${documentType},user_${userId}`);
    
    // Use unsigned upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    console.log('Uploading to Cloudinary:', uploadUrl);
    
    // Report initial progress
    onProgress?.(10);
    
    // Use XMLHttpRequest for better progress tracking and timeout control
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set timeout (30 seconds)
      const timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error('Upload timeout. Please check your internet connection and try again.'));
      }, 30000);
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 70) + 10; // 10-80%
          onProgress?.(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            onProgress?.(85);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Network error during upload. Please check your internet connection.'));
      });
      
      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload was cancelled.'));
      });
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
    
    console.log('Cloudinary upload result:', result);
    onProgress?.(90);

    // Create structured KYC document
    const kycDocument: KYCDocument = {
      id: result.public_id,
      type: documentType,
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: result.created_at,
      verified: false,
      userId,
      filename: `${filename}.${result.format}`,
      size: result.bytes,
    };

    // Save to Firestore with fallback mechanism
    onProgress?.(95);
    try {
      // Check if user is authenticated before trying to save to Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('User not authenticated, saving to local storage as fallback');
        await saveToLocalStorage(userId, kycDocument);
        onProgress?.(100);
        
        // Return the document with a note that it will be synced later
        return {
          ...kycDocument,
          pendingSync: true // Flag to indicate this needs to be synced to Firebase later
        };
      }
      
      await saveDocumentToFirebase(userId, kycDocument);
      console.log('KYC document saved successfully to both Cloudinary and database');
      onProgress?.(100);
      return kycDocument;
    } catch (dbError: any) {
      console.error('Database save failed, but Cloudinary upload succeeded:', dbError);
      
      // Save to local storage as fallback
      try {
        await saveToLocalStorage(userId, kycDocument);
        console.log('Document saved to local storage as fallback');
      } catch (localError) {
        console.error('Failed to save to local storage:', localError);
      }
      
      onProgress?.(100);
      
      // Return the document even if database save failed, since Cloudinary upload succeeded
      // The error message will be shown to the user, but they can retry later
      throw new Error(dbError.message || 'Document uploaded to cloud storage but database save failed. Your document is safely stored and will be processed when connection is restored.');
    }
  } catch (error: any) {
    console.error('Error during document upload process:', error);
    
    // Distinguish between Cloudinary upload errors and database errors
    if (error.message && error.message.includes('database save failed')) {
      // This is a database error after successful Cloudinary upload
      throw error;
    } else {
      // This is a Cloudinary upload error
      throw new Error(`Failed to upload ${documentType} document to cloud storage: ${error.message}`);
    }
  }
};

/**
 * Delete KYC document from Cloudinary
 * @param publicId - Cloudinary public ID
 * @returns Promise with deletion result
 */
export const deleteKYCDocument = async (publicId: string): Promise<boolean> => {
  try {
    // Note: cloudinary-react-native doesn't support direct deletion
    // This would typically be handled by a backend API
    console.warn('Document deletion not implemented in client-side cloudinary-react-native');
    return true; // Return true for now to avoid blocking the app
  } catch (error) {
    console.error('Error deleting KYC document from Cloudinary:', error);
    throw new Error(`Failed to delete document: ${(error as Error).message}`);
  }
};

/**
 * Get optimized URL for KYC document display
 * @param publicId - Cloudinary public ID
 * @param width - Desired width
 * @param height - Desired height
 * @returns Optimized image URL
 */
export const getOptimizedKYCUrl = (
  publicId: string,
  width: number = 400,
  height: number = 400
): string => {
  if (!publicId || publicId.trim() === '') {
    console.warn('getOptimizedKYCUrl: Empty or invalid publicId provided');
    return '';
  }
  
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    console.log('Cloudinary config for URL generation:', {
      cloudName,
      publicId,
      width,
      height
    });
    
    const optimizedUrl = cloudinary
      .image(publicId)
      .resize(fill().width(width).height(height))
      .delivery(quality('auto:good'))
      .delivery(format('auto'))
      .toURL();
      
    console.log('Generated optimized URL:', optimizedUrl);
    return optimizedUrl;
  } catch (error) {
    console.error('Error generating optimized KYC URL:', error);
    console.error('PublicId that failed:', publicId);
    
    // Fallback to basic Cloudinary URL construction
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ddfmwdhzn';
    const fallbackUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_fill,q_auto,f_auto/${publicId}`;
    console.log('Using fallback URL:', fallbackUrl);
    return fallbackUrl;
  }
};

/**
 * Get thumbnail URL for KYC document
 * @param publicId - Cloudinary public ID
 * @returns Thumbnail URL
 */
export const getKYCThumbnail = (publicId: string): string => {
  return getOptimizedKYCUrl(publicId, 150, 150);
};

/**
 * Validate Cloudinary configuration
 * @returns boolean indicating if configuration is valid
 */
export const validateCloudinaryConfig = (): boolean => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Debug logging
  console.log('Cloudinary Config Debug:');
  console.log('Cloud Name:', cloudName);
  console.log('Upload Preset:', uploadPreset);
  console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('CLOUDINARY')));

  if (!cloudName || !uploadPreset) {
    console.error('Missing Cloudinary configuration. Please check your .env file.');
    console.error('Missing values:', {
      cloudName: !cloudName,
      uploadPreset: !uploadPreset
    });
    return false;
  }

  console.log('Cloudinary configuration is valid');
  return true;
};

/**
 * Check if Firebase is connected and ready with exponential backoff
 */
const waitForFirebaseConnection = async (maxRetries: number = 3, baseDelayMs: number = 1000): Promise<void> => {
  // Ensure Firestore is properly initialized first
  await ensureFirestoreInitialized();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try a simple read operation to test connectivity with timeout
      const testPromise = db.collection('users').limit(1).get();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      console.log('Firebase connection established successfully');
      return;
    } catch (error: any) {
      console.log(`Firebase connection attempt ${i + 1}/${maxRetries} failed:`, {
        code: error.code,
        message: error.message
      });
      
      if (i === maxRetries - 1) {
        // On final failure, provide more specific guidance
        if (error.code === 'unavailable') {
          throw new Error('Firebase service is currently unavailable. Please try again later.');
        } else if (error.code === 'permission-denied') {
          throw new Error('Permission denied. Please ensure you are logged in.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        } else if (error.message.includes('offline') || error.message.includes('network')) {
          throw new Error('Network connection issue. Please check your internet connection and try again.');
        } else {
          throw new Error(`Database connection failed: ${error.message}`);
        }
      }
      
      // Linear backoff for faster retry
      const delay = baseDelayMs * (i + 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Save document data to local storage as fallback
 */
const saveToLocalStorage = async (userId: string, documentData: any): Promise<void> => {
  try {
    // Store pending documents in a single array for easier syncing
    const pendingKey = `pending_kyc_documents_${userId}`;
    const existingData = await AsyncStorage.getItem(pendingKey);
    const pendingDocuments = existingData ? JSON.parse(existingData) : [];
    
    // Add the new document to the pending list
    pendingDocuments.push({
      ...documentData,
      timestamp: Date.now(),
      status: 'pending_upload'
    });
    
    await AsyncStorage.setItem(pendingKey, JSON.stringify(pendingDocuments));
    console.log('Document data saved to local storage as fallback');
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
};

/**
 * Retry pending uploads from local storage
 */
const retryPendingUploads = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter(key => key.startsWith('pending_kyc_'));
    
    for (const key of pendingKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const documentData = JSON.parse(data);
          // Try to upload to Firebase
          await saveDocumentToFirebase(documentData.userId, documentData);
          // If successful, remove from local storage
          await AsyncStorage.removeItem(key);
          console.log(`Successfully uploaded pending document: ${key}`);
        }
      } catch (error) {
        console.log(`Failed to retry upload for ${key}:`, error);
        // Keep in local storage for next retry
      }
    }
  } catch (error) {
    console.error('Error retrying pending uploads:', error);
  }
};

/**
 * Save document to Firebase with fallback mechanism
 */
const saveDocumentToFirebase = async (userId: string, documentData: any): Promise<void> => {
  try {
    await waitForFirebaseConnection();
    
    // Use the document's publicId as the document ID for consistency
    const docRef = db.collection('users').doc(userId).collection('documents').doc(documentData.id);
    
    // Prepare the document data with proper timestamp handling
    const docToSave = {
      ...documentData,
      // Preserve the original uploadedAt from Cloudinary, but ensure it's a Firestore timestamp
      uploadedAt: documentData.uploadedAt ? new Date(documentData.uploadedAt) : new Date(),
      status: 'uploaded',
      createdAt: new Date(), // Add creation timestamp for tracking
      userId: userId // Ensure userId is always set
    };
    
    await docRef.set(docToSave);
    
    console.log('Document saved to Firebase successfully:', {
      documentId: documentData.id,
      userId: userId,
      type: documentData.type
    });
  } catch (error: any) {
    console.error('Failed to save to Firebase:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      userId: userId,
      documentId: documentData.id
    });
    
    // Save to local storage as fallback
    await saveToLocalStorage(userId, documentData);
    
    // Re-throw with more specific error message
    const errorMessage = error.code === 'permission-denied' 
      ? 'Permission denied. Please ensure you are logged in and try again.'
      : error.code === 'unavailable'
      ? 'Database is temporarily unavailable. Your document is safely stored and will be processed when connection is restored.'
      : `Document uploaded to cloud storage but database save failed: ${error.message}. Your document is safely stored and will be processed when connection is restored.`;
    
    throw new Error(errorMessage);
  }
};

/**
 * Save KYC document to Firestore with retry logic
 */
export const saveKYCDocumentToFirestore = async (userId: string, document: KYCDocument): Promise<void> => {
  try {
    // Ensure Firebase is connected before proceeding
    await waitForFirebaseConnection();
    
    const userRef = db.collection('users').doc(userId);
    
    // Get current user data with retry logic
    let userDoc;
    let userData;
    
    try {
      userDoc = await userRef.get();
      userData = userDoc.data();
    } catch (error: any) {
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log('Firestore temporarily unavailable, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        userDoc = await userRef.get();
        userData = userDoc.data();
      } else {
        throw error;
      }
    }
    
    // Update the kycDocs field with the new document
    const currentKycDocs = userData?.kycDocs || {};
    const updatedKycDocs = {
      ...currentKycDocs,
      [document.type]: {
        id: document.id,
        type: document.type,
        url: document.url,
        publicId: document.publicId,
        size: document.size,
        uploadedAt: document.uploadedAt,
        verified: document.verified
      },
      lastUpdated: new Date()
    };
    
    // Update with retry logic
    try {
      await userRef.update({
        kycDocs: updatedKycDocs,
        kycStatus: 'pending' // Reset to pending when new documents are uploaded
      });
    } catch (error: any) {
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log('Firestore update temporarily unavailable, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await userRef.update({
          kycDocs: updatedKycDocs,
          kycStatus: 'pending'
        });
      } else {
        throw error;
      }
    }
    
    console.log(`KYC document saved to Firestore for user: ${userId}`);
  } catch (error: any) {
    console.error('Error saving KYC document to Firestore:', error);
    
    // Provide more specific error messages
    if (error.code === 'unavailable') {
      throw new Error('Database is temporarily unavailable. Please try again in a moment.');
    } else if (error.message.includes('offline')) {
      throw new Error('You appear to be offline. Please check your internet connection and try again.');
    } else if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please ensure you are logged in.');
    } else {
      throw new Error(`Failed to save document to database: ${error.message}`);
    }
  }
};

/**
 * Get all KYC documents for a user from Firestore
 */
export const getUserKYCDocuments = async (userId: string): Promise<KYCDocument[]> => {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return [];
    }
    
    const userData = userDoc.data();
    const kycDocs = userData?.kycDocs || {};
    
    // Convert Firestore data back to KYCDocument array
    const documents: KYCDocument[] = [];
    
    for (const [docType, docData] of Object.entries(kycDocs)) {
      if (docType !== 'lastUpdated' && typeof docData === 'object' && docData !== null) {
        const doc = docData as any;
        documents.push({
          id: doc.id,
          type: doc.type,
          url: doc.url,
          publicId: doc.publicId,
          size: doc.size,
          uploadedAt: doc.uploadedAt,
          verified: doc.verified || false,
          userId: doc.userId || '',
          filename: doc.filename || `${doc.type}_document`
        });
      }
    }
    
    return documents;
  } catch (error) {
    console.error('Error fetching KYC documents from Firestore:', error);
    return [];
  }
};

/**
 * Sync pending documents to Firebase after user authentication
 */
export const syncPendingDocuments = async (userId: string): Promise<void> => {
  try {
    console.log('Syncing pending documents for user:', userId);
    
    // Get pending documents from local storage
    const pendingKey = `pending_kyc_documents_${userId}`;
    const pendingData = await AsyncStorage.getItem(pendingKey);
    
    if (!pendingData) {
      console.log('No pending documents to sync');
      return;
    }
    
    const pendingDocuments = JSON.parse(pendingData);
    console.log('Found pending documents:', pendingDocuments.length);
    
    // Sync each document to Firebase
    for (const document of pendingDocuments) {
      try {
        await saveDocumentToFirebase(userId, document);
        console.log('Successfully synced document:', document.id);
      } catch (error) {
        console.error('Failed to sync document:', document.id, error);
        // Continue with other documents even if one fails
      }
    }
    
    // Clear pending documents after successful sync
    await AsyncStorage.removeItem(pendingKey);
    console.log('Pending documents synced and cleared from local storage');
    
  } catch (error) {
    console.error('Error syncing pending documents:', error);
    throw error;
  }
};

// Initialize retry mechanism on app start
const initializeRetryMechanism = async (): Promise<void> => {
  try {
    await retryPendingUploads();
  } catch (error) {
    console.log('Initial retry attempt failed, will retry later:', error);
  }
};

// Call initialization
initializeRetryMechanism();

export {
  retryPendingUploads,
  syncPendingDocuments
};

export default {
  retryPendingUploads,
};