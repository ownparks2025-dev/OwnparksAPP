import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { ParkingLot } from '../types';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getParkingLotById } from '../services/firebase';
import { formatCurrency, formatPercentage } from '../utils/validation';

const { width } = Dimensions.get('window');

type LotDetailsScreenProps = StackScreenProps<RootStackParamList, 'LotDetails'>;

const LotDetailsScreen: React.FC<LotDetailsScreenProps> = ({ navigation, route }) => {
  const { lotId } = route.params;
  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [selectedLots, setSelectedLots] = useState(1);

  useEffect(() => {
    loadParkingLotDetails();
  }, [lotId]);

  useEffect(() => {
    if (parkingLot) {
      setInvestmentAmount(parkingLot.price * selectedLots);
    }
  }, [selectedLots, parkingLot]);

  const loadParkingLotDetails = async () => {
    try {
      setLoading(true);
      const lot = await getParkingLotById(lotId);
      if (lot) {
        setParkingLot(lot);
        setInvestmentAmount(lot.price * selectedLots);
      } else {
        Alert.alert('Error', 'Parking lot not found');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load parking lot details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleInvestNow = () => {
    if (!parkingLot) return;
    
    navigation.navigate('InvestmentFlow', {
      parkingLot,
      investmentAmount,
      selectedLots,
    });
  };

  const handleIncreaseLots = () => {
    if (!parkingLot || selectedLots >= (parkingLot.availableLots || 1)) return;
    const newLots = selectedLots + 1;
    setSelectedLots(newLots);
    setInvestmentAmount(parkingLot.price * newLots);
  };

  const handleDecreaseLots = () => {
    if (selectedLots <= 1) return;
    const newLots = selectedLots - 1;
    setSelectedLots(newLots);
    if (parkingLot) {
      setInvestmentAmount(parkingLot.price * newLots);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parking lot details...</Text>
      </View>
    );
  }

  if (!parkingLot) {
    return null;
  }

  const monthlyReturn = (parkingLot.price * parkingLot.roi) / 100 / 12;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lot Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery Placeholder */}
        <View style={styles.imageContainer}>
          <View style={styles.mainImage}>
            <Text style={styles.imagePlaceholderText}>🏢</Text>
            <Text style={styles.imageLabel}>Parking Lot Image</Text>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.lotName}>{parkingLot.name}</Text>
          <Text style={styles.lotLocation}>📍 {parkingLot.location}</Text>
          
          <View style={styles.availabilityContainer}>
            <View style={[styles.availabilityDot, { backgroundColor: parkingLot.availability ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.availabilityText}>
              {parkingLot.availability ? 'Available for Investment' : 'Fully Invested'}
            </Text>
          </View>
        </View>

        {/* Key Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Details</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(parkingLot.price)}</Text>
              <Text style={styles.statLabel}>Total Price</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.roiValue]}>
                {formatPercentage(parkingLot.roi)}
              </Text>
              <Text style={styles.statLabel}>Annual ROI</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(monthlyReturn)}</Text>
              <Text style={styles.statLabel}>Monthly Return</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12 months</Text>
              <Text style={styles.statLabel}>Lease Term</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Location</Text>
          <Text style={styles.description}>
            {parkingLot.details || 'This premium parking location offers excellent accessibility and high demand, making it an ideal investment opportunity. Located in a strategic area with consistent vehicle traffic and limited parking availability.'}
          </Text>
        </View>

        {/* Investment Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Invest Here?</Text>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💰</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>High ROI Returns</Text>
              <Text style={styles.benefitDescription}>
                Earn {formatPercentage(parkingLot.roi)} annually with monthly payouts
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🏢</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Prime Location</Text>
              <Text style={styles.benefitDescription}>
                Strategic location with high demand and limited supply
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Secure Investment</Text>
              <Text style={styles.benefitDescription}>
                Backed by real estate assets and legal documentation
              </Text>
            </View>
          </View>
        </View>

        {/* Investment Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Calculator</Text>
          
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Number of Lots:</Text>
              <View style={styles.lotSelector}>
                <TouchableOpacity 
                  style={[styles.lotButton, selectedLots <= 1 && styles.lotButtonDisabled]} 
                  onPress={handleDecreaseLots}
                  disabled={selectedLots <= 1}
                >
                  <Text style={[styles.lotButtonText, selectedLots <= 1 && styles.lotButtonTextDisabled]}>−</Text>
                </TouchableOpacity>
                <Text style={styles.lotCount}>{selectedLots}</Text>
                <TouchableOpacity 
                  style={[styles.lotButton, selectedLots >= (parkingLot?.availableLots || 1) && styles.lotButtonDisabled]} 
                  onPress={handleIncreaseLots}
                  disabled={selectedLots >= (parkingLot?.availableLots || 1)}
                >
                  <Text style={[styles.lotButtonText, selectedLots >= (parkingLot?.availableLots || 1) && styles.lotButtonTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Available Lots:</Text>
              <Text style={styles.calculatorValue}>
                {parkingLot?.availableLots || 0} / {parkingLot?.totalLots || 0}
              </Text>
            </View>
            
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Price per Lot:</Text>
              <Text style={styles.calculatorValue}>
                {formatCurrency(parkingLot?.price || 0)}
              </Text>
            </View>
            
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Total Investment:</Text>
              <Text style={styles.calculatorValue}>
                {formatCurrency(investmentAmount)}
              </Text>
            </View>
            
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Annual Return:</Text>
              <Text style={styles.calculatorValue}>
                {formatCurrency((investmentAmount * parkingLot.roi) / 100)}
              </Text>
            </View>
            
            <View style={styles.calculatorRow}>
              <Text style={styles.calculatorLabel}>Monthly Return:</Text>
              <Text style={styles.calculatorValue}>
                {formatCurrency((investmentAmount * parkingLot.roi) / 100 / 12)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • Minimum investment period: 12 months{'\n'}
            • Monthly payouts on the 1st of each month{'\n'}
            • Early withdrawal available with 30-day notice{'\n'}
            • All investments are secured by real estate assets{'\n'}
            • KYC verification required for investment
          </Text>
        </View>
      </ScrollView>

      {/* Investment Button */}
      {parkingLot.availability && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.investButton}
            onPress={handleInvestNow}
            activeOpacity={0.8}
          >
            <Text style={styles.investButtonText}>Invest Now</Text>
            <Text style={styles.investButtonSubtext}>
              Start earning {formatPercentage(parkingLot.roi)} annually
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: 'white',
    paddingVertical: 20,
  },
  mainImage: {
    width: width - 40,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  imagePlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  lotName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  lotLocation: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  roiValue: {
    color: '#34C759',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  calculatorContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
  },
  calculatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calculatorLabel: {
    fontSize: 16,
    color: '#666',
  },
  calculatorValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  lotSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lotButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  lotButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  lotButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  lotButtonTextDisabled: {
    color: '#999',
  },
  lotCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  investButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 20,
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
  investButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  investButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
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

export default LotDetailsScreen;


