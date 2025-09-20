import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NavigationProps, ParkingLot } from '../types';
import { formatCurrency, formatPercentage } from '../utils/pdfGenerator';
import { createPendingInvestment } from '../services/firebase';
import { auth } from '../services/firebase';

interface OfflinePaymentScreenProps extends NavigationProps {
  route: {
    params: {
      parkingLot: ParkingLot;
      investmentAmount: number;
      selectedLots: number;
    };
  };
}

const OfflinePaymentScreen: React.FC<OfflinePaymentScreenProps> = ({ navigation, route }) => {
  const { parkingLot, investmentAmount, selectedLots } = route.params;
  const [loading, setLoading] = useState(false);
  const [investmentCreated, setInvestmentCreated] = useState(false);
  const monthlyReturn = (investmentAmount * parkingLot.roi) / 100 / 12;
  const annualReturn = (investmentAmount * parkingLot.roi) / 100;

  useEffect(() => {
    createPendingInvestmentRecord();
  }, []);

  const createPendingInvestmentRecord = async () => {
    if (!auth.currentUser || investmentCreated) return;
    
    try {
      setLoading(true);
      await createPendingInvestment(
        auth.currentUser.uid,
        parkingLot.id,
        investmentAmount,
        selectedLots,
        'offline'
      );
      setInvestmentCreated(true);
      
      Alert.alert(
        'Investment Submitted',
        'Your investment request has been submitted for admin approval. You will be notified once the payment is verified.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to submit investment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Options',
      'Choose how you would like to contact us:',
      [
        {
          text: 'Call',
          onPress: () => Linking.openURL('tel:+911234567890'),
        },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:payments@ownparks.com?subject=Investment Payment - ' + parkingLot.name),
        },
        {
          text: 'WhatsApp',
          onPress: () => Linking.openURL('https://wa.me/911234567890?text=Hi, I want to make payment for my investment in ' + parkingLot.name),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleBackToPortfolio = () => {
    navigation.navigate('Portfolio');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Submitting your investment...</Text>
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
        <Text style={styles.headerTitle}>Payment Information</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Investment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Investment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Parking Lot</Text>
            <Text style={styles.summaryValue}>{parkingLot.name}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue}>{parkingLot.location}</Text>
          </View>
          
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
            <Text style={styles.summaryLabel}>Monthly Return</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlyReturn)}</Text>
          </View>
        </View>

        {/* Payment Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Text style={styles.noticeIconText}>💳</Text>
          </View>
          
          <Text style={styles.noticeTitle}>Offline Payment Required</Text>
          
          <Text style={styles.noticeDescription}>
            We are currently not accepting online payments. Please contact us to complete your investment payment through our secure offline payment methods.
          </Text>
          
          <View style={styles.paymentMethods}>
            <Text style={styles.methodsTitle}>Available Payment Methods:</Text>
            <Text style={styles.methodItem}>• Bank Transfer (NEFT/RTGS)</Text>
            <Text style={styles.methodItem}>• UPI Payment</Text>
            <Text style={styles.methodItem}>• Cheque/DD</Text>
            <Text style={styles.methodItem}>• Cash Deposit</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact Information</Text>
          
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+91 12345 67890</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>✉️</Text>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>payments@ownparks.com</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>💬</Text>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>+91 12345 67890</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>🕒</Text>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Business Hours</Text>
              <Text style={styles.contactValue}>Mon-Fri: 9 AM - 6 PM</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactUs}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>Contact Us for Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.portfolioButton}
            onPress={handleBackToPortfolio}
            activeOpacity={0.8}
          >
            <Text style={styles.portfolioButtonText}>Go to Portfolio</Text>
          </TouchableOpacity>
        </View>

        {/* Important Note */}
        <View style={styles.importantNote}>
          <Text style={styles.importantNoteTitle}>📋 Important Note</Text>
          <Text style={styles.importantNoteText}>
            Your investment will be activated and appear in your portfolio once the payment is confirmed by our admin team. You will receive a confirmation notification within 24 hours of payment verification.
          </Text>
        </View>
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
    padding: 20,
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
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
  noticeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
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
  noticeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeIconText: {
    fontSize: 24,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  noticeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  paymentMethods: {
    alignSelf: 'stretch',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  methodItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
  contactCard: {
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
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionButtons: {
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  portfolioButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  portfolioButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  importantNote: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  importantNoteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  importantNoteText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default OfflinePaymentScreen;