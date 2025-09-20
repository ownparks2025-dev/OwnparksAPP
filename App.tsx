// Initialize Firebase first, before any other imports
import './src/services/firebase';

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/components/LoadingScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Simulate app initialization (you can add actual initialization logic here)
    const initializeApp = async () => {
      try {
        // Add any app initialization logic here
        // For example: loading user preferences, checking authentication, etc.
        await new Promise(resolve => setTimeout(resolve, 1000)); // Minimum loading time
        setAppReady(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setAppReady(true); // Still proceed even if there's an error
      }
    };

    initializeApp();
  }, []);

  const handleLoadingComplete = () => {
    if (appReady) {
      setIsLoading(false);
    }
  };

  // Show loading screen while app is initializing
  if (isLoading) {
    return (
      <>
        <StatusBar style="auto" />
        <LoadingScreen onLoadingComplete={handleLoadingComplete} />
      </>
    );
  }

  // Show main app once loading is complete
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
