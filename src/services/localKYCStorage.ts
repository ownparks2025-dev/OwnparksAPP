import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface LocalKYCDocument {
  id: string;
  type: 'id' | 'address' | 'selfie';
  uri: string;
  fileName: string;
  uploadedAt: string;
  userId: string;
}

export interface UploadProgress {
  progress: number;
  isComplete: boolean;
}

const KYC_STORAGE_KEY = 'kyc_documents';
const KYC_FILES_DIR = `${FileSystem.documentDirectory}kyc_files/`;

// Ensure KYC directory exists
const ensureKYCDirectory = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(KYC_FILES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(KYC_FILES_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating KYC directory:', error);
    throw new Error('Failed to create storage directory');
  }
};

// Validate document file
export const validateDocumentFile = async (uri: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (!fileInfo.exists) {
      return { isValid: false, error: 'File does not exist' };
    }

    // Check file size (max 10MB)
    if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 10MB' };
    }

    // Check minimum file size (1KB to avoid empty files)
    if (fileInfo.size && fileInfo.size < 1024) {
      return { isValid: false, error: 'File appears to be corrupted or empty' };
    }

    // Check if it's an image (basic check)
    const extension = uri.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (!extension || !validExtensions.includes(extension)) {
      return { isValid: false, error: 'Please select a valid image file (JPG, PNG, GIF, BMP, WEBP)' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating file:', error);
    return { isValid: false, error: 'Failed to validate file' };
  }
};

// Validate stored document integrity
export const validateStoredDocument = async (document: LocalKYCDocument): Promise<{ isValid: boolean; error?: string }> => {
  try {
    // Handle test documents (for debugging)
    if (document.uri.startsWith('test://')) {
      console.log(`Skipping validation for test document: ${document.id}`);
      return { isValid: true }; // Consider test documents as valid for debugging
    }

    // Check if file still exists
    const fileInfo = await FileSystem.getInfoAsync(document.uri);
    
    if (!fileInfo.exists) {
      return { isValid: false, error: 'Document file is missing from storage' };
    }

    // Check if file is readable
    if (fileInfo.size === 0) {
      return { isValid: false, error: 'Document file is corrupted (0 bytes)' };
    }

    // Validate file extension matches expected image format
    const extension = document.uri.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (!extension || !validExtensions.includes(extension)) {
      return { isValid: false, error: 'Document file has invalid format' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating stored document:', error);
    return { isValid: false, error: 'Failed to validate stored document' };
  }
};

// Check and repair document storage integrity
export const checkDocumentStorageIntegrity = async (): Promise<{
  totalDocuments: number;
  validDocuments: number;
  corruptedDocuments: LocalKYCDocument[];
  repairedCount: number;
}> => {
  try {
    const allDocuments = await getStoredKYCDocuments();
    const corruptedDocuments: LocalKYCDocument[] = [];
    let validCount = 0;
    let repairedCount = 0;

    for (const document of allDocuments) {
      const validation = await validateStoredDocument(document);
      if (validation.isValid) {
        validCount++;
      } else {
        corruptedDocuments.push(document);
        console.warn(`Corrupted document found: ${document.id} - ${validation.error}`);
      }
    }

    // Remove corrupted documents from storage
    if (corruptedDocuments.length > 0) {
      const validDocuments = allDocuments.filter(doc => 
        !corruptedDocuments.some(corrupted => corrupted.id === doc.id)
      );
      await AsyncStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(validDocuments));
      repairedCount = corruptedDocuments.length;
    }

    return {
      totalDocuments: allDocuments.length,
      validDocuments: validCount,
      corruptedDocuments,
      repairedCount,
    };
  } catch (error) {
    console.error('Error checking storage integrity:', error);
    return {
      totalDocuments: 0,
      validDocuments: 0,
      corruptedDocuments: [],
      repairedCount: 0,
    };
  }
};

// Store KYC document locally
export const storeKYCDocument = async (
  userId: string,
  documentType: 'id' | 'address' | 'selfie',
  sourceUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; documentId?: string; localUri?: string; error?: string }> => {
  try {
    // Validate the file first
    const validation = await validateDocumentFile(sourceUri);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    onProgress?.({ progress: 10, isComplete: false });

    // Ensure directory exists
    await ensureKYCDirectory();
    
    onProgress?.({ progress: 30, isComplete: false });

    // Generate unique filename
    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop() || 'jpg';
    const fileName = `${userId}_${documentType}_${timestamp}.${extension}`;
    const destinationUri = `${KYC_FILES_DIR}${fileName}`;

    onProgress?.({ progress: 50, isComplete: false });

    // Copy file to local storage
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    onProgress?.({ progress: 70, isComplete: false });

    // Create document record
    const documentId = `${userId}_${documentType}_${timestamp}`;
    const document: LocalKYCDocument = {
      id: documentId,
      type: documentType,
      uri: destinationUri,
      fileName,
      uploadedAt: new Date().toISOString(),
      userId,
    };

    // Get existing documents
    const existingDocuments = await getStoredKYCDocuments();
    
    // Remove any existing document of the same type for this user
    const filteredDocuments = existingDocuments.filter(
      doc => !(doc.userId === userId && doc.type === documentType)
    );

    // Add new document
    const updatedDocuments = [...filteredDocuments, document];

    onProgress?.({ progress: 90, isComplete: false });

    // Save to AsyncStorage
    await AsyncStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(updatedDocuments));

    onProgress?.({ progress: 100, isComplete: true });

    return { 
      success: true, 
      documentId, 
      localUri: destinationUri 
    };

  } catch (error) {
    console.error('Error storing KYC document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to store document' 
    };
  }
};

