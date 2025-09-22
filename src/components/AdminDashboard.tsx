import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { getAdminAnalytics, getSystemStats } from '../services/admin';

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingKYC: number;
  totalParkingLots: number;
  availableLots: number;
  totalInvestments: number;
  successfulInvestments: number;
  totalInvestmentValue: number;
  totalPayouts: number;
  averageROI: number;
}

interface AnalyticsData {
  totalUsers: number;
  totalInvestment: number;
  activeParkingLots: number;
  monthlyRevenue: number;
}

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const loadData = async () => {
    try {
      const [systemStats, analyticsData] = await Promise.all([
        getSystemStats(),
        getAdminAnalytics()
      ]);
      
      setStats(systemStats);
      setAnalytics(analyticsData);
    } catch (error: any) {
      Alert.alert('Error', `Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      bounces={true}
      bouncesZoom={false}
      scrollEventThrottle={16}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time system overview</Text>
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.primaryMetric]}>
          <Text style={styles.metricValue}>{stats?.totalUsers || 0}</Text>
          <Text style={styles.metricLabel}>Total Users</Text>
        </View>
        <View style={[styles.metricCard, styles.successMetric]}>
          <Text style={styles.metricValue}>
            {formatCurrency(analytics?.totalInvestment || 0)}
          </Text>
          <Text style={styles.metricLabel}>Total Investment</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.warningMetric]}>
          <Text style={styles.metricValue}>{analytics?.activeParkingLots || 0}</Text>
          <Text style={styles.metricLabel}>Active Lots</Text>
        </View>
        <View style={[styles.metricCard, styles.infoMetric]}>
          <Text style={styles.metricValue}>
            {formatCurrency(analytics?.monthlyRevenue || 0)}
          </Text>
          <Text style={styles.metricLabel}>Monthly Revenue</Text>
        </View>
      </View>

      {/* User Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Verified Users</Text>
            <Text style={[styles.statValue, styles.successText]}>
              {stats?.verifiedUsers || 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Pending KYC</Text>
            <Text style={[styles.statValue, styles.warningText]}>
              {stats?.pendingKYC || 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Verification Rate</Text>
            <Text style={styles.statValue}>
              {stats?.totalUsers 
                ? formatPercentage((stats.verifiedUsers / stats.totalUsers) * 100)
                : '0%'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Investment Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Investment Overview</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Investments</Text>
            <Text style={styles.statValue}>{stats?.totalInvestments || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Successful Investments</Text>
            <Text style={[styles.statValue, styles.successText]}>
              {stats?.successfulInvestments || 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Investment Value</Text>
            <Text style={styles.statValue}>
              {formatCurrency(stats?.totalInvestmentValue || 0)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Payouts</Text>
            <Text style={styles.statValue}>
              {formatCurrency(stats?.totalPayouts || 0)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Success Rate</Text>
            <Text style={styles.statValue}>
              {stats?.totalInvestments 
                ? formatPercentage((stats.successfulInvestments / stats.totalInvestments) * 100)
                : '0%'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Parking Lot Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parking Lot Management</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Parking Lots</Text>
            <Text style={styles.statValue}>{stats?.totalParkingLots || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Available Lots</Text>
            <Text style={[styles.statValue, styles.successText]}>
              {stats?.availableLots || 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Occupied Lots</Text>
            <Text style={[styles.statValue, styles.warningText]}>
              {(stats?.totalParkingLots || 0) - (stats?.availableLots || 0)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average ROI</Text>
            <Text style={styles.statValue}>
              {formatPercentage(stats?.averageROI || 0)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Occupancy Rate</Text>
            <Text style={styles.statValue}>
              {stats?.totalParkingLots 
                ? formatPercentage(((stats.totalParkingLots - stats.availableLots) / stats.totalParkingLots) * 100)
                : '0%'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.card}>
          <View style={styles.insightRow}>
            <View style={styles.insightIcon}>
              <Text style={styles.insightIconText}>📈</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Revenue Growth</Text>
              <Text style={styles.insightDescription}>
                Monthly revenue: {formatCurrency(analytics?.monthlyRevenue || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.insightRow}>
            <View style={styles.insightIcon}>
              <Text style={styles.insightIconText}>👥</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>User Engagement</Text>
              <Text style={styles.insightDescription}>
                {stats?.verifiedUsers || 0} verified users out of {stats?.totalUsers || 0} total
              </Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightIcon}>
              <Text style={styles.insightIconText}>🏎️</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Parking Utilization</Text>
              <Text style={styles.insightDescription}>
                {((stats?.totalParkingLots || 0) - (stats?.availableLots || 0))} lots currently occupied
              </Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightIcon}>
              <Text style={styles.insightIconText}>💰</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Investment Performance</Text>
              <Text style={styles.insightDescription}>
                Average ROI of {formatPercentage(stats?.averageROI || 0)} across all lots
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
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
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  primaryMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  successMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  warningMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  successText: {
    color: '#34C759',
  },
  warningText: {
    color: '#FF9500',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightIconText: {
    fontSize: 20,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default AdminDashboard;
