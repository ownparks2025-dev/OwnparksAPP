import { Alert } from 'react-native';
import { Investment, ParkingLot, PayoutRecord } from '../types';

// Notification Types
export type NotificationType = 
  | 'investment_created'
  | 'investment_approved'
  | 'investment_rejected'
  | 'payout_received'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'payment_success'
  | 'payment_failed'
  | 'roi_update'
  | 'system_alert';

// Notification Priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification Interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  data?: any;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Notification Service Class
class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  private constructor() {
    this.loadNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service
  public async initialize(): Promise<boolean> {
    try {
      // Request notification permissions
      await this.requestPermissions();
      
      // Initialize Firebase Cloud Messaging
      await this.initializeFCM();
      
      // Load existing notifications
      await this.loadNotifications();
      
      return true;
    } catch (error) {
      console.error('Notification service initialization failed:', error);
      return false;
    }
  }

  // Request notification permissions
  private async requestPermissions(): Promise<void> {
    // This would request notification permissions from the device
    // For now, we'll simulate permission granted
    console.log('Notification permissions requested');
  }

  // Initialize Firebase Cloud Messaging
  private async initializeFCM(): Promise<void> {
    // This would initialize FCM and set up message handlers
    // For now, we'll simulate FCM initialization
    console.log('Firebase Cloud Messaging initialized');
  }

