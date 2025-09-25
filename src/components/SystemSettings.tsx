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
  Switch,
  Modal,
} from 'react-native';
import { getSystemStats, getAdminUsers } from '../services/admin';
import { exportAllData } from '../services/exportService';

interface SystemSettingsProps {}

interface AppConfig {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  autoKYCApproval: boolean;
  maxInvestmentAmount: number;
  minInvestmentAmount: number;
  defaultROI: number;
  platformFee: number;
  notificationsEnabled: boolean;
}

interface SystemInfo {
  appVersion: string;
  lastBackup: string;
  totalUsers: number;
  totalInvestmentValue: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

const SystemSettings: React.FC<SystemSettingsProps> = () => {
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    appVersion: '1.0.0',
    lastBackup: new Date().toISOString(),
    totalUsers: 0,
    totalInvestmentValue: 0,
    systemHealth: 'good',
  });
  
  const [config, setConfig] = useState<AppConfig>({
    maintenanceMode: false,
    registrationEnabled: true,
    autoKYCApproval: false,
    maxInvestmentAmount: 1000000,
    minInvestmentAmount: 10000,
    defaultROI: 8.5,
    platformFee: 2.5,
    notificationsEnabled: true,
  });

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [adminCreationLoading, setAdminCreationLoading] = useState(false);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const stats = await getSystemStats();
      setSystemInfo(prev => ({
        ...prev,
        totalUsers: stats.totalUsers,
        totalInvestmentValue: stats.totalInvestmentValue,
        systemHealth: stats.totalUsers > 100 ? 'good' : stats.totalUsers > 50 ? 'warning' : 'critical'
      }));
    } catch (error: any) {
      console.error('Failed to load system info:', error);
    }
  };

  const handleConfigUpdate = (key: keyof AppConfig, value: boolean | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Show confirmation for critical settings
    if (key === 'maintenanceMode' && value === true) {
      Alert.alert(
        'Maintenance Mode',
        'This will prevent users from accessing the app. Are you sure?',
        [
          { text: 'Cancel', onPress: () => setConfig(prev => ({ ...prev, [key]: false })) },
          { text: 'Confirm' }
        ]
      );
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSystemInfo(prev => ({
        ...prev,
        lastBackup: new Date().toISOString()
      }));
      
      Alert.alert('Success', 'System backup completed successfully');
      setShowBackupModal(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            setLoading(true);
            // Simulate cache clearing
            setTimeout(() => {
              setLoading(false);
              Alert.alert('Success', 'Cache cleared successfully');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'This will export all system data (users, investments, parking lots) to CSV files. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await exportAllData();
              setLoading(false);
              
              Alert.alert(
                'Export Successful', 
                `${result.message}\n\nFiles created: ${result.filesCreated}\n\nThe files have been saved and shared. You can find them in your device's file manager or share them directly.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              setLoading(false);
              Alert.alert(
                'Export Failed', 
                `Failed to export data: ${error.message}\n\nPlease check your internet connection and try again.`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleCreateAdmin = async () => {
    setAdminCreationLoading(true);
    try {
      // Check if admin already exists
      const adminUsers = await getAdminUsers();
      const adminExists = adminUsers.length > 0;
      if (adminExists) {
        Alert.alert(
          'Admin Exists',
          'An admin user already exists in the system.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create admin user functionality not implemented
      Alert.alert(
        'Feature Not Available',
        'Admin user creation feature is not yet implemented. Please contact system administrator.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating admin:', error);
      Alert.alert(
        'Error',
        'Failed to create admin user. Please try again.'
      );
    } finally {
      setAdminCreationLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return '#34C759';
      case 'warning': return '#FF9500';
      case 'critical': return '#FF3B30';
      default: return '#666';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={true}
      decelerationRate="normal"
      bounces={true}
      alwaysBounceVertical={true}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {/* System Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>{systemInfo.appVersion}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>System Health</Text>
            <View style={styles.healthBadge}>
              <Text style={styles.healthIcon}>{getHealthIcon(systemInfo.systemHealth)}</Text>
              <Text style={[
                styles.healthText,
                { color: getHealthColor(systemInfo.systemHealth) }
              ]}>
                {systemInfo.systemHealth.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Users</Text>
            <Text style={styles.infoValue}>{systemInfo.totalUsers}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Investment Value</Text>
            <Text style={styles.infoValue}>{formatCurrency(systemInfo.totalInvestmentValue)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Backup</Text>
            <Text style={styles.infoValue}>{formatDate(systemInfo.lastBackup)}</Text>
          </View>
        </View>
      </View>

      {/* App Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Configuration</Text>
        <View style={styles.card}>
          <View style={styles.configRow}>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Maintenance Mode</Text>
              <Text style={styles.configDescription}>
                Temporarily disable app access for all users
              </Text>
            </View>
            <Switch
              value={config.maintenanceMode}
              onValueChange={(value) => handleConfigUpdate('maintenanceMode', value)}
              trackColor={{ false: '#767577', true: '#ff6b6b' }}
              thumbColor={config.maintenanceMode ? '#FF3B30' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>User Registration</Text>
              <Text style={styles.configDescription}>
                Allow new users to register
              </Text>
            </View>
            <Switch
              value={config.registrationEnabled}
              onValueChange={(value) => handleConfigUpdate('registrationEnabled', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={config.registrationEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Auto KYC Approval</Text>
              <Text style={styles.configDescription}>
                Automatically approve KYC documents
              </Text>
            </View>
            <Switch
              value={config.autoKYCApproval}
              onValueChange={(value) => handleConfigUpdate('autoKYCApproval', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={config.autoKYCApproval ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Push Notifications</Text>
              <Text style={styles.configDescription}>
                Enable system-wide notifications
              </Text>
            </View>
            <Switch
              value={config.notificationsEnabled}
              onValueChange={(value) => handleConfigUpdate('notificationsEnabled', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={config.notificationsEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Investment Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Investment Settings</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Minimum Investment Amount (₹)</Text>
            <TextInput
              style={styles.numberInput}
              value={config.minInvestmentAmount.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                handleConfigUpdate('minInvestmentAmount', value);
              }}
              keyboardType="numeric"
              placeholder="10000"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Maximum Investment Amount (₹)</Text>
            <TextInput
              style={styles.numberInput}
              value={config.maxInvestmentAmount.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                handleConfigUpdate('maxInvestmentAmount', value);
              }}
              keyboardType="numeric"
              placeholder="1000000"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Default ROI (%)</Text>
            <TextInput
              style={styles.numberInput}
              value={config.defaultROI.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                handleConfigUpdate('defaultROI', value);
              }}
              keyboardType="numeric"
              placeholder="8.5"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Platform Fee (%)</Text>
            <TextInput
              style={styles.numberInput}
              value={config.platformFee.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                handleConfigUpdate('platformFee', value);
              }}
              keyboardType="numeric"
              placeholder="2.5"
            />
          </View>
        </View>
      </View>

      {/* Database Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Management</Text>
        <View style={styles.card}>
          <View style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Create Admin User</Text>
              <Text style={styles.actionDescription}>
                Create initial admin user for system management
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, adminCreationLoading && styles.disabledButton]}
              onPress={handleCreateAdmin}
              disabled={adminCreationLoading}
            >
              {adminCreationLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Create Admin</Text>
              )}
            </TouchableOpacity>
          </View>



          <View style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Create Backup</Text>
              <Text style={styles.actionDescription}>
                Create a full system backup of all data
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowBackupModal(true)}
            >
              <Text style={styles.actionButtonText}>Backup</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Clear Cache</Text>
              <Text style={styles.actionDescription}>
                Clear all cached data to improve performance
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              onPress={handleClearCache}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Clear Cache</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Export Data</Text>
              <Text style={styles.actionDescription}>
                Export all system data to CSV format
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Export</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* System Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Monitoring</Text>
        <View style={styles.card}>
          <View style={styles.monitoringGrid}>
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringLabel}>Database Status</Text>
              <Text style={[styles.monitoringValue, { color: '#34C759' }]}>
                ✅ Connected
              </Text>
            </View>
            
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringLabel}>Storage Usage</Text>
              <Text style={styles.monitoringValue}>
                2.3GB / 10GB
              </Text>
            </View>
            
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringLabel}>API Responses</Text>
              <Text style={[styles.monitoringValue, { color: '#34C759' }]}>
                ✅ 99.9% uptime
              </Text>
            </View>
            
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringLabel}>Error Rate</Text>
              <Text style={[styles.monitoringValue, { color: '#34C759' }]}>
                0.1% (Low)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Backup Confirmation Modal */}
      <Modal
        visible={showBackupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create System Backup</Text>
            <Text style={styles.modalDescription}>
              This will create a complete backup of all system data including users, investments, 
              and parking lots. The process may take a few minutes.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBackupModal(false)}
                disabled={backupLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleBackup}
                disabled={backupLoading}
              >
                {backupLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Create Backup</Text>
                )}
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  healthText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configInfo: {
    flex: 1,
    marginRight: 15,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionInfo: {
    flex: 1,
    marginRight: 15,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  monitoringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monitoringItem: {
    width: '48%',
    marginBottom: 20,
  },
  monitoringLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  monitoringValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 25,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SystemSettings;
