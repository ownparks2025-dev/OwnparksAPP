import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NavigationProps, Investment, ParkingLot } from '../types';
import SimpleLogo from '../components/SimpleLogo';
import { getUserInvestments, getParkingLotById, auth } from '../services/firebase';
import { getCurrentUserRole } from '../services/admin';
import { formatCurrency } from '../utils/pdfGenerator';

interface PortfolioInvestment extends Investment {
  parkingLot?: ParkingLot | null;
}

const MainAppScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [portfolioStats, setPortfolioStats] = useState({
    totalInvested: 0,
    activeInvestments: 0,
    monthlyReturns: 0,
  });
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'super_admin' | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    loadPortfolioStats();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      setRoleLoading(true);
      const role = await getCurrentUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('user'); // Default to user role on error
    } finally {
      setRoleLoading(false);
    }
  };

  const loadPortfolioStats = async () => {
    try {
      setPortfolioLoading(true);
      setPortfolioError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setPortfolioError('Please login to view your portfolio');
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

      const totalInvested = investmentsWithLots.reduce((sum, inv) => sum + inv.amount, 0);
      const monthlyReturns = investmentsWithLots.reduce((sum, inv) => {
        if (inv.parkingLot) {
          return sum + (inv.amount * inv.parkingLot.roi) / 100 / 12;
        }
        return sum;
      }, 0);

      setPortfolioStats({
        totalInvested,
        activeInvestments: investmentsWithLots.length,
        monthlyReturns,
      });
    } catch (error: any) {
      console.error('Error loading portfolio stats:', error);
      
      // Provide specific error messages based on error type
      if (error.message?.includes('Missing or insufficient permissions')) {
        setPortfolioError('Database permissions need to be configured. Please contact support.');
      } else if (error.message?.includes('permission-denied')) {
        setPortfolioError('Access denied. Please ensure you are logged in with a valid account.');
      } else if (error.message?.includes('unavailable')) {
        setPortfolioError('Service temporarily unavailable. Please try again later.');
      } else {
        setPortfolioError('Unable to load portfolio data. Please try again.');
      }
    } finally {
      setPortfolioLoading(false);
    }
  };
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SimpleLogo size={40} showText={false} />
        <Text style={styles.headerTitle}>OwnParks</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate('Landing')}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Welcome to OwnParks!</Text>
          <Text style={styles.welcomeSubtitle}>
            Your parking investment journey starts here
          </Text>
        </View>

        {/* Main Features Grid */}
        <View style={styles.featuresGrid}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Browse')}
          >
            <Text style={styles.featureIcon}>🔍</Text>
            <Text style={styles.featureTitle}>Browse Parking Spots</Text>
            <Text style={styles.featureDescription}>
              Discover available investment opportunities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureTitle}>My Portfolio</Text>
            <Text style={styles.featureDescription}>
              Track your investments and returns
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.featureIcon}>👤</Text>
            <Text style={styles.featureTitle}>Profile & KYC</Text>
            <Text style={styles.featureDescription}>
              Manage your account and verification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.featureIcon}>🔔</Text>
            <Text style={styles.featureTitle}>Notifications</Text>
            <Text style={styles.featureDescription}>
              Stay updated on your investments
            </Text>
          </TouchableOpacity>

          {/* Admin Panel - Only visible to admins and super admins */}
          {!roleLoading && (userRole === 'admin' || userRole === 'super_admin') && (
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('Admin')}
            >
              <Text style={styles.featureIcon}>⚙️</Text>
              <Text style={styles.featureTitle}>Admin Panel</Text>
              <Text style={styles.featureDescription}>
                Manage app data and settings
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Investment Stats Preview */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Investment Overview</Text>
          
          {portfolioLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading portfolio data...</Text>
            </View>
          ) : portfolioError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{portfolioError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={loadPortfolioStats}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(portfolioStats.totalInvested)}</Text>
                <Text style={styles.statLabel}>Total Invested</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{portfolioStats.activeInvestments}</Text>
                <Text style={styles.statLabel}>Active Investments</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(portfolioStats.monthlyReturns)}</Text>
                <Text style={styles.statLabel}>Monthly Returns</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Start Guide */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideTitle}>Getting Started</Text>
          <View style={styles.guideSteps}>
            <View style={styles.guideStep}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Browse available parking spots</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Review details and ROI</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Complete investment process</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Start earning monthly returns</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('Browse')}
        >
          <Text style={styles.browseButtonText}>Start Investing Now</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Landing')}
        >
          <Text style={styles.backButtonText}>Back to Landing</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
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
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  guideContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  guideSteps: {
    gap: 16,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
  },
  stepText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
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
  browseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainAppScreen;
