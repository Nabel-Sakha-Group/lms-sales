import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Pdf from 'react-native-pdf';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type PdfViewerRouteProp = RouteProp<RootStackParamList, 'PdfViewer'>;

export default function PdfViewerScreen() {
  const route = useRoute<PdfViewerRouteProp>();
  const { uri, name } = route.params;

  const source = { uri, cache: true };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
      </View>
      <Pdf
        source={source}
        style={styles.pdf}
        trustAllCerts={Platform.OS === 'android'}
      />
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
  pdf: {
    flex: 1,
    backgroundColor: '#111827',
  },
});