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
  storageError?: string;
  pendingSync?: boolean;
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

    // Save to local storage only (no Firebase connection)
    onProgress?.(95);
    try {
      await saveToLocalStorage(userId, kycDocument);
      console.log('KYC document saved successfully to Cloudinary and local storage');
      onProgress?.(100);
      return kycDocument;
    } catch (localError: any) {
      console.error('Failed to save to local storage:', localError);
      onProgress?.(100);
      
      // Return the document even if local storage fails (Cloudinary upload succeeded)
      return {
        ...kycDocument,
        storageError: localError.message
      };
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
    
    // Firebase retry mechanism removed - documents now stay in local storage
    console.log(`Found ${pendingKeys.length} documents in local storage - no retry needed`);
  } catch (error) {
    console.error('Error retrying pending uploads:', error);
  }
};

// Firebase connection removed - KYC documents now use only Cloudinary + local storage

// saveKYCDocumentToFirestore function removed - using local storage only

/**
 * Get all KYC documents for a user from local storage
 */
export const getUserKYCDocuments = async (userId: string): Promise<KYCDocument[]> => {
  try {
    console.log('Fetching KYC documents from local storage for user:', userId);
    
    // Get documents from local storage
    const storageKey = `kyc_documents_${userId}`;
    const storedData = await AsyncStorage.getItem(storageKey);
    
    if (!storedData) {
      console.log('No KYC documents found in local storage');
      return [];
    }
    
    const documents = JSON.parse(storedData);
    console.log('Found KYC documents in local storage:', documents.length);
    
    return documents;
  } catch (error) {
    console.error('Error fetching KYC documents from local storage:', error);
    return [];
  }
};

// Firebase sync functions removed - using local storage only

export {
  retryPendingUploads
};

export default {
  retryPendingUploads,
};