import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TouchableOpacity, RefreshControl, Platform, TextInput } from 'react-native';
import * as Sharing from 'expo-sharing';
// IntentLauncher removed; we use in-app viewing or sharing instead
import { useFocusEffect } from '@react-navigation/native';
import { Container } from 'components/Container';
import { DownloadManager, DownloadedFile } from 'lib/DownloadManager';
import FileThumbnail from 'components/FileThumbnail';
import FilePreviewModal from 'components/FilePreviewModal';
import PdfViewerModal from 'components/PdfViewerModal';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { useAuth } from 'context/AuthContext';
import { getBrandColors } from 'lib/theme';


export default function DownloadScreen() {
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
  const [pdfVisible, setPdfVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);
  const { userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);

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
      await Sharing.shareAsync(file.localUri);
    } catch (error) {
      console.log('Error opening file:', error);
      Alert.alert('Error', 'Cannot open this file type. Try using the preview option.');
    }
  };

  // Removed getMimeType; using in-app viewer or share instead

  const handleFilePress = (file: DownloadedFile) => {
    const type = getFileType(file.fileType);
    if (type === 'pdf') {
      setPreviewFile({ url: file.localUri, name: file.name, type });
      setPdfVisible(true);
    } else {
      setPreviewFile({ url: file.localUri, name: file.name, type });
      setPreviewVisible(true);
    }
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;

  const filteredFiles = hasSearchQuery
    ? downloadedFiles.filter(file => file.name.toLowerCase().includes(normalizedQuery))
    : downloadedFiles;
  

  const renderDownloadedFile = ({ item }: { item: DownloadedFile }) => {
    const thumbSize = isTablet ? (isLandscape ? 170 : 140) : 120;

    return (
      <View
        style={{
          paddingHorizontal: 4,
          marginBottom: 16,
        }}
      >
        <View
          className="bg-orange-50 rounded-2xl border border-orange-100 items-center shadow-sm"
          style={{
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 10,
            minHeight: isTablet ? 220 : 220,
          }}
        >
          <Pressable
            onPress={() => handleFilePress(item)}
            className="rounded-xl active:bg-orange-50 items-center justify-center w-full"
            style={{
              aspectRatio: 1,
              padding: 8,
            }}
          >
            <FileThumbnail 
              name={item.name} 
              size={thumbSize}
              uri={item.localUri}
              type={getFileType(item.fileType)}
            />
          </Pressable>
          <View className="mt-2 w-full items-center">
            <Text 
              className="text-gray-900 font-medium text-center"
              style={{ fontSize: isTablet ? 11 : 9 }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text 
              className="text-gray-500 text-center mt-1"
              style={{ fontSize: isTablet ? 10 : 8 }}
              numberOfLines={1}
            >
              {DownloadManager.formatFileSize(item.size)}
            </Text>
            <Text 
              className="text-gray-400 text-center mt-1"
              style={{ fontSize: isTablet ? 9 : 7 }}
              numberOfLines={1}
            >
              {new Date(item.downloadedAt).toLocaleDateString()}
            </Text>
          </View>
          <View className="mt-3 w-full flex-row gap-2">
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => handleOpenWithExternalApp(item)}
                className="flex-1 p-2 bg-blue-600 rounded-lg active:bg-blue-700"
              >
                <Text className="text-white text-center" style={{ fontSize: isTablet ? 10 : 9 }}>
                  📤
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleDeleteFile(item.id, item.name)}
              className="flex-1 p-2 rounded-lg"
              style={{ backgroundColor: brandColors.primary }}
            >
              <Text className="text-white text-center" style={{ fontSize: isTablet ? 10 : 9 }}>
                🗑️
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Container>
      <View style={responsiveStyle.container}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text 
              className="text-gray-900 font-bold"
              style={{ fontSize: responsiveStyle.text.heading }}
            >
              Downloaded Files
            </Text>
            <Text 
              className="text-gray-600"
              style={{ fontSize: responsiveStyle.text.body }}
            >
              {downloadedFiles.length} files • {DownloadManager.formatFileSize(totalSize)}
            </Text>
          </View>
          
          {downloadedFiles.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: brandColors.primary }}
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

        {/* Search Bar */}
        {downloadedFiles.length > 0 && (
          <View style={{ marginBottom: isTablet ? 20 : 16 }}>
            <View className="flex-row items-center bg-white border border-orange-200 rounded-lg px-3 py-2">
              <Text style={{ fontSize: responsiveStyle.text.body, marginRight: 8 }}>🔍</Text>
              <TextInput
                placeholder="Cari file atau video..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  color: '#111827',
                  fontSize: responsiveStyle.text.body,
                  paddingVertical: 0,
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            {hasSearchQuery && filteredFiles.length === 0 && (
              <Text
                className="text-slate-400 mt-2"
                style={{ fontSize: responsiveStyle.text.caption }}
              >
                {`Tidak ada hasil untuk "${searchQuery}".`}
              </Text>
            )}
          </View>
        )}

        {/* File List */}
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-700" style={{ fontSize: responsiveStyle.text.body }}>
              Loading downloads...
            </Text>
          </View>
        ) : downloadedFiles.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-6xl mb-4">📁</Text>
            <Text 
              className="text-gray-600 text-center"
              style={{ fontSize: responsiveStyle.text.body }}
            >
              No downloaded files yet
            </Text>
            <Text 
              className="text-gray-500 text-center mt-2"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              Download files from the Categories page to access them offline
            </Text>
            {Platform.OS === 'ios' && (
              <Text 
                className="text-gray-500 text-center mt-4"
                style={{ fontSize: responsiveStyle.text.caption }}
              >
                💡 Downloaded files also appear in Files app → lms-nsg → Downloads
              </Text>
            )}
          </View>
        ) : filteredFiles.length === 0 && hasSearchQuery ? (
          // Sudah ditangani pesan di bawah search bar
          <View />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
              />
            }
            contentContainerStyle={{ 
              paddingBottom: isTablet ? 24 : 16,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {filteredFiles.map((file) => {
              // Phone: 2 kolom biar card lebih besar, Tablet tetap lebih rapat
              const colCount = isTablet ? (isLandscape ? 5 : 4) : 2;
              const itemWidthPercent = 100 / colCount;
              return (
                <View key={file.id} style={{ width: `${itemWidthPercent}%` as any }}>
                  {renderDownloadedFile({ item: file })}
                </View>
              );
            })}
          </ScrollView>
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
      <PdfViewerModal
        visible={pdfVisible}
        file={previewFile ? { url: previewFile.url, name: previewFile.name } : null}
        onClose={() => {
          setPdfVisible(false);
        }}
      />
    </Container>
  );
}