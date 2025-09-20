# OwnParks - Parking Investment App

A React Native mobile application for investing in parking spaces with monthly returns.

## Features

- **User Registration & KYC**: Complete user onboarding with document verification
- **Browse Parking Spots**: Search and filter available investment opportunities
- **Investment Management**: Track your portfolio and returns
- **Real-time Notifications**: Stay updated on your investments
- **Secure Payments**: Integrated payment gateway for investments

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Navigation**: React Navigation
- **State Management**: React Hooks
- **Storage**: AsyncStorage for local data

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase project setup

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OwnParks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install required packages**
   ```bash
   npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context firebase @react-native-async-storage/async-storage react-native-vector-icons expo-image-picker expo-location expo-notifications expo-font expo-splash-screen
   ```

4. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage
   - Download your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Update the Firebase configuration in `src/services/firebase.ts`

5. **Run the app**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # App screens
├── services/           # API and Firebase services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── assets/             # Images, fonts, etc.
```

## Current Status

✅ **Completed**
- Project structure setup
- TypeScript type definitions
- Landing page
- User registration with KYC form
- Login screen
- Basic navigation structure
- Firebase service layer

🚧 **In Development**
- Main app screens (Browse, Details, Dashboard)
- Investment flow
- Payment integration
- Admin panel

## Firebase Schema

The app uses the following Firestore collections:
- `users`: User profiles and KYC status
- `parkingLots`: Available parking investment opportunities
- `investments`: User investment records
- `payouts`: Monthly payout tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is proprietary software owned by OwnParks.

## Support

For support, email support@ownparks.com or create an issue in the repository.

