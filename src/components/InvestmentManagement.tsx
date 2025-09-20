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
  getAllInvestments, 
  updateInvestmentStatus, 
  getInvestmentsByStatus,
  createInvestmentAfterOfflinePayment,
  approveInvestment,
  rejectInvestment,
  getPendingInvestments,
  approveInvestmentAfterPayment,
  batchApproveInvestments
} from '../services/admin';
import { createInvestment } from '../services/firebase';
import { getAllUsers } from '../services/admin';
import { Investment, User, ParkingLot } from '../types';
import { getAllParkingLots } from '../services/admin';
import { notificationService } from '../services/notifications';
import { db, auth } from '../services/firebase';

type FilterType = 'all' | 'pending' | 'success' | 'failed' | 'admin_pending';

const InvestmentManagement: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [filteredData, setFilteredData] = useState<Investment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [selectedInvestments, setSelectedInvestments] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const investmentFilters = [
    { id: 'all', label: 'All', count: investments.length },
    { id: 'pending', label: 'Pending', count: investments.filter(i => i.paymentStatus === 'pending').length },
    { id: 'success', label: 'Success', count: investments.filter(i => i.paymentStatus === 'success').length },
    { id: 'failed', label: 'Failed', count: investments.filter(i => i.paymentStatus === 'failed').length },
    { id: 'admin_pending', label: 'Admin Review', count: investments.filter(i => i.adminApprovalStatus === 'pending').length },
  ];

  const currentFilters = investmentFilters;

  const loadData = async () => {
    try {
      const [investmentData, userData, lotData] = await Promise.all([
        getAllInvestments(),
        getAllUsers(),
        getAllParkingLots()
      ]);

      console.log('Investment data loaded:', investmentData.length, 'investments');
      console.log('User data loaded:', userData.length, 'users');
      console.log('Parking lot data loaded:', lotData.length, 'lots');

      setInvestments(investmentData);
      setUsers(userData);
      setParkingLots(lotData);

      // Apply current filters after a short delay to ensure state is updated
      setTimeout(() => {
        filterInvestments(investmentData, activeFilter, searchQuery, userData);
      }, 100);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filterInvestments = (investmentList: Investment[], filter: FilterType, search: string, userData?: User[]) => {
    const usersToUse = userData || users;
    
    // Filter out investments with invalid user IDs
    let filtered = investmentList.filter(investment => {
      const user = usersToUse.find(u => u.uid === investment.userId);
      return user !== undefined;
    });

    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'admin_pending') {
        filtered = filtered.filter(investment => investment.adminApprovalStatus === 'pending');
      } else {
        filtered = filtered.filter(investment => {
          // For success filter, include both pending admin approval and approved investments
          if (filter === 'success') {
            return investment.paymentStatus === 'success';
          }
          // For other filters, exclude admin pending
          return investment.paymentStatus === filter && investment.adminApprovalStatus !== 'pending';
        });
      }
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(investment => {
        const user = usersToUse.find(u => u.uid === investment.userId);
        const parkingLot = parkingLots.find(lot => lot.id === investment.parkingLotId);
        
        return (
          investment.investmentId.toLowerCase().includes(searchLower) ||
          user?.name.toLowerCase().includes(searchLower) ||
          user?.email.toLowerCase().includes(searchLower) ||
          parkingLot?.name.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredData(filtered);
  };

  useEffect(() => {
    filterInvestments(investments, activeFilter, searchQuery, users);
  }, [investments, users, parkingLots, activeFilter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const createTestInvestments = async () => {
    try {
      if (users.length === 0 || parkingLots.length === 0) {
        Alert.alert('Error', 'No users or parking lots available to create test investments');
        return;
      }

      setActionLoading('creating-test-investments');
      
      // Create 3 test investments with different statuses
      const testInvestments = [
        {
          userId: users[0].uid,
          parkingLotId: parkingLots[0].id,
          leaseAccepted: true,
          paymentStatus: 'success' as const,
          adminApprovalStatus: 'approved' as const,
          amount: 50000,
          selectedLots: 1,
          paymentMethod: 'online'
        },
        {
          userId: users[0].uid,
          parkingLotId: parkingLots[0].id,
          leaseAccepted: true,
          paymentStatus: 'pending' as const,
          adminApprovalStatus: 'pending' as const,
          amount: 75000,
          selectedLots: 2,
          paymentMethod: 'offline'
        },
        {
          userId: users.length > 1 ? users[1].uid : users[0].uid,
          parkingLotId: parkingLots.length > 1 ? parkingLots[1].id : parkingLots[0].id,
          leaseAccepted: false,
          paymentStatus: 'success' as const,
          adminApprovalStatus: 'pending' as const,
          amount: 100000,
          selectedLots: 3,
          paymentMethod: 'online'
        }
      ];

      for (const investment of testInvestments) {
        await createInvestment(investment);
      }

      Alert.alert('Success', 'Test investments created successfully');
      await loadData(); // Reload data to show new investments
    } catch (error) {
      console.error('Error creating test investments:', error);
      Alert.alert('Error', 'Failed to create test investments');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvestmentStatusUpdate = async (investmentId: string, status: 'success' | 'failed') => {
    try {
      setActionLoading(`${investmentId}-${status}`);
      
      if (status === 'success') {
        // For offline payment confirmation, update the existing investment
        const investment = investments.find(inv => inv.investmentId === investmentId);
        if (investment) {
          await updateInvestmentStatus(investmentId, { 
            paymentStatus: 'success',
            adminApprovalStatus: 'pending',
            paymentConfirmedAt: new Date()
          });
          
          // Update user's total investment only for online payments
          // For offline payments, totalInvestment was already updated during creation
          if (!investment.createdByAdmin) {
            const userRef = db.collection('users').doc(investment.userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
              const userData = userDoc.data() as User;
              const currentTotal = userData.totalInvestment || 0;
              
              await userRef.update({
                totalInvestment: currentTotal + investment.amount,
                lastInvestmentDate: new Date()
              });
            }
          }
          
          // Update local state
          setInvestments(prevInvestments =>
            prevInvestments.map(inv =>
              inv.investmentId === investmentId 
                ? { ...inv, paymentStatus: 'success', adminApprovalStatus: 'pending' }
                : inv
            )
          );
          
          Alert.alert('Success', 'Payment confirmed successfully');
        }
      } else {
        // For rejection, just update the status
        await updateInvestmentStatus(investmentId, { paymentStatus: status });
        
        // Update local state
        setInvestments(prevInvestments =>
          prevInvestments.map(investment =>
            investment.investmentId === investmentId 
              ? { ...investment, paymentStatus: status }
              : investment
          )
        );
        
        Alert.alert('Success', 'Payment rejected');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to update investment status: ${error.message}`);
    } finally {
      setActionLoading(null);
      setShowPaymentConfirmModal(false);
      setSelectedInvestment(null);
    }
  };

  const openPaymentConfirmModal = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowPaymentConfirmModal(true);
  };

  const handleLeaseStatusUpdate = async (investmentId: string, accepted: boolean) => {
    try {
      setActionLoading(`${investmentId}-lease`);
      await updateInvestmentStatus(investmentId, { leaseAccepted: accepted });
      
      // Update local state
      setInvestments(prevInvestments =>
        prevInvestments.map(investment =>
          investment.investmentId === investmentId 
            ? { ...investment, leaseAccepted: accepted }
            : investment
        )
      );
      
      Alert.alert('Success', `Lease ${accepted ? 'accepted' : 'rejected'} successfully`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to update lease status: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Enhanced workflow: One-click approval after payment confirmation
  const handleOneClickApproval = async (investmentId: string) => {
    try {
      setActionLoading(`${investmentId}-oneclick`);
      
      // Find the investment to get user details
      const investment = investments.find(inv => inv.investmentId === investmentId);
      if (!investment) {
        throw new Error('Investment not found');
      }
      
      await approveInvestmentAfterPayment(investmentId, 'Approved after payment confirmation');
      
      // Send approval notification
      await notificationService.createInvestmentApprovalNotification(
        investment,
        getLotName(investment.parkingLotId)
      );
      
      Alert.alert('Success', 'Payment confirmed and investment approved in one step!');
      
      // Refresh data to show updated status
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', `Failed to approve investment: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Batch operations
  const toggleInvestmentSelection = (investmentId: string) => {
    const newSelected = new Set(selectedInvestments);
    if (newSelected.has(investmentId)) {
      newSelected.delete(investmentId);
    } else {
      newSelected.add(investmentId);
    }
    setSelectedInvestments(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  const selectAllPendingPayments = () => {
    const pendingPayments = investments
      .filter(inv => inv.paymentStatus === 'pending')
      .map(inv => inv.investmentId);
    setSelectedInvestments(new Set(pendingPayments));
    setShowBatchActions(pendingPayments.length > 0);
  };

  const clearSelection = () => {
    setSelectedInvestments(new Set());
    setShowBatchActions(false);
  };

  const handleBatchApproval = async () => {
    try {
      setBatchActionLoading(true);
      const investmentIds = Array.from(selectedInvestments);
      
      const result = await batchApproveInvestments(investmentIds, 'Batch approved after payment confirmation');
      
      if (result.successful.length > 0) {
        // Send notifications for successful approvals
        for (const investmentId of result.successful) {
          const investment = investments.find(inv => inv.investmentId === investmentId);
          if (investment) {
            await notificationService.createInvestmentApprovalNotification(
              investment,
              getLotName(investment.parkingLotId)
            );
          }
        }
      }
      
      let message = `Successfully approved ${result.successful.length} investments.`;
      if (result.failed.length > 0) {
        message += ` ${result.failed.length} failed.`;
      }
      
      Alert.alert('Batch Approval Complete', message);
      
      // Clear selection and refresh data
      clearSelection();
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', `Batch approval failed: ${error.message}`);
    } finally {
      setBatchActionLoading(false);
    }
  };

  // New combined handler for payment confirmation and approval
  const handlePaymentConfirmationAndApproval = async (investmentId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${investmentId}-${action}`);
      
      // Find the investment to get user details
      const investment = investments.find(inv => inv.investmentId === investmentId);
      if (!investment) {
        throw new Error('Investment not found');
      }
      
      if (action === 'approve') {
        // First confirm payment, then approve
        await approveInvestmentAfterPayment(investmentId, 'Payment confirmed and approved');
        
        // Send approval notification
        await notificationService.createInvestmentApprovalNotification(
          investment,
          getLotName(investment.parkingLotId)
        );
        
        Alert.alert('Success', 'Payment confirmed and investment approved!');
      } else {
        // Reject payment
        await handleInvestmentStatusUpdate(investmentId, 'failed');
        Alert.alert('Payment Rejected', 'The payment has been rejected.');
      }
      
      // Close modal and refresh data
      setShowPaymentConfirmModal(false);
      setSelectedInvestment(null);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminApproval = async (investmentId: string, approved: boolean) => {
    try {
      setActionLoading(`${investmentId}-${approved ? 'approve' : 'reject'}`);
      
      // Find the investment to get user details
      const investment = investments.find(inv => inv.investmentId === investmentId);
      if (!investment) {
        throw new Error('Investment not found');
      }
      
      if (approved) {
        await approveInvestment(investmentId);
        
        // Send approval notification
        await notificationService.createInvestmentApprovalNotification(
          investment,
          getLotName(investment.parkingLotId)
        );
        
        Alert.alert('Success', 'Investment approved and added to user portfolio');
      } else {
        await rejectInvestment(investmentId, 'Payment verification failed');
        
        // Send rejection notification
        await notificationService.createInvestmentRejectionNotification(
          investment,
          getLotName(investment.parkingLotId),
          'Payment verification failed'
        );
        
        Alert.alert('Success', 'Investment rejected - user will be notified');
      }
      
      // Refresh data to show updated status
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', `Failed to ${approved ? 'approve' : 'reject'} investment: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getUserName = (userId: string) => {
    if (!userId || userId === 'current-user-id') {
      return 'Invalid User';
    }
    if (users.length === 0) {
      return 'Loading...';
    }
    const user = users.find(u => u.uid === userId);
    return user?.name || 'Unknown User';
  };

  const getUserEmail = (userId: string) => {
    if (!userId || userId === 'current-user-id') {
      return 'Invalid User Email';
    }
    if (users.length === 0) {
      return 'Loading...';
    }
    const user = users.find(u => u.uid === userId);
    return user?.email || 'Unknown Email';
  };

  const getLotName = (parkingLotId: string) => {
    const lot = parkingLots.find(l => l.id === parkingLotId);
    return lot?.name || 'Unknown Lot';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
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
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search investments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.debugButton}
          onPress={createTestInvestments}
          disabled={actionLoading === 'creating-test-investments'}
        >
          {actionLoading === 'creating-test-investments' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.debugButtonText}>Create Test Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterScrollContainer}
      >
        {currentFilters.map((filter) => (
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

      {/* Batch Actions Bar */}
      {showBatchActions && (
        <View style={styles.batchActionsBar}>
          <View style={styles.batchInfo}>
            <Text style={styles.batchInfoText}>
              {selectedInvestments.size} selected
            </Text>
          </View>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchButton, styles.batchApproveButton]}
              onPress={handleBatchApproval}
              disabled={batchActionLoading}
            >
              {batchActionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.batchButtonText}>✓ Approve All</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchButton, styles.batchClearButton]}
              onPress={clearSelection}
            >
              <Text style={styles.batchButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      {!showBatchActions && investments.filter(inv => inv.paymentStatus === 'pending').length > 0 && (
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.selectAllButton]}
            onPress={selectAllPendingPayments}
          >
            <Text style={styles.quickActionText}>Select All Pending</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Data List */}
      <ScrollView
        style={styles.dataList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Investments List */}
        {(filteredData as Investment[]).map((investment) => (
          <View key={investment.investmentId} style={styles.dataCard}>
            <TouchableOpacity
              style={styles.dataCardHeader}
              onPress={() => {
                // Toggle selection for investments
                toggleInvestmentSelection(investment.investmentId);
              }}
            >
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleInvestmentSelection(investment.investmentId)}
              >
                <Text style={styles.checkboxText}>
                  {selectedInvestments.has(investment.investmentId) ? '☑️' : '☐'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.dataInfo}>
                <View style={styles.dataNameRow}>
                  <Text style={styles.dataTitle}>
                    {getUserName(investment.userId)}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusIcon}>{getStatusIcon(investment.paymentStatus || 'unknown')}</Text>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(investment.paymentStatus || 'unknown') }
                    ]}>
                      {investment.paymentStatus ? investment.paymentStatus.toUpperCase() : 'UNKNOWN'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.dataSubtitle}>{getUserEmail(investment.userId)}</Text>
                <Text style={styles.dataDetail}>
                  Lot: {getLotName(investment.parkingLotId)}
                </Text>
                <Text style={styles.dataAmount}>
                  Amount: {formatCurrency(investment.amount)}
                </Text>
                <Text style={styles.dataDate}>
                  Created: {formatDate(investment.createdAt)}
                </Text>
                <Text style={styles.leaseStatus}>
                  Lease: {investment.leaseAccepted ? '✅ Accepted' : '⏳ Pending'}
                </Text>
                {investment.adminApprovalStatus && (
                  <Text style={[styles.leaseStatus, {
                    color: investment.adminApprovalStatus === 'approved' ? '#34C759' : 
                           investment.adminApprovalStatus === 'rejected' ? '#FF3B30' : '#FF9500'
                  }]}>
                    Admin: {investment.adminApprovalStatus === 'pending' ? '⏳ Pending Approval' : 
                            investment.adminApprovalStatus === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.dataActions}>
              {investment.paymentStatus === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => openPaymentConfirmModal(investment)}
                  disabled={actionLoading?.startsWith(investment.investmentId)}
                >
                  <Text style={styles.actionButtonText}>Review Payment</Text>
                </TouchableOpacity>
              )}
              {!investment.leaseAccepted && investment.paymentStatus === 'success' && investment.adminApprovalStatus === 'approved' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.leaseButton]}
                  onPress={() => handleLeaseStatusUpdate(investment.investmentId, true)}
                  disabled={actionLoading?.startsWith(investment.investmentId)}
                >
                  {actionLoading === `${investment.investmentId}-lease` ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>Accept Lease</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredData.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No investments found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Investments will appear here once created'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirmModal && selectedInvestment && (
        <Modal
          visible={showPaymentConfirmModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPaymentConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.paymentConfirmModal}>
              <Text style={styles.modalTitle}>Payment Confirmation</Text>
              
              <View style={styles.investmentDetails}>
                <Text style={styles.detailLabel}>Investment ID:</Text>
                <Text style={styles.detailValue}>{selectedInvestment.investmentId}</Text>
                
                <Text style={styles.detailLabel}>Investor:</Text>
                <Text style={styles.detailValue}>{getUserName(selectedInvestment.userId)}</Text>
                
                <Text style={styles.detailLabel}>Parking Lot:</Text>
                <Text style={styles.detailValue}>{getLotName(selectedInvestment.parkingLotId)}</Text>
                
                <Text style={styles.detailLabel}>Investment Amount:</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedInvestment.amount)}</Text>
                
                <Text style={styles.detailLabel}>Investment Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedInvestment.createdAt)}</Text>
                
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>Offline Payment</Text>
              </View>
              
              <View style={styles.confirmationActions}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.approveModalButton]}
                  onPress={() => handlePaymentConfirmationAndApproval(selectedInvestment.investmentId, 'approve')}
                  disabled={actionLoading?.startsWith(selectedInvestment.investmentId)}
                >
                  {actionLoading === `${selectedInvestment.investmentId}-approve` ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>✓ Approve Payment & Investment</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, styles.rejectModalButton]}
                  onPress={() => handlePaymentConfirmationAndApproval(selectedInvestment.investmentId, 'reject')}
                  disabled={actionLoading?.startsWith(selectedInvestment.investmentId)}
                >
                  {actionLoading === `${selectedInvestment.investmentId}-reject` ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>✗ Reject Payment</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, styles.cancelModalButton]}
                  onPress={() => setShowPaymentConfirmModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  activeViewToggle: {
    backgroundColor: '#007AFF',
  },
  viewToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeViewToggleText: {
    color: 'white',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    flex: 1,
  },
  debugButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
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
    minWidth: 70,
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
    minWidth: 80,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  bulkActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  dataList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dataCard: {
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
  dataCardHeader: {
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
  dataInfo: {
    flex: 1,
  },
  dataNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataTitle: {
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
  dataSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dataDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dataAmount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  dataDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  leaseStatus: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dataActions: {
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
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  leaseButton: {
    backgroundColor: '#007AFF',
  },
  markPaidButton: {
    backgroundColor: '#34C759',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oneClickButton: {
    backgroundColor: '#34C759',
  },
  batchActionsBar: {
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchInfo: {
    flex: 1,
  },
  batchInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  batchApproveButton: {
    backgroundColor: '#34C759',
  },
  batchClearButton: {
    backgroundColor: '#8E8E93',
  },
  batchButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsBar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  selectAllButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2196F3',
  },
  payoutModalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  payoutModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  payoutModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  payoutFormGroup: {
    marginBottom: 20,
  },
  payoutFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  payoutFormInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  payoutModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  payoutModalButton: {
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
    fontSize: 14,
    fontWeight: '500',
  },
  createPayoutButton: {
    backgroundColor: '#007AFF',
  },
  createPayoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: '#2196F3',
  },
  paymentConfirmModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  investmentDetails: {
    marginVertical: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  confirmationActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
  },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  approveModalButton: {
    backgroundColor: '#4CAF50',
  },
  rejectModalButton: {
    backgroundColor: '#f44336',
  },
});

export default InvestmentManagement;
