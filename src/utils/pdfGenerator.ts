import { Platform, Alert, Linking } from 'react-native';
import { ParkingLot } from '../types';

// Helper functions
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  return `₹${amount.toLocaleString()}`;
};

export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

interface LeaseAgreementData {
  parkingLot: ParkingLot;
  investmentAmount: number;
  monthlyReturn: number;
  investorName?: string;
  investorEmail?: string;
  agreementDate: Date;
}

export const generateLeaseAgreementPDF = async (data: LeaseAgreementData): Promise<void> => {
  try {
    const { parkingLot, investmentAmount, monthlyReturn, investorName, investorEmail, agreementDate } = data;

    // Redirect to Google Docs lease agreement - using view link for better compatibility
    const agreementUrl = 'https://docs.google.com/document/d/1IfNZwKTIevmWa-zy0jLPAjBv739_DPLP/edit?usp=sharing';
    
    // For web platform, directly open the URL
    if (Platform.OS === 'web') {
      window.open(agreementUrl, '_blank');
      Alert.alert(
        'Lease Agreement Opened',
        `Lease agreement has been opened in a new tab.\n\nParking Lot: ${parkingLot.name}\nInvestment: ${formatCurrency(investmentAmount)}`,
        [{ text: 'OK' }]
      );
    } else {
      // For mobile platforms, use Linking
      try {
        await Linking.openURL(agreementUrl);
        Alert.alert(
          'Lease Agreement Opened',
          `Lease agreement has been opened in your browser.\n\nParking Lot: ${parkingLot.name}\nInvestment: ${formatCurrency(investmentAmount)}`,
          [{ text: 'OK' }]
        );
      } catch (linkingError) {
        console.error('Linking error:', linkingError);
        Alert.alert(
          'Unable to Open Agreement',
          'Unable to open the lease agreement. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    }
  } catch (error) {
    console.error('Error opening lease agreement:', error);
    Alert.alert(
      'Unable to Open Agreement',
      'Unable to open the lease agreement. Please try again or contact support.',
      [{ text: 'OK' }]
    );
  }
};