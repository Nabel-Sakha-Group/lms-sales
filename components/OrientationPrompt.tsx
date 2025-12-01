import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from 'hooks/useResponsive';

export default function OrientationPrompt() {
  const { isTablet, isLandscape } = useResponsive();

  // Only show prompt for tablets in portrait mode
  if (!isTablet || isLandscape) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.promptContainer}>
        <Text style={styles.rotateIcon}>📱➡️🖥️</Text>
        <Text style={styles.promptTitle}>Better Experience Available</Text>
        <Text style={styles.promptMessage}>
          Rotate your device to landscape mode for the optimal tablet experience
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  promptContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    maxWidth: 350,
  },
  rotateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  promptTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  promptMessage: {
    color: '#d1d5db',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});