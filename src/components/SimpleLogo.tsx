import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';

interface SimpleLogoProps {
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
}

const SimpleLogo: React.FC<SimpleLogoProps> = ({ size = 80, showText = true, style }) => {
  const logoSize = size;
  const textSize = size * 0.22;
  const buildingWidth = logoSize * 0.9;
  const buildingHeight = logoSize * 0.6;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.logoContainer, { width: logoSize, height: logoSize }]}>
        <Image 
          source={require('../../assets/oplogo.webp')}
          style={[
            styles.logoImage,
            { 
              width: logoSize, 
              height: logoSize
            }
          ]}
          resizeMode="contain"
        />
      </View>
      
      {showText && (
        <Text style={[styles.logoText, { fontSize: textSize }]}>
          OWN PARKS
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 10,
  },
  logoImage: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logoText: {
    color: '#1a237e',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default SimpleLogo;
