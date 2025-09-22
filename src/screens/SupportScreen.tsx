import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { NavigationProps } from '../types';

const SupportScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const supportEmail = 'support@ownparks.com';
  const supportPhone = '+91-9829495886'; // Support phone number

  const handleEmailPress = () => {
    const emailUrl = `mailto:${supportEmail}`;
    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(emailUrl);
        } else {
          Alert.alert(
            'Email Not Available',
            `Please contact us at: ${supportEmail}`,
            [{ text: 'OK' }]
          );
        }
      })
      .catch(() => {
        Alert.alert(
          'Email Not Available',
          `Please contact us at: ${supportEmail}`,
          [{ text: 'OK' }]
        );
      });
  };

  const handlePhonePress = () => {
    const phoneUrl = `tel:${supportPhone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert(
            'Phone Not Available',
            `Please call us at: ${supportPhone}`,
            [{ text: 'OK' }]
          );
        }
      })
      .catch(() => {
        Alert.alert(
          'Phone Not Available',
          `Please call us at: ${supportPhone}`,
          [{ text: 'OK' }]
        );
      });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeContainer}>
          <View style={styles.supportIcon}>
            <Text style={styles.supportIconText}>💬</Text>
          </View>
          <Text style={styles.welcomeTitle}>Need Help?</Text>
          <Text style={styles.welcomeSubtitle}>
            We're here to help! Contact our support team for any questions or assistance.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          
          {/* Email Support */}
          <TouchableOpacity style={styles.contactCard} onPress={handleEmailPress}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>📧</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDetail}>{supportEmail}</Text>
              <Text style={styles.contactDescription}>
                Send us an email for detailed queries
              </Text>
            </View>
            <View style={styles.contactArrow}>
              <Text style={styles.contactArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Phone Support */}
          <TouchableOpacity style={styles.contactCard} onPress={handlePhonePress}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>📞</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Phone Support</Text>
              <Text style={styles.contactDetail}>{supportPhone}</Text>
              <Text style={styles.contactDescription}>
                Call us for immediate assistance
              </Text>
            </View>
            <View style={styles.contactArrow}>
              <Text style={styles.contactArrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>How do I start investing?</Text>
            <Text style={styles.faqAnswer}>
              Browse available parking lots, select one that suits your budget, 
              and follow the investment flow to complete your purchase.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>When will I receive returns?</Text>
            <Text style={styles.faqAnswer}>
              Returns are paid monthly based on the ROI of your investment. 
              Check your portfolio for payout schedules.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>How can I track my investments?</Text>
            <Text style={styles.faqAnswer}>
              Visit your Portfolio section to see all your investments, 
              returns, and payout history in one place.
            </Text>
          </View>
        </View>

        {/* Business Hours */}
        <View style={styles.hoursContainer}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursText}>Monday - Friday: 9:00 AM - 6:00 PM</Text>
            <Text style={styles.hoursText}>Saturday: 10:00 AM - 4:00 PM</Text>
            <Text style={styles.hoursText}>Sunday: Closed</Text>
            <Text style={styles.hoursNote}>
              We typically respond to emails within 24 hours during business days.
            </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 60,
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
  supportIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  supportIconText: {
    fontSize: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  contactContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
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
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactIconText: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '600',
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
  },
  contactArrow: {
    marginLeft: 16,
  },
  contactArrowText: {
    fontSize: 20,
    color: '#007AFF',
  },
  faqContainer: {
    marginBottom: 32,
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  hoursContainer: {
    marginBottom: 32,
  },
  hoursCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  hoursText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
    fontWeight: '500',
  },
  hoursNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default SupportScreen;
