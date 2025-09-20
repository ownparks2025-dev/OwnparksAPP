import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
  onPress?: () => void;
  title?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'absolute' | 'relative';
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  title = 'Back',
  style,
  textStyle,
  color = '#007AFF',
  size = 'medium',
  position = 'absolute'
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: 8,
          fontSize: 14,
        };
      case 'large':
        return {
          padding: 16,
          fontSize: 18,
        };
      default:
        return {
          padding: 12,
          fontSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const positionStyle = position === 'absolute' ? styles.absolute : styles.relative;
  
  // Calculate safe area offset for better positioning
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const safeAreaOffset = Platform.OS === 'ios' ? 44 : statusBarHeight;

  return (
    <TouchableOpacity
      style={[
        styles.backButton,
        positionStyle,
        { padding: sizeStyles.padding },
        position === 'absolute' && { top: safeAreaOffset + 10 },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.backButtonText,
        { color, fontSize: sizeStyles.fontSize },
        textStyle
      ]}>
        ← {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  absolute: {
    position: 'absolute',
    left: 20,
  },
  relative: {
    alignSelf: 'flex-start',
    margin: 10,
  },
  backButtonText: {
    fontWeight: '600',
  },
});

export default BackButton;