// Get all stored KYC documents
export const getStoredKYCDocuments = async (): Promise<LocalKYCDocument[]> => {
  try {
    const documentsJson = await AsyncStorage.getItem(KYC_STORAGE_KEY);
    return documentsJson ? JSON.parse(documentsJson) : [];
  } catch (error) {
    console.error('Error getting stored documents:', error);
    return [];
  }
};

// Get KYC documents for a specific user
export const getUserKYCDocuments = async (userId: string): Promise<LocalKYCDocument[]> => {
  try {
    const allDocuments = await getStoredKYCDocuments();
    return allDocuments.filter(doc => doc.userId === userId);
  } catch (error) {
    console.error('Error getting user documents:', error);
    return [];
  }
};

// Get specific document by type for a user
export const getUserDocumentByType = async (
  userId: string, 
  documentType: 'id' | 'address' | 'selfie'
): Promise<LocalKYCDocument | null> => {
  try {
    const userDocuments = await getUserKYCDocuments(userId);
    return userDocuments.find(doc => doc.type === documentType) || null;
  } catch (error) {
    console.error('Error getting document by type:', error);
    return null;
  }
};

// Delete a KYC document
export const deleteKYCDocument = async (documentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const allDocuments = await getStoredKYCDocuments();
    const documentToDelete = allDocuments.find(doc => doc.id === documentId);
    
    if (!documentToDelete) {
      return { success: false, error: 'Document not found' };
    }

    // Delete the file
    try {
      const fileInfo = await FileSystem.getInfoAsync(documentToDelete.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(documentToDelete.uri);
      }
    } catch (fileError) {
      console.warn('Could not delete file:', fileError);
      // Continue with removing from storage even if file deletion fails
    }

    // Remove from storage
    const updatedDocuments = allDocuments.filter(doc => doc.id !== documentId);
    await AsyncStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(updatedDocuments));

    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document' 
    };
  }
};

// Clear all KYC documents (for testing/debugging)
export const clearAllKYCDocuments = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Clear AsyncStorage
    await AsyncStorage.removeItem(KYC_STORAGE_KEY);
    
    // Clear files directory
    try {
      const dirInfo = await FileSystem.getInfoAsync(KYC_FILES_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(KYC_FILES_DIR);
      }
    } catch (fileError) {
      console.warn('Could not clear files directory:', fileError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing documents:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to clear documents' 
    };
  }
};

// Create test documents for debugging
export const createTestKYCDocuments = async (): Promise<void> => {
  try {
    console.log('Creating test documents...');
    const testDocuments: LocalKYCDocument[] = [
      {
        id: 'test-doc-1',
        userId: '8T9IybHFWDcicWjl83qbsTngnIt1',
        type: 'id',
        uri: 'test://id-document.jpg',
        fileName: 'test_id_document.jpg',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'test-doc-2',
        userId: '8T9IybHFWDcicWjl83qbsTngnIt1',
        type: 'address',
        uri: 'test://address-document.jpg',
        fileName: 'test_address_document.jpg',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'test-doc-3',
        userId: 'kM4dQlHf0mfBs1LaMYtkYdq5Dix2',
        type: 'id',
        uri: 'test://id-document-2.jpg',
        fileName: 'test_id_document_2.jpg',
        uploadedAt: new Date().toISOString()
      }
    ];

    console.log('Storing test documents:', testDocuments);
    await AsyncStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(testDocuments));
    
    // Verify storage
    const stored = await AsyncStorage.getItem(KYC_STORAGE_KEY);
    console.log('Stored data verification:', stored);
    
    console.log('Test KYC documents created successfully');
  } catch (error) {
    console.error('Error creating test documents:', error);
  }
};



// Debug function to check what's in storage
export const debugStorageContents = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(KYC_STORAGE_KEY);
    console.log('Raw storage contents:', stored);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('Parsed storage contents:', parsed);
      console.log('Number of documents:', parsed.length);
    } else {
      console.log('No documents found in storage');
    }
  } catch (error) {
    console.error('Error debugging storage:', error);
  }
};

// Get storage statistics
export const getKYCStorageStats = async (): Promise<{
  totalDocuments: number;
  totalSize: number;
  documentsByType: Record<string, number>;
}> => {
  try {
    const documents = await getStoredKYCDocuments();
    let totalSize = 0;
    const documentsByType: Record<string, number> = { id: 0, address: 0, selfie: 0 };

    for (const doc of documents) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(doc.uri);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
        documentsByType[doc.type]++;
      } catch (error) {
        console.warn('Could not get file info for:', doc.uri);
      }
    }

    return {
      totalDocuments: documents.length,
      totalSize,
      documentsByType,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalDocuments: 0,
      totalSize: 0,
      documentsByType: { id: 0, address: 0, selfie: 0 },
    };
  }
};