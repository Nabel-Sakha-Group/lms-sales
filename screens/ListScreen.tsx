import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Container } from 'components/Container';
import supabase from 'lib/supabase';
import FilePreviewModal from 'components/FilePreviewModal';
import FileThumbnail from 'components/FileThumbnail';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { DownloadManager } from 'lib/DownloadManager';

interface StorageItem {
  id: string;
  name: string;
  isFolder: boolean;
  metadata?: any;
  size?: number;
  created_at?: string;
}

export default function ListScreen() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Storage']);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  const BUCKET_NAME = 'NSG-LMS';
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  const loadFolder = async () => {
    setLoading(true);
    try {
      // Build path string
      const folderPath = currentPath.length > 0 ? currentPath.join('/') : '';
      
      console.log('📂 Loading folder:', folderPath || 'root');
      console.log('📂 Bucket name:', BUCKET_NAME);

      // List files and folders in current path
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.error('❌ Error loading folder:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ API Response data:', data);
      console.log('📁 Found items:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('📋 First item:', JSON.stringify(data[0], null, 2));
      }

      // Transform data
      const transformedItems: StorageItem[] = (data || []).map(item => ({
        id: item.id || item.name,
        name: item.name,
        isFolder: !item.metadata, // Folders don't have metadata
        metadata: item.metadata,
        size: item.metadata?.size,
        created_at: item.created_at,
      }));

      console.log('📦 Transformed items:', transformedItems.length);

      // Sort: folders first, then files
      const sorted = transformedItems.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      setItems(sorted);
    } catch (err: any) {
      console.error('❌ Load folder error:', err);
      Alert.alert('Error', 'Gagal memuat folder: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (fileName: string): 'video' | 'image' | 'pdf' | 'document' | 'other' => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return 'document';
    return 'other';
  };

  const handleItemPress = async (item: StorageItem) => {
    if (item.isFolder) {
      // Navigate into folder
      setCurrentPath([...currentPath, item.name]);
      setBreadcrumb([...breadcrumb, item.name]);
    } else {
      // It's a file - get public URL and open in preview modal
      try {
        const filePath = currentPath.length > 0 
          ? `${currentPath.join('/')}/${item.name}`
          : item.name;

        const { data } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (data.publicUrl) {
          console.log('🔗 Opening file preview:', data.publicUrl);
          setPreviewFile({
            url: data.publicUrl,
            name: item.name,
            type: getFileType(item.name),
          });
          setPreviewVisible(true);
        }
      } catch (err: any) {
        Alert.alert('Error', 'Gagal membuka file: ' + err.message);
      }
    }
  };

  const handleBreadcrumbPress = (index: number) => {
    if (index === 0) {
      // Go to root
      setCurrentPath([]);
      setBreadcrumb(['Storage']);
    } else {
      // Go to specific level
      const newPath = currentPath.slice(0, index);
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setCurrentPath(newPath);
      setBreadcrumb(newBreadcrumb);
    }
  };

  const handleDownload = async (item: StorageItem) => {
    try {
      const filePath = currentPath.length > 0 
        ? `${currentPath.join('/')}/${item.name}`
        : item.name;

      const { data } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (data.publicUrl) {
        setDownloadProgress(prev => ({ ...prev, [item.id]: 0 }));
        
        await DownloadManager.downloadFile(
          data.publicUrl,
          item.name,
          (progress) => {
            setDownloadProgress(prev => ({ ...prev, [item.id]: progress }));
          }
        );
        
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[item.id];
          return newProgress;
        });
      }
    } catch (error: any) {
      Alert.alert('Download Error', error.message || 'An error occurred during download.');
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[item.id];
        return newProgress;
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };



  const renderItem = ({ item }: { item: StorageItem }) => (
    <View style={[responsiveStyle.itemCard, { marginBottom: 12 }]}>
      <Pressable
        onPress={() => handleItemPress(item)}
        className="bg-slate-800 rounded-xl active:bg-slate-700"
        style={{
          padding: isTablet ? 16 : 12,
          minHeight: isTablet ? 80 : 60,
        }}
      >
        <View className="flex-row items-center">
          {item.isFolder ? (
            <Text style={{ fontSize: isTablet ? 32 : 24, marginRight: 12 }}>
              📁
            </Text>
          ) : (
            <View style={{ marginRight: 12 }}>
              <FileThumbnail 
                name={item.name} 
                size={isTablet ? 56 : 40} 
              />
            </View>
          )}
          <View className="flex-1">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: responsiveStyle.text.body }}
              numberOfLines={isTablet ? 2 : 1}
            >
              {item.name}
            </Text>
            {!item.isFolder && (
              <View className="flex-row items-center justify-between">
                <Text 
                  className="text-slate-400 mt-1"
                  style={{ fontSize: responsiveStyle.text.caption }}
                >
                  {formatFileSize(item.size)}
                </Text>
                {downloadProgress[item.id] !== undefined ? (
                  <View className="ml-2">
                    <Text className="text-blue-400" style={{ fontSize: responsiveStyle.text.caption }}>
                      {Math.round(downloadProgress[item.id] * 100)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          {item.isFolder ? (
            <Text className="text-slate-400" style={{ fontSize: isTablet ? 20 : 16 }}>
              ›
            </Text>
          ) : (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDownload(item);
              }}
              className="ml-2 p-2 bg-blue-600 rounded-lg active:bg-blue-700"
              disabled={downloadProgress[item.id] !== undefined}
            >
              <Text className="text-white" style={{ fontSize: responsiveStyle.text.caption }}>
                {downloadProgress[item.id] !== undefined ? '⏳' : '⬇️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </View>
  );

  return (
    <Container>
      <View style={responsiveStyle.container}>
        {/* Breadcrumb Navigation */}
        <View style={{ marginBottom: isTablet ? 24 : 16 }}>
          <View className="flex-row flex-wrap items-center">
            {breadcrumb.map((crumb, index) => (
              <React.Fragment key={index}>
                <Pressable onPress={() => handleBreadcrumbPress(index)}>
                  <Text 
                    className={`${
                      index === breadcrumb.length - 1 
                        ? 'text-blue-400 font-semibold' 
                        : 'text-slate-400'
                    }`}
                    style={{ fontSize: responsiveStyle.text.body }}
                  >
                    {crumb}
                  </Text>
                </Pressable>
                {index < breadcrumb.length - 1 && (
                  <Text className="text-slate-500 mx-2" style={{ fontSize: responsiveStyle.text.body }}>
                    ›
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Loading State */}
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-white mt-4">Memuat...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-400 text-base">📂 Folder kosong</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={responsiveStyle.cardGrid.numColumns}
            key={`${responsiveStyle.cardGrid.numColumns}-${isLandscape}`}
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
