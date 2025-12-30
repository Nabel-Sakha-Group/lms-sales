import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions, ScrollView, Image, Alert, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';

interface FilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  file: {
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null;
}

const { width, height } = Dimensions.get('window');

export default function FilePreviewModal({ visible, onClose, file }: FilePreviewModalProps) {
  if (!file) return null;

  const handleFileAction = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Show alert with Share or Save to Files options
        Alert.alert(
          'Open File',
          `How would you like to open ${file.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Share', 
              onPress: async () => {
                try {
                  await Sharing.shareAsync(file.url, {
                    mimeType: getMimeType(file.name),
                    dialogTitle: 'Share file'
                  });
                } catch (error) {
                  console.log('Error sharing file:', error);
                }
              }
            },
            { 
              text: 'Save to Files', 
              onPress: async () => {
                try {
                  await Sharing.shareAsync(file.url, {
                    mimeType: getMimeType(file.name),
                    dialogTitle: 'Save to Files'
                  });
                } catch (error) {
                  console.log('Error saving to files:', error);
                }
              }
            }
          ]
        );
      } else {
        // Android: Use Sharing API to avoid FileUriExposedException
        try {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(file.url, {
              mimeType: getMimeType(file.name),
              dialogTitle: 'Open with...',
            });
          } else {
            Alert.alert(
              'Cannot Open File', 
              'Sharing is not available on this device.'
            );
          }
        } catch (error) {
          console.log('Error opening file:', error);
          Alert.alert(
            'Cannot Open File', 
            `Unable to open ${file.name}. Make sure you have an app that can handle this file type.`
          );
        }
      }
    } catch (error) {
      console.log('Error handling file action:', error);
    }
  };

  const getMimeType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'txt': return 'text/plain';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'mp4': return 'video/mp4';
      case 'mp3': return 'audio/mpeg';
      default: return 'application/octet-stream';
    }
  };

  const isLocalFile = file.url.startsWith('file://');

  const renderPreview = () => {
    switch (file.type) {
      case 'video':
        return (
          <Video
            source={{ uri: file.url }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
          />
        );

      case 'image':
        return (
          <ScrollView 
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentContainerStyle={styles.imageContainer}
          >
            <Image
              source={{ uri: file.url }}
              style={styles.image}
              resizeMode="contain"
            />
          </ScrollView>
        );

      case 'pdf':
        // Show local PDF info and let user open via external reader app using Sharing API
        return (
          <View style={styles.downloadedContainer}>
            <Text style={styles.downloadedIcon}>📄</Text>
            <Text style={styles.downloadedTitle}>PDF Downloaded</Text>
            <Text style={styles.downloadedSubtitle}>{file.name}</Text>
            {Platform.OS === 'android' ? (
              <Text style={styles.downloadedInfo}>📁 Location: Downloads → LMS-Sales</Text>
            ) : (
              <Text style={styles.downloadedInfo}>📁 Files app → lms-nsg → Downloads</Text>
            )}
            <Pressable style={styles.openButton} onPress={handleFileAction}>
              <Text style={styles.openButtonText}>{Platform.OS === 'ios' ? 'Share or Save' : 'Open PDF'}</Text>
            </Pressable>
          </View>
        );

      case 'document':
        return (
          <View style={styles.previewContainer}>
            <WebView
              source={{ 
                uri: isLocalFile 
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(file.url)}` 
                  : file.url 
              }}
              style={styles.webview}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowFileAccess={true}
              renderError={() => (
                <View style={styles.downloadedContainer}>
                  <Text style={styles.downloadedIcon}>📄</Text>
                  <Text style={styles.downloadedTitle}>Document Preview Error</Text>
                  <Text style={styles.downloadedSubtitle}>{file.name}</Text>
                  <Text style={styles.downloadedInfo}>Cannot preview this document in the app.</Text>
                  {Platform.OS === 'android' && isLocalFile && (
                    <Text style={styles.downloadedInfo}>
                      📁 File saved: Downloads → LMS-Sales
                    </Text>
                  )}
                  <Pressable 
                    style={styles.openButton}
                    onPress={handleFileAction}
                  >
                    <Text style={styles.openButtonText}>
                      {Platform.OS === 'ios' ? 'Share or Save' : 'Open with External App'}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
            {isLocalFile && (
              <View style={styles.floatingButton}>
                <Pressable 
                  style={styles.externalButton}
                  onPress={handleFileAction}
                >
                  <Text style={styles.externalButtonText}>
                    {Platform.OS === 'ios' ? '📤' : '📱'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.downloadedContainer}>
            <Text style={styles.downloadedIcon}>📄</Text>
            <Text style={styles.downloadedTitle}>File Ready</Text>
            <Text style={styles.downloadedSubtitle}>{file.name}</Text>
            <Text style={styles.downloadedInfo}>This file type cannot be previewed in the app.</Text>
            <Pressable 
              style={styles.openButton}
              onPress={handleFileAction}
            >
              <Text style={styles.openButtonText}>
                {Platform.OS === 'ios' ? 'Share or Save' : 'Open with External App'}
              </Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.previewContainer}>
          {renderPreview()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  fileName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: width,
    height: height - 100,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: width,
    height: height - 100,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  downloadedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  downloadedIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  downloadedTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  downloadedSubtitle: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  downloadedInfo: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  openButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  externalButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  externalButtonText: {
    fontSize: 20,
  },
});
