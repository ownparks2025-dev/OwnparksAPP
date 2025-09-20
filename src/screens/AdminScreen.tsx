import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NavigationProps } from '../types';
import { getCurrentUserRole, checkAdminAccess } from '../services/admin';
import { auth } from '../services/firebase';
import AdminDashboard from '../components/AdminDashboard';
import UserManagement from '../components/UserManagement';
import ParkingLotManagement from '../components/ParkingLotManagement';
import InvestmentManagement from '../components/InvestmentManagement';
import SystemSettings from '../components/SystemSettings';

type TabType = 'dashboard' | 'users' | 'lots' | 'investments' | 'settings';

const AdminScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'lots', label: 'Lots', icon: '🏗️' },
    { id: 'investments', label: 'Investments', icon: '💰' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Authentication Required', 'Please log in first.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
        return;
      }

      const userRole = await getCurrentUserRole();
      console.log('Admin check - User role:', userRole);
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        setHasAccess(true);
      } else {
        Alert.alert('Access Denied', 'You need admin privileges to access this panel.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setChecking(false);
    }
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'lots':
        return <ParkingLotManagement />;
      case 'investments':
        return <InvestmentManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return null; // Navigation should handle this
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Complete system management</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <Text style={styles.tabHint}>← Swipe to see all admin options →</Text>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.tabScrollContainer}
          bounces={true}
          decelerationRate="normal"
          scrollEventThrottle={16}
          directionalLockEnabled={true}
          style={{ width: '100%' }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.id as TabType)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabLabel,
                activeTab === tab.id && styles.activeTabLabel,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {renderTabContent()}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingVertical: 10,
    position: 'relative',
  },
  tabHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tabScrollContainer: {
    paddingHorizontal: 20,
    paddingRight: 40, // Extra padding to ensure last tab is fully visible
    flexDirection: 'row', // Ensure horizontal layout
    alignItems: 'flex-start',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    minWidth: 100, // Reduced width to fit more tabs
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexShrink: 0, // Prevent tabs from shrinking
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabLabel: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
});

export default AdminScreen;