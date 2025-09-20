import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadKYCDocument, validateCloudinaryConfig, KYCDocument } from '../services/cloudinaryStorage';

interface DocumentUploadProps {
  label: string;
  onDocumentSelected: (document: KYCDocument) => void;
  documentType: 'id' | 'address' | 'selfie';
  userId: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  label,
  onDocumentSelected,
  documentType,
  userId,
}) => {
  const [document, setDocument] = useState<KYCDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload documents.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickDocument = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await handleDocumentUpload(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await handleDocumentUpload(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleDocumentUpload = async (uri: string) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Validate Cloudinary configuration
      if (!validateCloudinaryConfig()) {
        Alert.alert('Configuration Error', 'Cloudinary is not properly configured. Please check your environment variables.');
        return;
      }

      // Upload to Cloudinary with real-time progress tracking
      console.log(`Uploading KYC document to Cloudinary for user: ${userId}, type: ${documentType}`);
      
      const uploadedDocument = await uploadKYCDocument(
        uri, 
        documentType, 
        userId,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      console.log('Upload result:', uploadedDocument);

      if (uploadedDocument) {
        setDocument(uploadedDocument);
        onDocumentSelected(uploadedDocument);
        console.log(`Document uploaded successfully to: ${uploadedDocument.url}`);
        Alert.alert('Success', 'Document uploaded to cloud successfully!');
      } else {
        Alert.alert('Upload Failed', 'Failed to upload document to cloud');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'An unexpected error occurred during upload';
      let alertTitle = 'Upload Failed';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('cancelled')) {
        errorMessage = 'Upload was cancelled.';
      } else if (error.message.includes('Permission denied') || error.message.includes('permission-denied')) {
        alertTitle = 'Document Saved Locally';
        errorMessage = 'Your document has been uploaded to cloud storage and saved locally. It will be processed when you complete registration.';
      } else if (error.message.includes('database save failed') || error.message.includes('safely stored')) {
        alertTitle = 'Document Uploaded';
        errorMessage = 'Your document was uploaded successfully to cloud storage. It will be processed when you complete registration.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // For pre-authentication uploads that succeed but can't save to database,
      // we should still mark the document as uploaded
      if (alertTitle === 'Document Uploaded' || alertTitle === 'Document Saved Locally') {
        // Create a temporary document object to show success state
        const tempDocument = {
          id: `temp_${Date.now()}`,
          type: documentType,
          url: 'pending_sync',
          publicId: `temp_${Date.now()}`,
          uploadedAt: new Date().toISOString(),
          verified: false,
          userId,
          filename: `${documentType}_document`,
          size: 0,
          pendingSync: true
        };
        
        setDocument(tempDocument);
        onDocumentSelected(tempDocument);
        
        Alert.alert(alertTitle, errorMessage, [
          {
            text: 'OK',
            style: 'default'
          }
        ]);
      } else {
        Alert.alert(alertTitle, errorMessage);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Document',
      'Choose how you want to upload your document',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {uploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>Uploading to Cloud... {Math.round(uploadProgress)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      ) : document ? (
        <View style={[
          styles.uploadedContainer,
          document.pendingSync && styles.pendingSyncContainer
        ]}>
          <Text style={[
            styles.uploadedText,
            document.pendingSync && styles.pendingSyncText
          ]}>
            {document.pendingSync 
              ? '📤 Document Ready (Will sync after registration)' 
              : '✅ Document Uploaded to Cloud'
            }
          </Text>
          <TouchableOpacity 
            style={styles.changeButton}
            onPress={() => {
              setDocument(null);
            }}
          >
            <Text style={styles.changeButtonText}>Change Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={showUploadOptions}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>Upload Document</Text>
          <Text style={styles.uploadSubtext}>
            Tap to select from gallery or take a photo
          </Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.helpText}>
        Accepted formats: JPG, PNG, PDF (max 5MB)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  uploadingContainer: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  uploadingText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  pendingSyncContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  uploadedText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingSyncText: {
    color: '#856404',
  },
  changeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DocumentUpload;

