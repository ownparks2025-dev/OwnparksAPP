import { storage } from './firebase';
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface DocumentUploadResult {
  downloadURL: string;
  fileName: string;
  uploadedAt: Date;
}

/**
 * Upload a document to Firebase Storage
 * @param uri Local file URI from ImagePicker
 * @param userId User ID for organizing files
 * @param documentType Type of document (idProof, addressProof, etc.)
 * @param onProgress Optional progress callback
 * @returns Promise with download URL and metadata
 */
export const uploadKYCDocument = async (
  uri: string,
  userId: string,
  documentType: 'idProof' | 'addressProof' | 'selfie',
  onProgress?: (progress: UploadProgress) => void
): Promise<DocumentUploadResult> => {
  try {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = uri.split('.').pop() || 'jpg';
    const fileName = `${documentType}_${timestamp}.${fileExtension}`;
    const storagePath = `kyc-documents/${userId}/${fileName}`;

    // Create storage reference
    const storageRef = storage.ref(storagePath);

    // Convert URI to blob for upload
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload with progress tracking
    const uploadTask = storageRef.put(blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          if (onProgress) {
            const progress: UploadProgress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            };
            onProgress(progress);
          }
        },
        (error) => {
          // Handle upload errors
          console.error('Upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            resolve({
              downloadURL,
              fileName,
              uploadedAt: new Date(),
            });
          } catch (error: any) {
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        }
      );
    });
  } catch (error: any) {
    throw new Error(`Document upload failed: ${error.message}`);
  }
};

/**
 * Delete a document from Firebase Storage
 * @param downloadURL The download URL of the document to delete
 */
export const deleteKYCDocument = async (downloadURL: string): Promise<void> => {
  try {
    const storageRef = storage.refFromURL(downloadURL);
    await storageRef.delete();
  } catch (error: any) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

/**
 * Get all KYC documents for a user
 * @param userId User ID
 * @returns Promise with list of document URLs
 */
export const getUserKYCDocuments = async (userId: string): Promise<string[]> => {
  try {
    const folderRef = storage.ref(`kyc-documents/${userId}`);
    const result = await folderRef.listAll();
    
    const downloadURLs = await Promise.all(
      result.items.map(item => item.getDownloadURL())
    );
    
    return downloadURLs;
  } catch (error: any) {
    throw new Error(`Failed to get user documents: ${error.message}`);
  }
};

/**
 * Validate file before upload
 * @param uri File URI
 * @returns Promise<boolean>
 */
export const validateDocumentFile = async (uri: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'File does not exist' };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (fileInfo.size && fileInfo.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' };
    }

    // Check file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const fileExtension = uri.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return { valid: false, error: 'Only JPG, PNG, and PDF files are allowed' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `File validation failed: ${error.message}` };
  }
};