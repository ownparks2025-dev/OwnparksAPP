import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { 
  getAllUsers, 
  updateUserKYCStatus, 
  getUsersByKYCStatus, 
  deleteUser,
  bulkUpdateKYCStatus,
  assignUserRole,
  getCurrentUserRole,
  canRemoveAdmin,
  countAdminUsers
} from '../services/admin';
import { auth } from '../services/firebase';
import { getUserKYCDocuments } from '../services/cloudinaryStorage';
import { User } from '../types';
import KYCDocumentViewer from './KYCDocumentViewer';

type FilterType = 'all' | 'pending' | 'verified' | 'rejected' | 'admins';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [kycViewerVisible, setKycViewerVisible] = useState(false);
  const [localKycDocuments, setLocalKycDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [adminCounts, setAdminCounts] = useState({ admins: 0, superAdmins: 0 });

  const filters = [
    { id: 'all', label: 'All Users', count: users.length },
    { id: 'pending', label: 'Pending KYC', count: users.filter(u => u.kycStatus === 'pending').length },
    { id: 'verified', label: 'Verified', count: users.filter(u => u.kycStatus === 'verified').length },
    { id: 'rejected', label: 'Rejected', count: users.filter(u => u.kycStatus === 'rejected').length },
    { id: 'admins', label: 'Admins', count: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length },
  ];

  const loadUsers = async () => {
    try {
      const [allUsers, userRole, adminCounts] = await Promise.all([
        getAllUsers(),
        getCurrentUserRole(),
        countAdminUsers()
      ]);
      setUsers(allUsers);
      setCurrentUserRole(userRole || 'user');
      setAdminCounts(adminCounts);
      filterUsers(allUsers, activeFilter, searchQuery);
    } catch (error: any) {
      Alert.alert('Error', `Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUsers = (userList: User[], filter: FilterType, search: string) => {
    let filtered = userList;

    // Apply filter
    if (filter === 'admins') {
      filtered = filtered.filter(user => user.role === 'admin' || user.role === 'super_admin');
    } else if (filter !== 'all') {
      filtered = filtered.filter(user => user.kycStatus === filter);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.includes(search)
      );
    }

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers(users, activeFilter, searchQuery);
  }, [users, activeFilter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const loadUserKYCDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(true);
      
      // Note: Since we're using local storage, admin panel can only view documents
      // for the currently logged-in user. For a full admin solution, consider
      // implementing a centralized document storage system.
      console.log(`Loading KYC documents from local storage for user: ${userId}`);
      
      // Check if this is the current user
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        const userDocuments = await getUserKYCDocuments(userId);
        console.log(`Loaded ${userDocuments.length} documents for user ${userId}`);
        setLocalKycDocuments(userDocuments);
      } else {
        // For other users, we can't access their local storage
        console.log('Cannot access local storage for other users');
        setLocalKycDocuments([]);
        Alert.alert(
          'Documents Not Available', 
          'KYC documents are stored locally and can only be viewed by the document owner. This user needs to log in to view their documents.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading KYC documents:', error);
      setLocalKycDocuments([]);
      Alert.alert(
        'Error Loading Documents', 
        'Failed to load KYC documents from local storage. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleKYCStatusUpdate = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      setActionLoading(`${userId}-${status}`);
      await updateUserKYCStatus(userId, status);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userId ? { ...user, kycStatus: status } : user
        )
      );
      
      Alert.alert('Success', `User KYC status updated to ${status}`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to update KYC status: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(`${userId}-delete`);
              await deleteUser(userId);
              
              // Remove from local state
              setUsers(prevUsers => prevUsers.filter(user => user.uid !== userId));
              
              Alert.alert('Success', 'User deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete user: ${error.message}`);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleBulkAction = async (action: 'verify' | 'reject') => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Selection', 'Please select users to perform bulk action');
      return;
    }

    const actionText = action === 'verify' ? 'verify' : 'reject';
    Alert.alert(
      'Confirm Bulk Action',
      `Are you sure you want to ${actionText} ${selectedUsers.length} selected users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setActionLoading(`bulk-${action}`);
              await bulkUpdateKYCStatus(selectedUsers, action === 'verify' ? 'verified' : 'rejected');
              
              // Update local state
              setUsers(prevUsers => 
                prevUsers.map(user => 
                  selectedUsers.includes(user.uid) 
                    ? { ...user, kycStatus: action === 'verify' ? 'verified' : 'rejected' }
                    : user
                )
              );
              
              setSelectedUsers([]);
              Alert.alert('Success', `Bulk ${actionText} completed successfully`);
            } catch (error: any) {
              Alert.alert('Error', `Failed to perform bulk action: ${error.message}`);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };



  const handleRoleAssignment = async (targetUserId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      const targetUser = users.find(u => u.uid === targetUserId);
      if (!targetUser) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Permission checks
      if (newRole === 'super_admin' && currentUserRole !== 'super_admin') {
        Alert.alert('Access Denied', 'Only super admins can assign super admin role');
        return;
      }

      // Check if trying to demote the last super admin
      if (targetUser.role === 'super_admin' && newRole !== 'super_admin') {
        const canRemove = await canRemoveAdmin(auth.currentUser!.uid, targetUserId);
        if (!canRemove) {
          Alert.alert(
            'Cannot Remove Role', 
            'Cannot remove the last super admin. At least one super admin must remain in the system.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Confirmation dialog
      const roleChangeText = newRole === 'user' ? 'remove admin privileges from' : `assign ${newRole} role to`;
      let warningMessage = `Are you sure you want to ${roleChangeText} ${targetUser.name}?`;
      
      if (targetUser.role === 'super_admin' && newRole !== 'super_admin') {
        warningMessage += '\n\nThis will remove super admin privileges.';
      }
      if (newRole === 'super_admin') {
        warningMessage += '\n\nThis will grant full system administration privileges.';
      }

      Alert.alert(
        'Confirm Role Change',
        warningMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: newRole === 'user' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setActionLoading(`${targetUserId}-role-${newRole}`);
                await assignUserRole(targetUserId, newRole, auth.currentUser!.uid);
                
                // Update local state
                setUsers(prevUsers => 
                  prevUsers.map(user => 
                    user.uid === targetUserId 
                      ? { 
                          ...user, 
                          role: newRole,
                          roleAssignedBy: auth.currentUser!.uid,
                          roleAssignedAt: new Date()
                        } 
                      : user
                  )
                );
                
                // Update admin counts
                const newAdminCounts = await countAdminUsers();
                setAdminCounts(newAdminCounts);
                
                Alert.alert('Success', `User role updated to ${newRole}`);
              } catch (error: any) {
                Alert.alert('Error', `Failed to update role: ${error.message}`);
              } finally {
                setActionLoading(null);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to process role assignment: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'pending': return '#FF9500';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#7C3AED';
      case 'admin': return '#DC2626';
      case 'user': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return '👑';
      case 'admin': return '🛡️';
      case 'user': return '👤';
      default: return '👤';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'SUPER ADMIN';
      case 'admin': return 'ADMIN';
      case 'user': return 'USER';
      default: return 'USER';
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadUsers}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterScrollContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              activeFilter === filter.id && styles.activeFilterTab,
            ]}
            onPress={() => setActiveFilter(filter.id as FilterType)}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === filter.id && styles.activeFilterTabText,
            ]}>
              {filter.label}
            </Text>
            <Text style={[
              styles.filterCount,
              activeFilter === filter.id && styles.activeFilterCount,
            ]}>
              {filter.count}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <View style={styles.bulkActionsContainer}>
          <Text style={styles.bulkActionsText}>
            {selectedUsers.length} selected
          </Text>
          <View style={styles.bulkActionsButtons}>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.verifyButton]}
              onPress={() => handleBulkAction('verify')}
              disabled={actionLoading?.startsWith('bulk')}
            >
              {actionLoading === 'bulk-verify' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.bulkActionButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.rejectButton]}
              onPress={() => handleBulkAction('reject')}
              disabled={actionLoading?.startsWith('bulk')}
            >
              {actionLoading === 'bulk-reject' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.bulkActionButtonText}>Reject</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.clearButton]}
              onPress={() => setSelectedUsers([])}
            >
              <Text style={styles.bulkActionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}



      {/* User List */}
      <ScrollView
        style={styles.userList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.map((user) => (
          <View key={user.uid} style={styles.userCard}>
            <TouchableOpacity
              style={styles.userCardHeader}
              onPress={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            >
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleUserSelection(user.uid)}
              >
                <Text style={styles.checkboxText}>
                  {selectedUsers.includes(user.uid) ? '☑️' : '☐'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.badgesContainer}>
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                        <Text style={styles.roleIcon}>{getRoleIcon(user.role)}</Text>
                        <Text style={styles.roleText}>{getRoleLabel(user.role)}</Text>
                      </View>
                    )}
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusIcon}>{getStatusIcon(user.kycStatus)}</Text>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(user.kycStatus) }
                      ]}>
                        {user.kycStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
                <Text style={styles.userDate}>
                  Joined: {formatDate(user.createdAt)}
                </Text>
                <Text style={styles.portfolioCount}>
                  Portfolio: {user.portfolio?.length || 0} investments
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.userActions}>
              {user.kycStatus === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.verifyButton]}
                    onPress={() => handleKYCStatusUpdate(user.uid, 'verified')}
                    disabled={actionLoading?.startsWith(user.uid)}
                  >
                    {actionLoading === `${user.uid}-verified` ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleKYCStatusUpdate(user.uid, 'rejected')}
                    disabled={actionLoading?.startsWith(user.uid)}
                  >
                    {actionLoading === `${user.uid}-rejected` ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Reject</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
              
              {/* Role Assignment Buttons */}
              {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && user.uid !== auth.currentUser?.uid && (
                <>
                  {user.role === 'user' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.promoteButton]}
                      onPress={() => handleRoleAssignment(user.uid, 'admin')}
                      disabled={actionLoading?.startsWith(user.uid)}
                    >
                      {actionLoading === `${user.uid}-role-admin` ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.actionButtonText}>Make Admin</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {user.role === 'admin' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.demoteButton]}
                        onPress={() => handleRoleAssignment(user.uid, 'user')}
                        disabled={actionLoading?.startsWith(user.uid)}
                      >
                        {actionLoading === `${user.uid}-role-user` ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.actionButtonText}>Remove Admin</Text>
                        )}
                      </TouchableOpacity>
                      {currentUserRole === 'super_admin' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.superPromoteButton]}
                          onPress={() => handleRoleAssignment(user.uid, 'super_admin')}
                          disabled={actionLoading?.startsWith(user.uid)}
                        >
                          {actionLoading === `${user.uid}-role-super_admin` ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={styles.actionButtonText}>Make Super Admin</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                  
                  {user.role === 'super_admin' && currentUserRole === 'super_admin' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.demoteButton]}
                      onPress={() => handleRoleAssignment(user.uid, 'admin')}
                      disabled={actionLoading?.startsWith(user.uid)}
                    >
                      {actionLoading === `${user.uid}-role-admin` ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.actionButtonText}>Demote to Admin</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteUser(user.uid)}
                disabled={actionLoading?.startsWith(user.uid)}
              >
                {actionLoading === `${user.uid}-delete` ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Users will appear here once registered'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* User Detail Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Name:</Text>
                  <Text style={styles.modalFieldValue}>{selectedUser.name}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Email:</Text>
                  <Text style={styles.modalFieldValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Phone:</Text>
                  <Text style={styles.modalFieldValue}>{selectedUser.phone}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Role:</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Text style={styles.roleIcon}>{getRoleIcon(selectedUser.role)}</Text>
                    <Text style={styles.roleText}>{getRoleLabel(selectedUser.role)}</Text>
                  </View>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>KYC Status:</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusIcon}>{getStatusIcon(selectedUser.kycStatus)}</Text>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(selectedUser.kycStatus) }
                    ]}>
                      {selectedUser.kycStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Joined:</Text>
                  <Text style={styles.modalFieldValue}>{formatDate(selectedUser.createdAt)}</Text>
                </View>
                {selectedUser.roleAssignedAt && (
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Role Assigned:</Text>
                    <Text style={styles.modalFieldValue}>{formatDate(selectedUser.roleAssignedAt)}</Text>
                  </View>
                )}
              </View>
              
              {/* Role Management Section */}
              {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && selectedUser.uid !== auth.currentUser?.uid && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Role Management</Text>
                  <View style={styles.roleManagementContainer}>
                    {selectedUser.role === 'user' && (
                      <TouchableOpacity
                        style={[styles.roleActionButton, styles.promoteButton]}
                        onPress={() => {
                          setShowUserModal(false);
                          handleRoleAssignment(selectedUser.uid, 'admin');
                        }}
                        disabled={actionLoading?.startsWith(selectedUser.uid)}
                      >
                        {actionLoading === `${selectedUser.uid}-role-admin` ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.roleActionButtonText}>🛡️ Make Admin</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    
                    {selectedUser.role === 'admin' && (
                      <>
                        <TouchableOpacity
                          style={[styles.roleActionButton, styles.demoteButton]}
                          onPress={() => {
                            setShowUserModal(false);
                            handleRoleAssignment(selectedUser.uid, 'user');
                          }}
                          disabled={actionLoading?.startsWith(selectedUser.uid)}
                        >
                          {actionLoading === `${selectedUser.uid}-role-user` ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={styles.roleActionButtonText}>👤 Remove Admin</Text>
                          )}
                        </TouchableOpacity>
                        {currentUserRole === 'super_admin' && (
                          <TouchableOpacity
                            style={[styles.roleActionButton, styles.superPromoteButton]}
                            onPress={() => {
                              setShowUserModal(false);
                              handleRoleAssignment(selectedUser.uid, 'super_admin');
                            }}
                            disabled={actionLoading?.startsWith(selectedUser.uid)}
                          >
                            {actionLoading === `${selectedUser.uid}-role-super_admin` ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Text style={styles.roleActionButtonText}>👑 Make Super Admin</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    
                    {selectedUser.role === 'super_admin' && currentUserRole === 'super_admin' && (
                      <TouchableOpacity
                        style={[styles.roleActionButton, styles.demoteButton]}
                        onPress={() => {
                          setShowUserModal(false);
                          handleRoleAssignment(selectedUser.uid, 'admin');
                        }}
                        disabled={actionLoading?.startsWith(selectedUser.uid)}
                      >
                        {actionLoading === `${selectedUser.uid}-role-admin` ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.roleActionButtonText}>🛡️ Demote to Admin</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>KYC Documents</Text>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Status:</Text>
                  <Text style={[styles.modalFieldValue, { 
                    color: selectedUser.kycStatus === 'verified' ? '#28a745' : 
                           selectedUser.kycStatus === 'rejected' ? '#dc3545' : '#ffc107' 
                  }]}>
                    {selectedUser.kycStatus || 'pending'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.viewDocumentsButton, loadingDocuments && styles.disabledButton]}
                  onPress={async () => {
                    if (!loadingDocuments) {
                      await loadUserKYCDocuments(selectedUser.uid);
                      setKycViewerVisible(true);
                    }
                  }}
                  disabled={loadingDocuments}
                >
                  <Text style={styles.viewDocumentsButtonText}>
                    {loadingDocuments ? '⏳ Loading Documents...' : '📄 View Documents'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Portfolio</Text>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Active Investments:</Text>
                  <Text style={styles.modalFieldValue}>
                    {selectedUser.portfolio?.length || 0}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* KYC Document Viewer Modal */}
      <Modal
        visible={kycViewerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setKycViewerVisible(false)}
      >
        <View style={styles.kycViewerContainer}>
          <View style={styles.kycViewerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setKycViewerVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          
          {selectedUser && (
            <>
              {localKycDocuments.length > 0 ? (
                <KYCDocumentViewer
                  userName={selectedUser.name}
                  documents={localKycDocuments}
                  onVerifyDocument={(documentType, verified) => {
                    handleKYCStatusUpdate(selectedUser.uid, 'verified');
                    setKycViewerVisible(false);
                  }}
                  onRejectDocument={(documentType, reason) => {
                    handleKYCStatusUpdate(selectedUser.uid, 'rejected');
                    setKycViewerVisible(false);
                  }}
                />
              ) : (
                <View style={styles.noDocumentsContainer}>
                  <Text style={styles.noDocumentsTitle}>No Documents Found</Text>
                  <Text style={styles.noDocumentsText}>
                    This user hasn't uploaded any KYC documents yet, or the documents are stored in Firestore.
                  </Text>
                  <Text style={styles.noDocumentsSubtext}>
                    User Status: {selectedUser.kycStatus || 'pending'}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  filterScrollContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterTab: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: 'white',
  },
  filterCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 2,
  },
  activeFilterCount: {
    color: 'white',
  },
  bulkActionsContainer: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bulkActionsText: {
    color: 'white',
    fontWeight: '500',
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 60,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  clearButton: {
    backgroundColor: '#666',
  },

  bulkActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  userList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userCardHeader: {
    flexDirection: 'row',
    padding: 15,
  },
  checkbox: {
    marginRight: 15,
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  portfolioCount: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  promoteButton: {
    backgroundColor: '#007AFF',
  },
  demoteButton: {
    backgroundColor: '#FF9500',
  },
  superPromoteButton: {
    backgroundColor: '#7C3AED',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  modalField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalFieldLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalFieldValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  roleManagementContainer: {
    gap: 12,
  },
  roleActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  viewDocumentsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  viewDocumentsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  noDocumentsText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  noDocumentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDocumentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noDocumentsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    fontWeight: '500',
  },
  kycViewerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  kycViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  closeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#6c757d',
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UserManagement;
