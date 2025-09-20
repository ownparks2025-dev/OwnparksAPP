import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { NavigationProps } from '../types';
import { notificationService, Notification, NotificationType } from '../services/notifications';
import { formatDate } from '../utils/validation';

const NotificationsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<NotificationType | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    // Load notifications when component mounts
    loadNotifications();
    
    // Subscribe to notification updates
    const unsubscribe = notificationService.addListener((updatedNotifications) => {
      console.log('Notifications updated:', updatedNotifications.length);
      setNotifications(updatedNotifications);
    });
    
    // Clean up subscription when component unmounts
    return unsubscribe;
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, selectedFilter, showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications = notificationService.getNotifications();
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === selectedFilter);
    }

    // Apply unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter(notification => !notification.read);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    notificationService.markAsRead(notification.id);

    // Navigate based on action URL
    if (notification.actionUrl) {
      switch (notification.actionUrl) {
        case 'Portfolio':
          navigation.navigate('Portfolio');
          break;
        case 'Browse':
          navigation.navigate('Browse');
          break;
        case 'Profile':
          // Navigate to profile (you can add this screen later)
          break;
        default:
          break;
      }
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All Read',
          onPress: () => notificationService.markAllAsRead(),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => notificationService.clearAllNotifications(),
        },
      ]
    );
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'investment_created':
        return '💰';
      case 'investment_approved':
        return '🎉';
      case 'investment_rejected':
        return '❌';
      case 'payout_received':
        return '💵';
      case 'kyc_approved':
        return '✅';
      case 'kyc_rejected':
        return '❌';
      case 'payment_success':
        return '💳';
      case 'payment_failed':
        return '⚠️';
      case 'roi_update':
        return '📈';
      case 'system_alert':
        return '🔔';
      default:
        return '📱';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'normal':
        return '#007AFF';
      case 'low':
        return '#34C759';
      default:
        return '#007AFF';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
        { borderLeftColor: getPriorityColor(item.priority) },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
        <View style={styles.notificationInfo}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      
      <Text style={styles.notificationMessage} numberOfLines={2}>
        {item.message}
      </Text>
      
      <View style={styles.notificationFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => notificationService.deleteNotification(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFilterTabs = () => {
    const filterOptions: { label: string; value: NotificationType | 'all' }[] = [
      { label: 'All', value: 'all' },
      { label: 'Investments', value: 'investment_created' },
      { label: 'Approvals', value: 'investment_approved' },
      { label: 'Rejections', value: 'investment_rejected' },
      { label: 'Payouts', value: 'payout_received' },
      { label: 'KYC', value: 'kyc_approved' },
      { label: 'Payments', value: 'payment_success' },
      { label: 'System', value: 'system_alert' },
    ];

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === item.value && styles.activeFilterTab,
              ]}
              onPress={() => setSelectedFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === item.value && styles.activeFilterTabText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔔</Text>
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery || selectedFilter !== 'all' || showUnreadOnly
          ? 'No notifications match your current filters.'
          : 'You\'re all caught up! Check back later for updates.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            // Show options menu
            Alert.alert(
              'Notification Options',
              'Choose an action:',
              [
                { text: 'Mark All as Read', onPress: handleMarkAllAsRead },
                { text: 'Clear All', onPress: handleClearAll, style: 'destructive' },
                { text: 'Test Notification', onPress: () => {
                  // Create a test notification to verify the system is working
                  notificationService.sendPushNotification(
                    'current-user-id',
                    'Test Notification',
                    'This is a test notification to verify the notification system is working properly.',
                    { testData: true }
                  );
                }},
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Container */}
      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Filter Tabs */}
        {renderFilterTabs()}

        {/* Toggle Unread Only */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, showUnreadOnly && styles.toggleButtonActive]}
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Text style={[styles.toggleButtonText, showUnreadOnly && styles.toggleButtonTextActive]}>
              Show Unread Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List - Separate from the filter tabs */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
      />

      {/* Summary Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          {showUnreadOnly && ` • ${notificationService.getUnreadCount()} unread`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    backgroundColor: 'white',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterContainer: {
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
  },
  toggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#007AFF',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});

export default NotificationsScreen;

