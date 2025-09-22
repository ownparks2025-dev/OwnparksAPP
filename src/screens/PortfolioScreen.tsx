import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { NavigationProps, Investment, ParkingLot } from '../types';
import { getUserInvestments, getParkingLotById, auth, getUserProfile } from '../services/firebase';
import { validateEmail } from '../utils/validation';
import { generateLeaseAgreementPDF, formatCurrency, formatPercentage } from '../utils/pdfGenerator';

const { width } = Dimensions.get('window');

interface PortfolioInvestment extends Investment {
  parkingLot?: ParkingLot | null;
}

const PortfolioScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [investments, setInvestments] = useState<PortfolioInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'investments'>('overview');

  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please login to view your portfolio');
        return;
      }
      const userInvestments = await getUserInvestments(currentUser.uid);
      
      // Load parking lot details for each investment
      const investmentsWithLots = await Promise.all(
        userInvestments.map(async (investment) => {
          try {
            const parkingLot = await getParkingLotById(investment.parkingLotId);
            return { ...investment, parkingLot };
          } catch (error) {
            return { ...investment, parkingLot: null };
          }
        })
      );
      
      setInvestments(investmentsWithLots);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  const handleDownloadAgreement = async (investment: PortfolioInvestment) => {
    if (!investment.parkingLot) {
      Alert.alert('Error', 'Parking lot information not available for this investment.');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please login to download agreement');
        return;
      }

      const userProfile = await getUserProfile(currentUser.uid);
      const monthlyReturn = (investment.amount * investment.parkingLot.roi) / 100 / 12;
      
      await generateLeaseAgreementPDF({
        parkingLot: investment.parkingLot,
        investmentAmount: investment.amount,
        monthlyReturn,
        investorName: userProfile?.name || 'User',
        investorEmail: userProfile?.email || currentUser.email || '',
        agreementDate: investment.createdAt && typeof investment.createdAt === 'object' && 'toDate' in investment.createdAt 
          ? (investment.createdAt as any).toDate() 
          : new Date(investment.createdAt),
      });
    } catch (error) {
      console.error('Error downloading agreement:', error);
      Alert.alert('Download Failed', 'Unable to download the agreement. Please try again.');
    }
  };

  const calculatePortfolioStats = () => {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalMonthlyReturn = investments.reduce((sum, inv) => {
      if (inv.parkingLot) {
        return sum + (inv.amount * inv.parkingLot.roi) / 100 / 12;
      }
      return sum;
    }, 0);
    const totalAnnualReturn = totalMonthlyReturn * 12;
    const averageROI = totalInvested > 0 ? (totalAnnualReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalMonthlyReturn,
      totalAnnualReturn,
      averageROI,
      totalInvestments: investments.length,
    };
  };

  const renderOverview = () => {
    const stats = calculatePortfolioStats();
    
    return (
      <View style={styles.overviewContainer}>
        {/* Portfolio Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Portfolio Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatCurrency(stats.totalInvested)}</Text>
              <Text style={styles.summaryLabel}>Total Invested</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, styles.roiValue]}>
                {formatPercentage(stats.averageROI)}
              </Text>
              <Text style={styles.summaryLabel}>Avg. ROI</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatCurrency(stats.totalMonthlyReturn)}</Text>
              <Text style={styles.summaryLabel}>Monthly Return</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.totalInvestments}</Text>
              <Text style={styles.summaryLabel}>Investments</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Browse')}
            >
              <Text style={styles.quickActionIcon}>🔍</Text>
              <Text style={styles.quickActionText}>Browse More</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.quickActionIcon}>👤</Text>
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.quickActionIcon}>🔔</Text>
              <Text style={styles.quickActionText}>Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Support')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {investments.length > 0 ? (
            <View style={styles.activityList}>
              {investments.slice(0, 3).map((investment, index) => (
                <View key={investment.investmentId} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>💰</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      Investment in {investment.parkingLot?.name || 'Parking Lot'}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      {formatCurrency(investment.amount)} • {formatDate(investment.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.activityStatus}>
                    <View style={[styles.statusDot, { backgroundColor: investment.paymentStatus === 'success' ? '#34C759' : '#FF9500' }]} />
                    <Text style={styles.statusText}>{investment.paymentStatus}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>No Investments Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start building your portfolio by investing in parking spaces
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Browse')}
              >
                <Text style={styles.emptyStateButtonText}>Browse Opportunities</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderInvestments = () => {
    if (investments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateTitle}>No Investments Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start building your portfolio by investing in parking spaces
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Browse')}
          >
            <Text style={styles.emptyStateButtonText}>Browse Opportunities</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.investmentsList}>
        {investments.map((item) => (
          <View key={item.investmentId} style={styles.investmentCard}>
            <View style={styles.investmentHeader}>
              <Text style={styles.investmentName}>
                {item.parkingLot?.name || 'Parking Lot'}
              </Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: item.paymentStatus === 'success' ? '#e8f5e8' : '#fff3cd' }]}>
                  <Text style={[styles.statusText, { color: item.paymentStatus === 'success' ? '#2e7d32' : '#856404' }]}>
                    {item.paymentStatus}
                  </Text>
                </View>
                {item.adminApprovalStatus && (
                  <View style={[styles.statusBadge, { 
                    backgroundColor: item.adminApprovalStatus === 'approved' ? '#e8f5e8' : 
                                   item.adminApprovalStatus === 'rejected' ? '#ffebee' : '#fff3cd',
                    marginTop: 4
                  }]}>
                    <Text style={[styles.statusText, { 
                      color: item.adminApprovalStatus === 'approved' ? '#2e7d32' : 
                             item.adminApprovalStatus === 'rejected' ? '#c62828' : '#856404'
                    }]}>
                      Admin: {item.adminApprovalStatus}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <Text style={styles.investmentLocation}>
              📍 {item.parkingLot?.location || 'Location not available'}
            </Text>
            
            <View style={styles.investmentStats}>
              <View style={styles.investmentStat}>
                <Text style={styles.statLabel}>Investment</Text>
                <Text style={styles.statValue}>{formatCurrency(item.amount)}</Text>
              </View>
              
              <View style={styles.investmentStat}>
                <Text style={styles.statLabel}>ROI</Text>
                <Text style={[styles.statValue, styles.roiValue]}>
                  {item.parkingLot ? formatPercentage(item.parkingLot.roi) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.investmentStat}>
                <Text style={styles.statLabel}>Monthly Return</Text>
                <Text style={styles.statValue}>
                  {item.parkingLot ? formatCurrency((item.amount * item.parkingLot.roi) / 100 / 12) : 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={styles.investmentFooter}>
              <Text style={styles.investmentDate}>
                Invested on {formatDate(item.createdAt)}
              </Text>
              
              <View style={styles.investmentActions}>
                <TouchableOpacity
                  style={styles.downloadAgreementButton}
                  onPress={() => handleDownloadAgreement(item)}
                >
                  <Text style={styles.downloadAgreementButtonText}>📄 Agreement</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => navigation.navigate('InvestmentDetails', { investmentId: item.investmentId })}
                >
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCurrentTab = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverview();
      case 'investments':
        return renderInvestments();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Portfolio</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'investments' && styles.activeTab]}
          onPress={() => setSelectedTab('investments')}
        >
          <Text style={[styles.tabText, selectedTab === 'investments' && styles.activeTabText]}>
            Investments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderCurrentTab()}
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: (width - 80) / 2,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  roiValue: {
    color: '#34C759',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 80) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  recentActivityContainer: {
    marginBottom: 24,
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: 16,
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  activityStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
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
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  investmentsList: {
    padding: 20,
  },
  investmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  investmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  investmentLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  investmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  investmentStat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  investmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  investmentDate: {
    fontSize: 12,
    color: '#666',
  },
  investmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadAgreementButton: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  downloadAgreementButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
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
});

export default PortfolioScreen;
