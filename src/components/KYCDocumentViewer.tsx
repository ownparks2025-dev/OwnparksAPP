import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { KYCDocument, getOptimizedKYCUrl, getKYCThumbnail } from '../services/cloudinaryStorage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface KYCDocumentViewerProps {
  documents: KYCDocument[];
  userName: string;
  onVerifyDocument?: (documentType: string, verified: boolean) => void;
  onRejectDocument?: (documentType: string, reason: string) => void;
}

const KYCDocumentViewer: React.FC<KYCDocumentViewerProps> = ({
  documents,
  userName,
  onVerifyDocument,
  onRejectDocument,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [documentValidation, setDocumentValidation] = useState<{[key: string]: {isValid: boolean, fileSize?: number, error?: string}}>({});
  const [validatingDocuments, setValidatingDocuments] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Debug document IDs to ensure they are unique and valid
  React.useEffect(() => {
    const documentIds = documents.map(doc => doc.id);
    const uniqueIds = new Set(documentIds);
    
    if (documentIds.length !== uniqueIds.size) {
      console.warn('KYCDocumentViewer: Duplicate document IDs found:', documentIds);
    }
    
    const invalidIds = documentIds.filter(id => !id || id === undefined || id === null);
    if (invalidIds.length > 0) {
      console.warn('KYCDocumentViewer: Invalid document IDs found:', invalidIds);
    }
  }, [documents]);

  // Validate documents when component loads
  useEffect(() => {
    validateAllDocuments();
  }, [documents]);

  const validateAllDocuments = async () => {
    setValidatingDocuments(true);
    const validationResults: {[key: string]: {isValid: boolean, fileSize?: number, error?: string}} = {};
    
    for (const doc of documents) {
      try {
        // Handle test documents (for debugging)
        if (doc.url && doc.url.startsWith('test://')) {
          validationResults[doc.id] = {
            isValid: true,
            fileSize: 1024000, // Mock file size for test documents
          };
          continue;
        }

        // Check if we have either URL or publicId to display the document
        if (doc.url || doc.publicId) {
          validationResults[doc.id] = {
            isValid: true,
            fileSize: doc.size || 0
          };
        } else {
          validationResults[doc.id] = {
            isValid: false,
            error: 'Document URL missing'
          };
        }
      } catch (error) {
        validationResults[doc.id] = {
          isValid: false,
          error: 'Validation failed'
        };
      }
    }
    
    setDocumentValidation(validationResults);
    setValidatingDocuments(false);
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'id':
        return 'ID Document';
      case 'address':
        return 'Address Proof';
      case 'income':
        return 'Income Proof';
      default:
        return 'Document';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'id':
        return '🆔';
      case 'address':
        return '🏠';
      case 'selfie':
        return '🤳';
      default:
        return '📄';
    }
  };

  const openDocument = (document: KYCDocument) => {
    setSelectedDocument(document);
    setModalVisible(true);
    setImageLoading(true);
    setImageError(false);
    
    // For test documents, show a placeholder message
    if (document.url.startsWith('test://')) {
      console.log('Opening test document:', document.id);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDocument(null);
    setImageLoading(false);
    setImageError(false);
  };

  const handleVerifyDocument = () => {
    if (selectedDocument && onVerifyDocument) {
      Alert.alert(
        'Verify Document',
        `Are you sure you want to verify this ${getDocumentTypeLabel(selectedDocument.type)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify',
            onPress: () => {
              onVerifyDocument(selectedDocument.type, true);
              closeModal();
            },
          },
        ]
      );
    }
  };

  const handleRejectDocument = () => {
    if (selectedDocument && onRejectDocument) {
      Alert.prompt(
        'Reject Document',
        `Please provide a reason for rejecting this ${getDocumentTypeLabel(selectedDocument.type)}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            onPress: (reason) => {
              if (reason && reason.trim()) {
                onRejectDocument(selectedDocument.type, reason.trim());
                closeModal();
              } else {
                Alert.alert('Error', 'Please provide a reason for rejection');
              }
            },
          },
        ],
        'plain-text',
        '',
        'default'
      );
    }
  };

  // Create sample documents if no real documents are available
  const displayDocuments = documents && documents.length > 0 ? documents : [
    {
      id: 'sample-id-1',
      type: 'id' as const,
      url: 'test://sample-id-document',
      publicId: '',
      uploadedAt: new Date().toISOString(),
      verified: false,
      userId: 'sample',
      filename: 'sample-id.jpg',
      size: 1024000
    },
    {
      id: 'sample-address-1',
      type: 'address' as const,
      url: 'test://sample-address-document',
      publicId: '',
      uploadedAt: new Date().toISOString(),
      verified: false,
      userId: 'sample',
      filename: 'sample-address.jpg',
      size: 2048000
    },
    {
      id: 'sample-selfie-1',
      type: 'selfie' as const,
      url: 'test://sample-selfie-document',
      publicId: '',
      uploadedAt: new Date().toISOString(),
      verified: false,
      userId: 'sample',
      filename: 'sample-selfie.jpg',
      size: 1536000
    }
  ];

  if (!documents || documents.length === 0) {
    console.log('No real documents found, showing sample documents for testing');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KYC Documents for {userName}</Text>
      
      <View style={styles.documentsGrid}>
        {displayDocuments.map((document, index) => {
          const validation = documentValidation[document.id];
          return (
            <TouchableOpacity
              key={`${document.id || 'doc'}-${index}-${document.type || 'unknown'}`}
              style={[
                styles.documentCard,
                !validation?.isValid && styles.documentCardError
              ]}
              onPress={() => validation?.isValid ? openDocument(document) : null}
              disabled={!validation?.isValid}
            >
              <View style={styles.documentHeader}>
                <Text style={styles.documentIcon}>{getDocumentIcon(document.type)}</Text>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentType}>{getDocumentTypeLabel(document.type)}</Text>
                  <Text style={styles.uploadDate}>
                    Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                  </Text>
                  {validation?.fileSize && (
                    <Text style={styles.fileSize}>
                      Size: {formatFileSize(validation.fileSize)}
                    </Text>
                  )}
                </View>
                <View style={styles.validationStatus}>
                  {validatingDocuments ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : validation?.isValid ? (
                    <Text style={styles.validIcon}>✓</Text>
                  ) : (
                    <Text style={styles.invalidIcon}>✗</Text>
                  )}
                </View>
              </View>
              {!validation?.isValid && validation?.error && (
                <Text style={styles.errorText}>{validation.error}</Text>
              )}
              <Text style={[
                styles.viewText,
                !validation?.isValid && styles.viewTextDisabled
              ]}>
                {validation?.isValid ? 'Tap to view' : 'File unavailable'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Document Viewer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDocument ? getDocumentTypeLabel(selectedDocument.type) : ''}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imageContainer}>
              {selectedDocument && (
                <>
                  {imageLoading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#007AFF" />
                      <Text style={styles.loadingText}>Loading image...</Text>
                    </View>
                  )}
                  {imageError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorIcon}>⚠️</Text>
                      <Text style={styles.modalErrorText}>Failed to load image</Text>
                      <Text style={styles.errorSubtext}>The image file may be corrupted or missing</Text>
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => {
                          setImageError(false);
                          setImageLoading(true);
                        }}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : selectedDocument.url.startsWith('test://') ? (
                    <View style={styles.testDocumentContainer}>
                      <Text style={styles.testDocumentIcon}>📄</Text>
                      <Text style={styles.testDocumentTitle}>Test Document</Text>
                      <Text style={styles.testDocumentSubtitle}>
                        {getDocumentTypeLabel(selectedDocument.type)}
                      </Text>
                      <Text style={styles.testDocumentDescription}>
                        This is a demo document for testing purposes.{'\n'}
                        In a real scenario, the actual document image would be displayed here.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.imageScrollView}
                      contentContainerStyle={styles.imageScrollContent}
                      maximumZoomScale={5}
                      minimumZoomScale={0.5}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      centerContent={true}
                    >
                      <Image
                        source={{ 
                          uri: (() => {
                            if (selectedDocument.url?.startsWith('test://')) {
                              return 'https://via.placeholder.com/200x200/cccccc/666666?text=Sample+Document';
                            }
                            
                            let imageUri = '';
                            if (selectedDocument.publicId) {
                              imageUri = getOptimizedKYCUrl(selectedDocument.publicId, screenWidth * 0.9, screenHeight * 0.6);
                              console.log('Generated optimized URL from publicId:', imageUri);
                            } else if (selectedDocument.url) {
                              imageUri = selectedDocument.url;
                              console.log('Using direct URL:', imageUri);
                            } else {
                              imageUri = 'https://via.placeholder.com/200x200/cccccc/666666?text=No+Image';
                              console.log('No URL or publicId available, using placeholder');
                            }
                            
                            console.log('Document details:', {
                              id: selectedDocument.id,
                              type: selectedDocument.type,
                              url: selectedDocument.url,
                              publicId: selectedDocument.publicId,
                              finalUri: imageUri
                            });
                            
                            return imageUri;
                          })()
                        }}
                        style={styles.documentImage}
                        resizeMode="contain"
                        onLoad={(event) => {
                          setImageLoading(false);
                          const { width, height } = event.nativeEvent.source;
                          setImageDimensions({ width, height });
                          console.log('Image loaded successfully:', { width, height });
                        }}
                        onError={(error) => {
                          setImageLoading(false);
                          setImageError(true);
                          console.error('Image failed to load:', error);
                          console.error('Failed image URI:', selectedDocument.url || selectedDocument.publicId);
                        }}
                      />
                    </ScrollView>
                  )}
                </>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRejectDocument}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.verifyButton]}
                onPress={handleVerifyDocument}
              >
                <Text style={styles.actionButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentCardError: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
    opacity: 0.7,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  validationStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  validIcon: {
    fontSize: 18,
    color: '#38a169',
    fontWeight: 'bold',
  },
  invalidIcon: {
    fontSize: 18,
    color: '#e53e3e',
    fontWeight: 'bold',
  },
  fileSize: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    marginTop: 4,
    fontStyle: 'italic',
  },
  viewTextDisabled: {
    color: '#a0aec0',
  },
  testDocumentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  testDocumentIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  testDocumentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  testDocumentSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 16,
    textAlign: 'center',
  },
  testDocumentDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  documentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  uploadDate: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  viewText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.9,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalErrorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KYCDocumentViewer;