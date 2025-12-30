import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, Share } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Container } from 'components/Container';
import FilePreviewModal from 'components/FilePreviewModal';
import OnlinePdfViewerModal from 'components/OnlinePdfViewerModal';
import FileThumbnail from 'components/FileThumbnail';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { DownloadManager } from 'lib/DownloadManager';
import { useAuth } from 'context/AuthContext';
import { getBrandColors } from 'lib/theme';
import { FavoritesManager } from 'lib/FavoritesManager';
import { getBucketNameForDomain } from 'lib/storage';

export type ClientFolderRouteParams = {
  rootFolder: string; // e.g. 'Tacbecon', 'Total Energies', 'Whitmore'
  title?: string;     // Optional display title
};

interface StorageItem {
  id: string;
  name: string;
  isFolder: boolean;
  metadata?: any;
  size?: number;
  created_at?: string;
}

export default function ClientFolderScreen() {
  const route = useRoute<RouteProp<Record<string, ClientFolderRouteParams>, string>>();
  const { rootFolder, title } = route.params || { rootFolder: '', title: 'Folder' };
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>(rootFolder ? [rootFolder] : []);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(rootFolder ? [title || rootFolder] : ['Storage']);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [onlinePdfVisible, setOnlinePdfVisible] = useState(false);
  const [onlinePdfUrl, setOnlinePdfUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [favoritePaths, setFavoritePaths] = useState<Set<string>>(new Set());

  const { userDomain, supabaseClient } = useAuth();
  const brandColors = getBrandColors(userDomain);
  const latestRequestIdRef = useRef(0);

  const BUCKET_NAME = getBucketNameForDomain(userDomain);
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);
  const thumbSize = isTablet ? (isLandscape ? 150 : 120) : 80;

  // Reset path & breadcrumb setiap kali rootFolder/title berubah
  useEffect(() => {
    setCurrentPath(rootFolder ? [rootFolder] : []);
    setBreadcrumb(rootFolder ? [title || rootFolder] : ['Storage']);
  }, [rootFolder, title]);

  // Load favorites untuk domain aktif
  useEffect(() => {
    (async () => {
      const favs = await FavoritesManager.getFavoritesForDomain(userDomain || null);
      setFavoritePaths(new Set(favs.map(f => f.fullPath)));
    })();
  }, [userDomain]);

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, supabaseClient, rootFolder]);

  const loadFolder = async () => {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    try {
      const folderPath = currentPath.length > 0 ? currentPath.join('/') : '';

      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      const transformedItems: StorageItem[] = (data || []).map((item: any) => ({
        id: item.id || item.name,
        name: item.name,
        isFolder: !item.metadata,
        metadata: item.metadata,
        size: item.metadata?.size,
        created_at: item.created_at,
      }));

      const sorted = transformedItems.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      // Hanya terapkan hasil jika ini masih request terbaru
      if (requestId === latestRequestIdRef.current) {
        setItems(sorted);
      }
    } catch (err: any) {
      console.error('Load folder error:', err);
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
      setCurrentPath([...currentPath, item.name]);
      setBreadcrumb([...breadcrumb, item.name]);
    } else {
      try {
        const filePath = currentPath.length > 0 ? `${currentPath.join('/')}/${item.name}` : item.name;
        const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        if (data.publicUrl) {
          const type = getFileType(item.name);
          if (type === 'pdf') {
            setOnlinePdfUrl(data.publicUrl);
            setOnlinePdfVisible(true);
          } else {
            setPreviewFile({ url: data.publicUrl, name: item.name, type });
            setPreviewVisible(true);
          }
        }
      } catch (err: any) {
        Alert.alert('Error', 'Gagal membuka file: ' + err.message);
      }
    }
  };

  const handleBreadcrumbPress = (index: number) => {
    if (index === 0) {
      // Kembali ke root folder client (bukan root bucket)
      setCurrentPath(rootFolder ? [rootFolder] : []);
      setBreadcrumb(rootFolder ? [title || rootFolder] : ['Storage']);
    } else {
      const newPath = currentPath.slice(0, index + 1);
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setCurrentPath(newPath);
      setBreadcrumb(newBreadcrumb);
    }
  };

  const handleDownload = async (item: StorageItem) => {
    try {
      const filePath = currentPath.length > 0 ? `${currentPath.join('/')}/${item.name}` : item.name;
      const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      if (data.publicUrl) {
        setDownloadProgress(prev => ({ ...prev, [item.id]: 0 }));
        await DownloadManager.downloadFile(data.publicUrl, item.name, progress => {
          setDownloadProgress(prev => ({ ...prev, [item.id]: progress }));
        });
        setDownloadProgress(prev => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'An error occurred during download.');
      setDownloadProgress(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  const handleShare = async (item: StorageItem) => {
    if (item.isFolder) return;
    try {
      const filePath = currentPath.length > 0 
        ? `${currentPath.join('/')}/${item.name}`
        : item.name;

      const { data } = supabaseClient
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (data.publicUrl) {
        await Share.share({
          message: `${item.name} - ${data.publicUrl}`,
          url: data.publicUrl,
          title: item.name,
        });
      } else {
        Alert.alert('Share Error', 'Tidak bisa membuat link share untuk file ini.');
      }
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Terjadi kesalahan saat share file.');
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

  const buildFilePath = (fileName: string) =>
    currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName;

  const [signedUrlCache, setSignedUrlCache] = useState<{ [key: string]: string }>({});

  const getPublicUrlForItem = (item: StorageItem) => {
    if (item.isFolder) return null;
    const filePath = buildFilePath(item.name);
    if (signedUrlCache[filePath]) return signedUrlCache[filePath];
    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const url = data.publicUrl || null;
    if (url) {
      setSignedUrlCache(prev => ({ ...prev, [filePath]: url }));
    }
    return url;
  };

  return (
    <Container>
      <View style={{ padding: isTablet ? 24 : 16 }}>
        {/* Back to Dashboard + Breadcrumb */}
        <View style={{ marginBottom: isTablet ? 24 : 16 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Pressable
              onPress={() => navigation.navigate('Home')}
              className="px-3 py-2 bg-white border border-orange-200 rounded-lg active:bg-orange-50 flex-row items-center"
            >
              <Text
                style={{
                  fontSize: responsiveStyle.text.body,
                  color: brandColors.primary,
                }}
              >
                ‹ Back to Dashboard
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row flex-wrap items-center">
              {breadcrumb.map((crumb, index) => (
                <View key={index} className="flex-row items-center">
                  <Pressable onPress={() => handleBreadcrumbPress(index)}>
                    <Text
                      className={index === breadcrumb.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-600'}
                      style={{ fontSize: responsiveStyle.text.body }}
                    >
                      {crumb}
                    </Text>
                  </Pressable>
                  {index < breadcrumb.length - 1 && (
                    <Text className="text-gray-400 mx-1">/</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center mt-10">
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text className="mt-2 text-gray-500">Loading folder...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center mt-10">
            <Text className="text-gray-500">Folder kosong</Text>
          </View>
        ) : (
          <ScrollView>
            {/* Folders */}
            {items
              .filter(item => item.isFolder)
              .map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => handleItemPress(item)}
                  className="bg-white rounded-lg active:bg-orange-50 flex-row items-center p-4 mb-3 border border-orange-100"
                >
                  <Text style={{ fontSize: 28, marginRight: 12 }}>📁</Text>
                  <Text
                    className="text-gray-900 font-medium flex-1"
                    style={{ fontSize: isTablet ? 16 : 14 }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text className="text-gray-400" style={{ fontSize: 18 }}>›</Text>
                </Pressable>
              ))}

            {/* Files */}
            {items
              .filter(item => !item.isFolder && !item.name?.startsWith('.'))
              .map(item => {
                const fullPath = buildFilePath(item.name);
                const isFavorite = favoritePaths.has(fullPath);

                const handleToggleFavorite = async () => {
                  const updated = await FavoritesManager.toggleFavorite(
                    userDomain || null,
                    fullPath,
                    item.name,
                    item.size,
                  );
                  const domainFavs = updated.filter(f => f.domain === (userDomain || null));
                  setFavoritePaths(new Set(domainFavs.map(f => f.fullPath)));
                };

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItemPress(item)}
                    className="flex-row items-center px-3 py-2 rounded-lg mb-1 active:bg-orange-50"
                  >
                      <View style={{ width: thumbSize, marginRight: 12 }}>
                        <FileThumbnail
                          name={item.name}
                          size={thumbSize}
                          uri={getPublicUrlForItem(item) || undefined}
                        />
                      </View>
                    <View className="flex-1">
                      <Text
                        className="text-gray-900"
                        style={{ fontSize: responsiveStyle.text.body }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {formatFileSize(item.size)}
                      </Text>
                      {downloadProgress[item.id] !== undefined && (
                        <Text className="text-blue-400 text-xs mt-0.5">
                          {Math.round(downloadProgress[item.id] * 100)}%
                        </Text>
                      )}
                    </View>
                    <View className="flex-row ml-2 gap-1 items-center">
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite();
                        }}
                        className="px-2 py-1 rounded-full bg-white"
                      >
                        <FontAwesome
                          name={isFavorite ? 'star' : 'star-o'}
                          size={16}
                          color={isFavorite ? '#eab308' : '#9ca3af'}
                        />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        className="px-2 py-1 rounded"
                        disabled={downloadProgress[item.id] !== undefined}
                        style={{ backgroundColor: brandColors.primary }}
                      >
                        <Feather name="download" size={16} color="#ffffff" />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShare(item);
                        }}
                        className="px-2 py-1 rounded bg-blue-500 active:bg-blue-600"
                      >
                        <Feather name="share-2" size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
          </ScrollView>
        )}
      </View>

      {/* Modals */}
      <FilePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        file={previewFile}
      />
      <OnlinePdfViewerModal
        visible={onlinePdfVisible}
        onClose={() => setOnlinePdfVisible(false)}
        sourceUrl={onlinePdfUrl}
      />
    </Container>
  );
}
