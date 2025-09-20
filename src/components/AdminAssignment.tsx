import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { assignUserRole, canRemoveAdmin, countAdminUsers } from '../services/admin';
import { User } from '../types';

interface AdminAssignmentProps {
  user: User;
  currentUserRole: 'user' | 'admin' | 'super_admin';
  currentUserId: string;
  onRoleUpdated: (userId: string, newRole: 'user' | 'admin' | 'super_admin') => void;
}

const AdminAssignment: React.FC<AdminAssignmentProps> = ({
  user,
  currentUserRole,
  currentUserId,
  onRoleUpdated,
}) => {
  const [loading, setLoading] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '#FF3B30'; // Red for super admin
      case 'admin':
        return '#007AFF'; // Blue for admin
      default:
        return '#666'; // Gray for user
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '👑';
      case 'admin':
        return '🛡️';
      default:
        return '👤';
    }
  };

  const handleRoleChange = async (newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      setLoading(true);

      // Check permissions
      if (currentUserRole === 'user') {
        Alert.alert('Error', 'You do not have permission to assign roles.');
        return;
      }

      if (newRole === 'super_admin' && currentUserRole !== 'super_admin') {
        Alert.alert('Error', 'Only super admins can assign super admin roles.');
        return;
      }

      // Special check for removing admin privileges
      if ((user.role === 'admin' || user.role === 'super_admin') && newRole === 'user') {
        const canRemove = await canRemoveAdmin(currentUserId, user.uid);
        if (!canRemove) {
          Alert.alert(
            'Cannot Remove Admin',
            'Cannot remove the last super admin. Assign another super admin first.',
          );
          return;
        }
      }

      const roleText = getRoleLabel(newRole);
      const currentRoleText = getRoleLabel(user.role);
      
      Alert.alert(
        'Confirm Role Change',
        `Change ${user.name} from ${currentRoleText} to ${roleText}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await assignUserRole(user.uid, newRole, currentUserId);
                onRoleUpdated(user.uid, newRole);
                Alert.alert('Success', `${user.name} is now a ${roleText}`);
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const canAssignRole = (targetRole: 'user' | 'admin' | 'super_admin') => {
    // Users cannot assign any roles
    if (currentUserRole === 'user') return false;
    
    // Admins can only assign/remove user roles (demote other admins to users)
    if (currentUserRole === 'admin') {
      return targetRole === 'user' && (user.role === 'admin' || user.role === 'user');
    }
    
    // Super admins can assign any role
    return true;
  };

  // Don't show admin controls if user has no admin permissions
  if (currentUserRole === 'user') {
    return (
      <View style={styles.roleDisplay}>
        <Text style={styles.roleIcon}>{getRoleIcon(user.role)}</Text>
        <Text style={[styles.roleLabel, { color: getRoleColor(user.role) }]}>
          {getRoleLabel(user.role)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Role Management</Text>
      
      {/* Current Role Display */}
      <View style={styles.currentRole}>
        <Text style={styles.currentRoleLabel}>Current Role:</Text>
        <View style={styles.roleDisplay}>
          <Text style={styles.roleIcon}>{getRoleIcon(user.role)}</Text>
          <Text style={[styles.roleLabel, { color: getRoleColor(user.role) }]}>
            {getRoleLabel(user.role)}
          </Text>
        </View>
      </View>

      {/* Role Assignment Buttons */}
      <View style={styles.roleButtons}>
        {user.role !== 'user' && canAssignRole('user') && (
          <TouchableOpacity
            style={[styles.roleButton, styles.userButton]}
            onPress={() => handleRoleChange('user')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.roleButtonIcon}>👤</Text>
                <Text style={styles.roleButtonText}>Make User</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {user.role !== 'admin' && canAssignRole('admin') && (
          <TouchableOpacity
            style={[styles.roleButton, styles.adminButton]}
            onPress={() => handleRoleChange('admin')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.roleButtonIcon}>🛡️</Text>
                <Text style={styles.roleButtonText}>Make Admin</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {user.role !== 'super_admin' && canAssignRole('super_admin') && (
          <TouchableOpacity
            style={[styles.roleButton, styles.superAdminButton]}
            onPress={() => handleRoleChange('super_admin')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.roleButtonIcon}>👑</Text>
                <Text style={styles.roleButtonText}>Make Super Admin</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Role Assignment Info */}
      {(user.assignedBy && user.roleAssignedAt) && (
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentText}>
            Role assigned on {new Date(user.roleAssignedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  currentRole: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  currentRoleLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  roleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  userButton: {
    backgroundColor: '#666',
  },
  adminButton: {
    backgroundColor: '#007AFF',
  },
  superAdminButton: {
    backgroundColor: '#FF3B30',
  },
  roleButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  roleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 6,
  },
  assignmentText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AdminAssignment;
