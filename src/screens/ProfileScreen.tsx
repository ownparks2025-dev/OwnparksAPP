import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NavigationProps } from '../types';
import { auth } from '../services/firebase';
import { getUserProfile } from '../services/firebase';
import { User } from '../types';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  panNumber: string;
  aadharNumber: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_started';
  profileImage?: string;
  documents: {
    pan: { uploaded: boolean; verified: boolean; url?: string };
    aadhar: { uploaded: boolean; verified: boolean; url?: string };
    selfie: { uploaded: boolean; verified: boolean; url?: string };
  };
  accountCreated: string;
  lastLogin: string;
}

const ProfileScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userData = await getUserProfile(currentUser.uid);
        if (userData) {
          // Helper function to format dates properly
          const formatDate = (dateValue: any): string => {
            if (!dateValue) return 'Not available';
            
            try {
              let date: Date;
              
              // Handle Firestore Timestamp
              if (dateValue && typeof dateValue.toDate === 'function') {
                date = dateValue.toDate();
              }
              // Handle JavaScript Date object
              else if (dateValue instanceof Date) {
                date = dateValue;
              }
              // Handle string or number timestamp
              else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
                date = new Date(dateValue);
              }
              // Handle Firestore Timestamp object structure
              else if (dateValue && dateValue.seconds) {
                date = new Date(dateValue.seconds * 1000);
              }
              else {
                return 'Invalid date';
              }
              
              // Check if date is valid
              if (isNaN(date.getTime())) {
                return 'Invalid date';
              }
              
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } catch (error) {
              console.error('Error formatting date:', error);
              return 'Invalid date';
            }
          };

          // Convert Firebase user data to ProfileScreen format
          const profileData: UserProfile = {
            id: userData.uid,
            name: userData.name || 'User',
            email: userData.email || '',
            phone: userData.phone || '',
            dateOfBirth: userData.dateOfBirth || '',
            address: userData.address || '',
            panNumber: userData.panNumber || '',
            aadharNumber: userData.aadharNumber || '',
            kycStatus: userData.kycStatus || 'not_started',
            documents: {
              pan: { uploaded: !!userData.kycDocs?.idProof, verified: userData.kycStatus === 'verified' },
              aadhar: { uploaded: !!userData.kycDocs?.addressProof, verified: userData.kycStatus === 'verified' },
              selfie: { uploaded: !!userData.kycDocs?.selfie, verified: userData.kycStatus === 'verified' },
            },
            accountCreated: formatDate(userData.createdAt),
            lastLogin: formatDate(userData.lastLoginAt) || formatDate(new Date()),
          };
          setUserProfile(profileData);
        }
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'rejected':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getKycStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'KYC Verified ✓';
      case 'pending':
        return 'KYC Pending Review';
      case 'rejected':
        return 'KYC Rejected';
      default:
        return 'KYC Not Started';
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    setUserProfile(prev => ({
      ...prev,
      [editingField]: editValue,
    }));
    setEditModalVisible(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleDocumentUpload = (docType: string) => {
    Alert.alert(
      'Upload Document',
      `Upload your ${docType} document`,
      [
        { text: 'Camera', onPress: () => console.log('Camera selected') },
        { text: 'Gallery', onPress: () => console.log('Gallery selected') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => navigation.navigate('Landing')
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & KYC</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditField('name', userProfile.name)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Profile Overview */}
        <View style={styles.profileOverview}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {userProfile.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => handleDocumentUpload('Profile Picture')}
            >
              <Text style={styles.cameraButtonText}>📷</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileEmail}>{userProfile.email}</Text>
            
            <View style={styles.kycStatusContainer}>
              <View style={[styles.kycStatusBadge, { backgroundColor: getKycStatusColor(userProfile.kycStatus) }]}>
                <Text style={styles.kycStatusText}>
                  {getKycStatusText(userProfile.kycStatus)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handleEditField('phone', userProfile.phone)}
            >
              <View style={styles.infoLeft}>
                <Text style={styles.infoIcon}>📞</Text>
                <View>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userProfile.phone}</Text>
                </View>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handleEditField('dateOfBirth', userProfile.dateOfBirth)}
            >
              <View style={styles.infoLeft}>
                <Text style={styles.infoIcon}>📅</Text>
                <View>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{userProfile.dateOfBirth}</Text>
                </View>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handleEditField('address', userProfile.address)}
            >
              <View style={styles.infoLeft}>
                <Text style={styles.infoIcon}>🏠</Text>
                <View>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {userProfile.address}
                  </Text>
                </View>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KYC Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Documents</Text>
          
          <View style={styles.documentsCard}>
            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => handleDocumentUpload('PAN Card')}
            >
              <View style={styles.documentLeft}>
                <Text style={styles.documentIcon}>🆔</Text>
                <View>
                  <Text style={styles.documentLabel}>PAN Card</Text>
                  <Text style={styles.documentNumber}>{userProfile.panNumber}</Text>
                </View>
              </View>
              <View style={styles.documentStatus}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: userProfile.documents.pan.verified ? '#34C759' : '#FF9500' }
                ]} />
                <Text style={styles.documentStatusText}>
                  {userProfile.documents.pan.verified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => handleDocumentUpload('Aadhar Card')}
            >
              <View style={styles.documentLeft}>
                <Text style={styles.documentIcon}>🔢</Text>
                <View>
                  <Text style={styles.documentLabel}>Aadhar Card</Text>
                  <Text style={styles.documentNumber}>{userProfile.aadharNumber}</Text>
                </View>
              </View>
              <View style={styles.documentStatus}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: userProfile.documents.aadhar.verified ? '#34C759' : '#FF9500' }
                ]} />
                <Text style={styles.documentStatusText}>
                  {userProfile.documents.aadhar.verified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => handleDocumentUpload('Selfie')}
            >
              <View style={styles.documentLeft}>
                <Text style={styles.documentIcon}>🤳</Text>
                <View>
                  <Text style={styles.documentLabel}>Selfie Verification</Text>
                  <Text style={styles.documentNumber}>Photo with ID</Text>
                </View>
              </View>
              <View style={styles.documentStatus}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: userProfile.documents.selfie.verified ? '#34C759' : '#FF3B30' }
                ]} />
                <Text style={styles.documentStatusText}>
                  {userProfile.documents.selfie.verified ? 'Verified' : 'Rejected'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>User ID</Text>
              <Text style={styles.accountValue}>{userProfile.id}</Text>
            </View>
            
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Account Created</Text>
              <Text style={styles.accountValue}>{userProfile.accountCreated}</Text>
            </View>
            
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Last Login</Text>
              <Text style={styles.accountValue}>{userProfile.lastLogin}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonTextRed}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit {editingField}</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              multiline={editingField === 'address'}
              numberOfLines={editingField === 'address' ? 3 : 1}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileOverview: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cameraButtonText: {
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  kycStatusContainer: {
    alignItems: 'flex-start',
  },
  kycStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  kycStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 60,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    minWidth: 20,
  },
  documentsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  documentLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 2,
  },
  documentNumber: {
    fontSize: 14,
    color: '#666',
  },
  documentStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  documentStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountLabel: {
    fontSize: 14,
    color: '#666',
  },
  accountValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  actionsSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  supportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
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
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonTextRed: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancel: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalSave: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
});

export default ProfileScreen;
