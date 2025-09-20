import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NavigationProps } from '../types';
import { getCurrentUserRole } from '../services/admin';
import { auth } from '../services/firebase';

interface AdminAuthScreenProps extends NavigationProps {}

const AdminAuthScreen: React.FC<AdminAuthScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          'Authentication Required',
          'Please log in to access the admin panel.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
        return;
      }

      // Check if user has admin role
      const userRole = await getCurrentUserRole();
      console.log('User role:', userRole); // Debug log
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        // User is admin or super admin, navigate to admin panel
        navigation.replace('Admin');
      } else {
        // User is not admin
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access. Please try again.');
      setLoading(false);
    }
  };

  const handleRetryAccess = async () => {
    setChecking(true);
    await checkAdminAccess();
    setChecking(false);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.subtitle}>
          You don't have administrator privileges to access this panel.
        </Text>
        
        <Text style={styles.description}>
          Only users with admin role can access the administrative features.
          If you believe this is an error, please contact your system administrator.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={handleRetryAccess}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>Retry Access</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleGoBack}
          >
            <Text style={[styles.buttonText, styles.backButtonText]}>Go Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Need Admin Access?</Text>
          <Text style={styles.infoText}>
            Contact your system administrator to request admin privileges.
          </Text>
        </View>
      </View>
    </SafeAreaView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  backButtonText: {
    color: '#666',
  },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    width: '100%',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
});

export default AdminAuthScreen;