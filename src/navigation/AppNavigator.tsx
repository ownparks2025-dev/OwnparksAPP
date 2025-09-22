import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/LandingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import MainAppScreen from '../screens/MainAppScreen';
import BrowseScreen from '../screens/BrowseScreen';
import LotDetailsScreen from '../screens/LotDetailsScreen';
import InvestmentFlowScreen from '../screens/InvestmentFlowScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AdminAuthScreen from '../screens/AdminAuthScreen';
import AdminScreen from '../screens/AdminScreen';
import SupportScreen from '../screens/SupportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OfflinePaymentScreen from '../screens/OfflinePaymentScreen';
import { ParkingLot } from '../types';

export type RootStackParamList = {
  Landing: undefined;
  Register: undefined;
  Login: undefined;
  MainApp: undefined;
  Browse: undefined;
  LotDetails: { lotId: string };
  InvestmentFlow: { parkingLot: ParkingLot; investmentAmount: number; selectedLots: number };
  OfflinePayment: { parkingLot: ParkingLot; investmentAmount: number; selectedLots: number };
  Portfolio: undefined;
  Profile: undefined;
  Notifications: undefined;
  Support: undefined;
  InvestmentDetails: { investmentId: string };
  AdminAuth: undefined;
  Admin: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Main App Flow */}
        <Stack.Screen name="MainApp" component={MainAppScreen} />
        <Stack.Screen name="Browse" component={BrowseScreen} />
        <Stack.Screen name="LotDetails" component={LotDetailsScreen} />
        <Stack.Screen name="InvestmentFlow" component={InvestmentFlowScreen} />
        <Stack.Screen name="OfflinePayment" component={OfflinePaymentScreen} />
        <Stack.Screen name="Portfolio" component={PortfolioScreen} />
        
        {/* Placeholder screens for future implementation */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="InvestmentDetails" component={PortfolioScreen} />
        
        {/* Admin Flow */}
        <Stack.Screen name="AdminAuth" component={AdminAuthScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
