import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { KYCDocument } from '../services/cloudinaryStorage';

export interface StorageDebugInfo {
  totalDocuments: number;
  documentsMetadata: KYCDocument[];
  fileSystemInfo: {
    [documentId: string]: {
      exists: boolean;
      size?: number;
      uri: string;
      error?: string;
    };
  };
  storageDirectory: {
    exists: boolean;
    contents?: string[];
    error?: string;
  };
}

/**
 * Comprehensive storage debugging utility
 * This helps diagnose why images might not be visible
 */
export const debugKYCStorage = async (): Promise<StorageDebugInfo> => {
  const debugInfo: StorageDebugInfo = {
    totalDocuments: 0,
    documentsMetadata: [],
    fileSystemInfo: {},
    storageDirectory: {
      exists: false,
    },
  };

  try {
    // 1. Check AsyncStorage metadata
    console.log('🔍 Debugging KYC Storage...');
    const documentsJson = await AsyncStorage.getItem('kyc_documents');
    
    if (documentsJson) {
      debugInfo.documentsMetadata = JSON.parse(documentsJson);
      debugInfo.totalDocuments = debugInfo.documentsMetadata.length;
      console.log(`📊 Found ${debugInfo.totalDocuments} documents in metadata`);
    } else {
      console.log('📊 No documents found in AsyncStorage');
    }

    // 2. Check storage directory
    const kycDir = `${FileSystem.documentDirectory}kyc_files/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(kycDir);
      debugInfo.storageDirectory.exists = dirInfo.exists;
      
      if (dirInfo.exists) {
        console.log('📁 KYC directory exists');
        try {
          const dirContents = await FileSystem.readDirectoryAsync(kycDir);
          debugInfo.storageDirectory.contents = dirContents;
          console.log(`📁 Directory contains ${dirContents.length} files:`, dirContents);
        } catch (readError) {
          debugInfo.storageDirectory.error = `Cannot read directory: ${readError}`;
          console.error('❌ Cannot read KYC directory:', readError);
        }
      } else {
        console.log('❌ KYC directory does not exist');
      }
    } catch (dirError) {
      debugInfo.storageDirectory.error = `Directory check failed: ${dirError}`;
      console.error('❌ Directory check failed:', dirError);
    }

    // 3. Check each document file
    for (const doc of debugInfo.documentsMetadata) {
      console.log(`🔍 Checking document: ${doc.id} (${doc.type})`);
      console.log(`📍 URI: ${doc.url}`);
      
      try {
        if (doc.url.startsWith('test://')) {
          debugInfo.fileSystemInfo[doc.id] = {
            exists: false,
            uri: doc.url,
            error: 'Test document (fake URI)',
          };
          console.log(`🧪 Test document: ${doc.id}`);
        } else {
          const fileInfo = await FileSystem.getInfoAsync(doc.url);
          debugInfo.fileSystemInfo[doc.id] = {
            exists: fileInfo.exists,
            size: (fileInfo as any).size || 0,
            uri: doc.url,
          };
          
          if (fileInfo.exists) {
            console.log(`✅ File exists: ${doc.filename} (${fileInfo.size || 0} bytes)`);
          } else {
            console.log(`❌ File missing: ${doc.filename}`);
            debugInfo.fileSystemInfo[doc.id].error = 'File not found';
          }
        }
      } catch (fileError) {
        debugInfo.fileSystemInfo[doc.id] = {
          exists: false,
          uri: doc.url,
          error: `File check failed: ${fileError}`,
        };
        console.error(`❌ Error checking file ${doc.id}:`, fileError);
      }
    }

    // 4. Summary
    const validFiles = Object.values(debugInfo.fileSystemInfo).filter(info => info.exists).length;
    const invalidFiles = debugInfo.totalDocuments - validFiles;
    
    console.log('📋 STORAGE DEBUG SUMMARY:');
    console.log(`   Total documents in metadata: ${debugInfo.totalDocuments}`);
    console.log(`   Valid files on disk: ${validFiles}`);
    console.log(`   Missing/invalid files: ${invalidFiles}`);
    console.log(`   Storage directory exists: ${debugInfo.storageDirectory.exists}`);
    
    if (debugInfo.storageDirectory.contents) {
      console.log(`   Files in directory: ${debugInfo.storageDirectory.contents.length}`);
    }

    return debugInfo;
  } catch (error) {
    console.error('❌ Storage debugging failed:', error);
    throw error;
  }
};

/**
 * Clean up corrupted or orphaned files
 */
export const cleanupKYCStorage = async (): Promise<{
  removedDocuments: number;
  removedFiles: number;
  errors: string[];
}> => {
  const result = {
    removedDocuments: 0,
    removedFiles: 0,
    errors: [] as string[],
  };

  try {
    console.log('🧹 Starting KYC storage cleanup...');
    
    // Get current debug info
    const debugInfo = await debugKYCStorage();
    
    // Remove documents with missing files from metadata
    const validDocuments = debugInfo.documentsMetadata.filter(doc => {
      const fileInfo = debugInfo.fileSystemInfo[doc.id];
      return fileInfo && fileInfo.exists;
    });
    
    result.removedDocuments = debugInfo.documentsMetadata.length - validDocuments.length;
    
    if (result.removedDocuments > 0) {
      await AsyncStorage.setItem('kyc_documents', JSON.stringify(validDocuments));
      console.log(`🗑️ Removed ${result.removedDocuments} invalid document records`);
    }

    // Remove orphaned files (files not referenced in metadata)
    if (debugInfo.storageDirectory.exists && debugInfo.storageDirectory.contents) {
      const referencedFiles = validDocuments.map(doc => doc.filename);
      const orphanedFiles = debugInfo.storageDirectory.contents.filter(
        file => !referencedFiles.includes(file)
      );
      
      const kycDir = `${FileSystem.documentDirectory}kyc_files/`;
      for (const orphanedFile of orphanedFiles) {
        try {
          await FileSystem.deleteAsync(`${kycDir}${orphanedFile}`);
          result.removedFiles++;
          console.log(`🗑️ Removed orphaned file: ${orphanedFile}`);
        } catch (error) {
          result.errors.push(`Failed to delete ${orphanedFile}: ${error}`);
        }
      }
    }

    console.log('✅ Storage cleanup completed');
    return result;
  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    result.errors.push(`Cleanup failed: ${error}`);
    return result;
  }
};

/**
 * Export storage debug info as a readable string
 */
export const exportDebugInfo = (debugInfo: StorageDebugInfo): string => {
  let report = '=== KYC STORAGE DEBUG REPORT ===\n\n';
  
  report += `Total Documents: ${debugInfo.totalDocuments}\n`;
  report += `Storage Directory Exists: ${debugInfo.storageDirectory.exists}\n`;
  
  if (debugInfo.storageDirectory.contents) {
    report += `Files in Directory: ${debugInfo.storageDirectory.contents.length}\n`;
    report += `Directory Contents: ${debugInfo.storageDirectory.contents.join(', ')}\n`;
  }
  
  if (debugInfo.storageDirectory.error) {
    report += `Directory Error: ${debugInfo.storageDirectory.error}\n`;
  }
  
  report += '\n=== DOCUMENT DETAILS ===\n';
  
  debugInfo.documentsMetadata.forEach(doc => {
    const fileInfo = debugInfo.fileSystemInfo[doc.id];
    report += `\nDocument ID: ${doc.id}\n`;
    report += `  Type: ${doc.type}\n`;
    report += `  User ID: ${doc.userId}\n`;
    report += `  File Name: ${doc.filename}\n`;
    report += `  URI: ${doc.url}\n`;
    report += `  Uploaded: ${doc.uploadedAt}\n`;
    report += `  File Exists: ${fileInfo?.exists || false}\n`;
    
    if (fileInfo?.size) {
      report += `  File Size: ${fileInfo.size} bytes\n`;
    }
    
    if (fileInfo?.error) {
      report += `  Error: ${fileInfo.error}\n`;
    }
  });
  
  return report;
};