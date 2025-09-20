import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface LogoProps {
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
}

const Logo: React.FC<LogoProps> = ({ size = 80, showText = true, style }) => {
  const logoSize = size;
  const textSize = size * 0.22;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.logoContainer, { width: logoSize, height: logoSize }]}>
        <Svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 200 150"
        >
          {/* Building structure with red and white horizontal stripes in 3D perspective */}
          <Path
            d="M 30 40 L 170 25 L 170 50 L 30 65 Z"
            fill="#CC0000"
          />
          <Path
            d="M 30 65 L 170 50 L 170 75 L 30 90 Z"
            fill="#FFFFFF"
            stroke="#CC0000"
            strokeWidth="1"
          />
          <Path
            d="M 30 90 L 170 75 L 170 100 L 30 115 Z"
            fill="#CC0000"
          />
          <Path
            d="M 30 115 L 170 100 L 170 125 L 30 140 Z"
            fill="#FFFFFF"
            stroke="#CC0000"
            strokeWidth="1"
          />
          <Path
            d="M 30 140 L 170 125 L 170 150 L 30 165 Z"
            fill="#CC0000"
          />
          
          {/* Building outline with 3D effect */}
          <Path
            d="M 30 40 L 170 25 L 170 150 L 30 165 Z"
            fill="none"
            stroke="#CC0000"
            strokeWidth="2"
          />
          
          {/* Side face for 3D effect */}
          <Path
            d="M 170 25 L 185 35 L 185 160 L 170 150 Z"
            fill="#AA0000"
            stroke="#CC0000"
            strokeWidth="1"
          />
          
          {/* Top face for 3D effect */}
          <Path
            d="M 30 40 L 45 30 L 185 35 L 170 25 Z"
            fill="#DD0000"
            stroke="#CC0000"
            strokeWidth="1"
          />
        </Svg>
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
    marginBottom: 8,
  },
  logoText: {
    color: '#1a237e',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default Logo;
