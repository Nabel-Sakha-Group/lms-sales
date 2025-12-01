import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Alert, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Container } from 'components/Container';
import { DownloadManager, DownloadedFile } from 'lib/DownloadManager';
import FileThumbnail from 'components/FileThumbnail';
import FilePreviewModal from 'components/FilePreviewModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';


export default function DownloadScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);

  useEffect(() => {
    loadDownloadedFiles();
  }, []);

  // Auto refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('DownloadScreen focused, refreshing data...');
      loadDownloadedFiles();
      
      // Set up periodic refresh every 10 seconds to catch new downloads
      const interval = setInterval(() => {
        console.log('Periodic refresh of downloaded files...');
        loadDownloadedFiles();
      }, 10000);
      
      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  const loadDownloadedFiles = async () => {
    console.log('Loading downloaded files...');
    setLoading(true);
    try {
      const files = await DownloadManager.getDownloadedFiles();
      const size = await DownloadManager.getTotalDownloadSize();
      console.log('Loaded files:', files.length, 'Total size:', size);
      console.log('File details:', files.map(f => ({ name: f.name, size: f.size })));
      setDownloadedFiles(files);
      setTotalSize(size);
      console.log('State updated - downloadedFiles length:', files.length);
    } catch (error) {
      console.error('Error loading downloaded files:', error);
      Alert.alert('Error', 'Failed to load downloaded files');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDownloadedFiles();
    setRefreshing(false);
  };

  const handleOpenWithExternalApp = async (file: DownloadedFile) => {
    try {
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(file.localUri);
      } else {
        // Android
        const mimeType = getMimeType(file.name);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: file.localUri,
          type: mimeType,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      }
    } catch (error) {
      console.log('Error opening file:', error);
      Alert.alert('Error', 'Cannot open this file type. Try using the preview option.');
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
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'mp4': return 'video/mp4';
      case 'mp3': return 'audio/mpeg';
      default: return 'application/octet-stream';
    }
  };

  const handleFilePress = (file: DownloadedFile) => {
    const type = getFileType(file.fileType);
    if (type === 'pdf') {
      navigation.navigate('PdfViewer', {
        uri: file.localUri,
        name: file.name,
      });
      return;
    }

    setPreviewFile({
      url: file.localUri,
      name: file.name,
      type,
    });
    setPreviewVisible(true);
  };

  const getFileType = (fileType: string): 'video' | 'image' | 'pdf' | 'document' | 'other' => {
    switch (fileType) {
      case 'video': return 'video';
      case 'image': return 'image';
      case 'pdf': return 'pdf';
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        return 'document';
      default: return 'other';
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await DownloadManager.deleteDownloadedFile(fileId);
            if (success) {
              await loadDownloadedFiles();
              Alert.alert('Success', 'File deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await DownloadManager.clearAllDownloads();
            await loadDownloadedFiles();
            Alert.alert('Success', 'All downloads cleared');
          },
        },
      ]
    );
  };

  const renderDownloadedFile = ({ item }: { item: DownloadedFile }) => (
    <View style={[responsiveStyle.itemCard, { marginBottom: 12 }]}>
      <Pressable
        onPress={() => handleFilePress(item)}
        className="bg-slate-800 rounded-xl active:bg-slate-700"
        style={{
          padding: isTablet ? 16 : 12,
          minHeight: isTablet ? 80 : 60,
        }}
      >
        <View className="flex-row items-center">
          <View style={{ marginRight: 12 }}>
            <FileThumbnail 
              name={item.name} 
              size={isTablet ? 56 : 40} 
            />
          </View>
          
          <View className="flex-1">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: responsiveStyle.text.body }}
              numberOfLines={isTablet ? 2 : 1}
            >
              {item.name}
            </Text>
            <Text 
              className="text-slate-400 mt-1"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              {DownloadManager.formatFileSize(item.size)} • {new Date(item.downloadedAt).toLocaleDateString()}
            </Text>
            <Text 
              className="text-green-500 mt-1"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              ✓ Available Offline
            </Text>
          </View>
          
          <View className="flex-row ml-2">
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenWithExternalApp(item);
                }}
                className="p-2 bg-blue-600 rounded-lg active:bg-blue-700 mr-2"
              >
                <Text className="text-white" style={{ fontSize: responsiveStyle.text.caption }}>
                  📤
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteFile(item.id, item.name);
              }}
              className="p-2 bg-red-600 rounded-lg active:bg-red-700"
            >
              <Text className="text-white" style={{ fontSize: responsiveStyle.text.caption }}>
                🗑️
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );

  return (
    <Container>
      <View style={responsiveStyle.container}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text 
              className="text-white font-bold"
              style={{ fontSize: responsiveStyle.text.heading }}
            >
              Downloaded Files
            </Text>
            <Text 
              className="text-slate-400"
              style={{ fontSize: responsiveStyle.text.body }}
            >
              {downloadedFiles.length} files • {DownloadManager.formatFileSize(totalSize)}
            </Text>
          </View>
          
          {downloadedFiles.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              className="px-4 py-2 bg-red-600 rounded-lg active:bg-red-700"
            >
              <Text 
                className="text-white font-medium"
                style={{ fontSize: responsiveStyle.text.caption }}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* File List */}
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-white" style={{ fontSize: responsiveStyle.text.body }}>
              Loading downloads...
            </Text>
          </View>
        ) : downloadedFiles.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-6xl mb-4">📁</Text>
            <Text 
              className="text-slate-400 text-center"
              style={{ fontSize: responsiveStyle.text.body }}
            >
              No downloaded files yet
            </Text>
            <Text 
              className="text-slate-500 text-center mt-2"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              Download files from the Categories page to access them offline
            </Text>
            {Platform.OS === 'ios' && (
              <Text 
                className="text-slate-400 text-center mt-4"
                style={{ fontSize: responsiveStyle.text.caption }}
              >
                💡 Downloaded files also appear in Files app → lms-nsg → Downloads
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={downloadedFiles}
            keyExtractor={(item) => item.id}
            renderItem={renderDownloadedFile}
            numColumns={responsiveStyle.cardGrid.numColumns}
            key={`${responsiveStyle.cardGrid.numColumns}-${isLandscape}`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
              />
            }
            contentContainerStyle={{ 
              paddingBottom: isTablet ? 24 : 16,
              alignItems: isTablet ? undefined : 'stretch',
            }}
            columnWrapperStyle={
              responsiveStyle.cardGrid.numColumns > 1 
                ? { justifyContent: 'space-between' } 
                : undefined
            }
          />
        )}
      </View>

      {/* File Preview Modal */}
      <FilePreviewModal
        visible={previewVisible}
        file={previewFile}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
        }}
      />
    </Container>
  );
}