  // Load notifications from storage
  private async loadNotifications(): Promise<void> {
    try {
      // In a real app, this would load from AsyncStorage or local database
      // For now, we'll start with some sample notifications
      this.notifications = [
        {
          id: '1',
          type: 'system_alert',
          title: 'Welcome to OwnParks!',
          message: 'Thank you for joining our investment platform. Start exploring parking spaces to invest in.',
          priority: 'normal',
          timestamp: new Date(),
          read: false,
        },
        {
          id: '2',
          type: 'kyc_approved',
          title: 'KYC Verification Successful!',
          message: 'Your identity has been verified. You can now invest in parking spaces.',
          priority: 'high',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          read: false,
        },
      ];
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  // Save notifications to storage
  private async saveNotifications(): Promise<void> {
    try {
      // In a real app, this would save to AsyncStorage or local database
      console.log('Notifications saved to storage');
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  // Create investment notification
  public createInvestmentNotification(investment: Investment, parkingLot: ParkingLot): void {
    const notification: Notification = {
      id: `inv_${Date.now()}`,
      type: 'investment_created',
      title: 'Investment Created Successfully!',
      message: `Your investment of ₹${(investment.amount || 0).toLocaleString()} in ${parkingLot.name} has been created.`,
      priority: 'high',
      data: { investmentId: investment.investmentId, parkingLotId: parkingLot.id },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Portfolio',
    };

    this.addNotification(notification);
  }

  // Create payout notification
  public createPayoutNotification(payout: PayoutRecord, investment: Investment): void {
    const notification: Notification = {
      id: `payout_${Date.now()}`,
      type: 'payout_received',
      title: 'Monthly Payout Received!',
      message: `You have received ₹${(payout.amount || 0).toLocaleString()} from your investment.`,
      priority: 'high',
      data: { payoutId: payout.payoutId, investmentId: investment.investmentId },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Portfolio',
    };

    this.addNotification(notification);
  }

  // Create KYC approval notification
  public createKYCApprovalNotification(userName: string): void {
    const notification: Notification = {
      id: `kyc_${Date.now()}`,
      type: 'kyc_approved',
      title: 'KYC Verification Approved!',
      message: `Congratulations ${userName}! Your KYC verification has been approved.`,
      priority: 'high',
      data: { userId: 'current-user-id' },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Browse',
    };

    this.addNotification(notification);
  }

  // Create KYC rejection notification
  public createKYCRejectionNotification(userName: string, reason: string): void {
    const notification: Notification = {
      id: `kyc_rej_${Date.now()}`,
      type: 'kyc_rejected',
      title: 'KYC Verification Rejected',
      message: `Your KYC verification was rejected: ${reason}. Please update your documents and try again.`,
      priority: 'urgent',
      data: { userId: 'current-user-id', reason },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Profile',
    };

    this.addNotification(notification);
  }

  // Create payment success notification
  public createPaymentSuccessNotification(amount: number, parkingLotName: string): void {
    const notification: Notification = {
      id: `pay_success_${Date.now()}`,
      type: 'payment_success',
      title: 'Payment Successful!',
      message: `Your payment of ₹${(amount || 0).toLocaleString()} for ${parkingLotName} has been processed successfully.`,
      priority: 'high',
      data: { amount, parkingLotName },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Portfolio',
    };

    this.addNotification(notification);
  }

  // Create payment failure notification
  public createPaymentFailureNotification(amount: number, parkingLotName: string, error: string): void {
    const notification: Notification = {
      id: `pay_fail_${Date.now()}`,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment of ₹${(amount || 0).toLocaleString()} for ${parkingLotName} failed: ${error}`,
      priority: 'urgent',
      data: { amount, parkingLotName, error },
      timestamp: new Date(),
      read: false,
      actionUrl: 'InvestmentFlow',
    };

    this.addNotification(notification);
  }

  // Create ROI update notification
  public createROIUpdateNotification(parkingLotName: string, oldROI: number, newROI: number): void {
    const notification: Notification = {
      id: `roi_${Date.now()}`,
      type: 'roi_update',
      title: 'ROI Update',
      message: `ROI for ${parkingLotName} has been updated from ${oldROI}% to ${newROI}%.`,
      priority: 'normal',
      data: { parkingLotName, oldROI, newROI },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Browse',
    };

    this.addNotification(notification);
  }

  // Create investment approval notification
  public createInvestmentApprovalNotification(investment: Investment, parkingLotName: string): void {
    const notification: Notification = {
      id: `inv_approved_${Date.now()}`,
      type: 'investment_approved',
      title: 'Investment Approved! 🎉',
      message: `Great news! Your investment of ₹${(investment.amount || 0).toLocaleString()} in ${parkingLotName} has been approved by our admin team. You can now view it in your portfolio.`,
      priority: 'high',
      data: { investmentId: investment.investmentId, parkingLotName, amount: investment.amount },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Portfolio',
    };

    this.addNotification(notification);
  }

  // Create investment rejection notification
  public createInvestmentRejectionNotification(investment: Investment, parkingLotName: string, reason?: string): void {
    const notification: Notification = {
      id: `inv_rejected_${Date.now()}`,
      type: 'investment_rejected',
      title: 'Investment Rejected',
      message: `Unfortunately, your investment of ₹${(investment.amount || 0).toLocaleString()} in ${parkingLotName} has been rejected by our admin team.${reason ? ` Reason: ${reason}` : ''} Please contact support for more information.`,
      priority: 'urgent',
      data: { investmentId: investment.investmentId, parkingLotName, amount: investment.amount, reason },
      timestamp: new Date(),
      read: false,
      actionUrl: 'Browse',
    };

    this.addNotification(notification);
  }

  // Add notification to the list
  private addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    
    // Keep only the last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    this.saveNotifications();
    this.notifyListeners();
    
    // Show local notification
    this.showLocalNotification(notification);
  }

  // Show local notification
  private showLocalNotification(notification: Notification): void {
    // In a real app, this would show a local push notification
    // For now, we'll just log it
    console.log('Local notification:', notification.title);
    
    // For high priority notifications, show an alert
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      Alert.alert(notification.title, notification.message);
    }
  }

  // Get all notifications
  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get unread notifications
  public getUnreadNotifications(): Notification[] {
    return this.notifications.filter(notification => !notification.read);
  }

  // Get notifications by type
  public getNotificationsByType(type: NotificationType): Notification[] {
    return this.notifications.filter(notification => notification.type === type);
  }

  // Mark notification as read
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveNotifications();
    this.notifyListeners();
  }

  // Delete notification
  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  // Clear all notifications
  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  // Get notification count
  public getNotificationCount(): number {
    return this.notifications.length;
  }

  // Get unread notification count
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Add notification listener
  public addListener(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }

  // Send push notification (for admin use)
  public async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    try {
      // In a real app, this would send a push notification via FCM
      // For now, we'll simulate sending
      console.log(`Push notification sent to user ${userId}:`, { title, message, data });
      
      // Create a local notification for the current user
      if (userId === 'current-user-id') {
        const notification: Notification = {
          id: `push_${Date.now()}`,
          type: 'system_alert',
          title,
          message,
          priority: 'normal',
          data,
          timestamp: new Date(),
          read: false,
        };
        
        this.addNotification(notification);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  // Handle FCM message received
  public handleFCMMessage(message: any): void {
    try {
      // Parse the FCM message and create a notification
      const notification: Notification = {
        id: `fcm_${Date.now()}`,
        type: message.data?.type || 'system_alert',
        title: message.notification?.title || 'New Message',
        message: message.notification?.body || 'You have a new notification',
        priority: message.data?.priority || 'normal',
        data: message.data,
        timestamp: new Date(),
        read: false,
        actionUrl: message.data?.actionUrl,
      };

      this.addNotification(notification);
    } catch (error) {
      console.error('Failed to handle FCM message:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
