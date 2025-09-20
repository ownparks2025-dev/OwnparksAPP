import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NavigationProps, ParkingLot } from '../types';
import { createInvestment, getParkingLotById } from '../services/firebase';
import { validateEmail } from '../utils/validation';
// Removed PaymentGateway import - using offline payment flow
import { notificationService } from '../services/notifications';
import { generateLeaseAgreementPDF, formatCurrency, formatPercentage } from '../utils/pdfGenerator';

const { width } = Dimensions.get('window');

interface InvestmentFlowScreenProps extends NavigationProps {
  route: {
    params: {
      parkingLot: ParkingLot;
      investmentAmount: number;
      selectedLots: number;
    };
  };
}

const InvestmentFlowScreen: React.FC<InvestmentFlowScreenProps> = ({ navigation, route }) => {
  const { parkingLot, investmentAmount, selectedLots } = route.params;
  const [currentStep, setCurrentStep] = useState(1);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Removed paymentGatewayVisible state - using offline payment flow

  const totalSteps = 3;
  const monthlyReturn = (investmentAmount * parkingLot.roi) / 100 / 12;
  const annualReturn = (investmentAmount * parkingLot.roi) / 100;

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAgreementToggle = () => {
    setAgreementAccepted(!agreementAccepted);
  };

  const handleDownloadAgreement = async () => {
    try {
      await generateLeaseAgreementPDF({
        parkingLot,
        investmentAmount,
        monthlyReturn,
        investorName: 'Current User', // This should come from user context
        investorEmail: 'user@example.com', // This should come from user context
        agreementDate: new Date(),
      });
    } catch (error) {
      console.error('Error downloading agreement:', error);
      Alert.alert('Download Failed', 'Unable to download the agreement. Please try again.');
    }
  };

  const handleProceedToPayment = () => {
    if (!agreementAccepted) {
      Alert.alert('Error', 'Please accept the lease agreement to continue');
      return;
    }
    // Navigate to offline payment screen
    navigation.navigate('OfflinePayment', {
      parkingLot,
      investmentAmount,
      selectedLots,
    });
  };

  // Removed payment success/failure handlers - using offline payment flow

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Investment Summary</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.lotName}>{parkingLot.name}</Text>
        <Text style={styles.lotLocation}>📍 {parkingLot.location}</Text>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Number of Lots</Text>
          <Text style={styles.summaryValue}>{selectedLots}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Price per Lot</Text>
          <Text style={styles.summaryValue}>{formatCurrency(parkingLot.price)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Investment</Text>
          <Text style={styles.summaryValue}>{formatCurrency(investmentAmount)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Annual ROI</Text>
          <Text style={[styles.summaryValue, styles.roiValue]}>
            {formatPercentage(parkingLot.roi)}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Annual Return</Text>
          <Text style={styles.summaryValue}>{formatCurrency(annualReturn)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monthly Return</Text>
          <Text style={styles.summaryValue}>{formatCurrency(monthlyReturn)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lease Term</Text>
          <Text style={styles.summaryValue}>12 months</Text>
        </View>
      </View>
      
      <Text style={styles.stepDescription}>
        Review your investment details above. This investment will generate monthly returns 
        of {formatCurrency(monthlyReturn)} for the next 12 months.
      </Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lease Agreement</Text>
      
      <View style={styles.agreementContainer}>
        <Text style={styles.agreementTitle}>Parking Space Lease Agreement</Text>
        
        <ScrollView style={styles.agreementContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.agreementText}>
            This agreement is made between OwnParks (hereinafter "Lessor") and the investor 
            (hereinafter "Lessee") for the lease of parking space at {parkingLot.location}.
            {'\n\n'}
            <Text style={styles.agreementSection}>1. LEASE TERM</Text>
            The lease term shall be 12 months commencing from the date of investment.
            {'\n\n'}
            <Text style={styles.agreementSection}>2. MONTHLY PAYMENTS</Text>
            Lessor shall pay Lessee monthly returns of {formatCurrency(monthlyReturn)} 
            on the 1st day of each month.
            {'\n\n'}
            <Text style={styles.agreementSection}>3. INVESTMENT AMOUNT</Text>
            Lessee invests {formatCurrency(investmentAmount)} for a {formatPercentage(parkingLot.roi)} 
            annual return on investment.
            {'\n\n'}
            <Text style={styles.agreementSection}>4. EARLY TERMINATION</Text>
            Early withdrawal available with 30-day written notice to OwnParks.
            {'\n\n'}
            <Text style={styles.agreementSection}>5. SECURITY</Text>
            Investment is secured by real estate assets and legal documentation.
            {'\n\n'}
            <Text style={styles.agreementSection}>6. GOVERNING LAW</Text>
            This agreement is governed by the laws of India.
          </Text>
        </ScrollView>
        
        {/* Download Agreement Button */}
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadAgreement}
          activeOpacity={0.7}
        >
          <Text style={styles.downloadButtonIcon}>📄</Text>
          <Text style={styles.downloadButtonText}>Download Agreement (PDF)</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.agreementToggle}
        onPress={handleAgreementToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>
          {agreementAccepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.agreementToggleText}>
          I have read and agree to the lease agreement terms
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Complete Investment</Text>
      
      <View style={styles.finalSummaryCard}>
        <Text style={styles.finalSummaryTitle}>Final Investment Summary</Text>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Parking Lot</Text>
          <Text style={styles.finalSummaryValue}>{parkingLot.name}</Text>
        </View>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Location</Text>
          <Text style={styles.finalSummaryValue}>{parkingLot.location}</Text>
        </View>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Investment Amount</Text>
          <Text style={styles.finalSummaryValue}>{formatCurrency(investmentAmount)}</Text>
        </View>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Annual ROI</Text>
          <Text style={[styles.finalSummaryValue, styles.roiValue]}>
            {formatPercentage(parkingLot.roi)}
          </Text>
        </View>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Monthly Return</Text>
          <Text style={styles.finalSummaryValue}>{formatCurrency(monthlyReturn)}</Text>
        </View>
        
        <View style={styles.finalSummaryRow}>
          <Text style={styles.finalSummaryLabel}>Lease Term</Text>
          <Text style={styles.finalSummaryValue}>12 months</Text>
        </View>
      </View>
      
      <Text style={styles.stepDescription}>
        By completing this investment, you agree to the lease terms and will start 
        receiving monthly returns of {formatCurrency(monthlyReturn)} starting next month.
      </Text>
      
      <TouchableOpacity
        style={[styles.completeButton, loading && styles.disabledButton]}
        onPress={handleProceedToPayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.completeButtonText}>Proceed to Payment</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

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
        <Text style={styles.headerTitle}>Investment Flow</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>

      {/* Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
              </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.previousButton}
            onPress={handlePreviousStep}
          >
            <Text style={styles.previousButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < totalSteps && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextStep}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Removed PaymentGateway Modal - using offline payment flow */}
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lotName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  lotLocation: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  roiValue: {
    color: '#34C759',
  },
  agreementContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  agreementContent: {
    maxHeight: 300,
  },
  agreementText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  agreementSection: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  agreementToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  agreementToggleText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  finalSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  finalSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  finalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  finalSummaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  finalSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  previousButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  previousButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  downloadButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  downloadButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default InvestmentFlowScreen;

