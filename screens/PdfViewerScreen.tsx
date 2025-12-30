import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Removed native PDF viewer usage
import { useRoute } from '@react-navigation/native';

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const name = route?.params?.name ?? 'PDF';

  // Placeholder: This screen is deprecated.

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.deprecated}>
        <Text style={styles.title}>PDF viewer removed</Text>
        <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Please use the Download modal to open PDFs with a reader app.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#111827',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deprecated: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
});