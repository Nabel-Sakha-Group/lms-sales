import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, TouchableOpacity, ScrollView, TextInput, Share } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Container } from 'components/Container';
import FilePreviewModal from 'components/FilePreviewModal';
import OnlinePdfViewerModal from 'components/OnlinePdfViewerModal';
import FileThumbnail from 'components/FileThumbnail';
import PdfThumbnail from 'components/PdfThumbnail';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { DownloadManager } from 'lib/DownloadManager';
import { FavoritesManager } from 'lib/FavoritesManager';
import { useAuth } from 'context/AuthContext';
import { getBrandColors } from 'lib/theme';
import { getBucketNameForDomain } from 'lib/storage';

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
  const [onlinePdfVisible, setOnlinePdfVisible] = useState(false);
  const [onlinePdfUrl, setOnlinePdfUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    id: string;
    name: string;
    isFolder: boolean;
    fullPath: string;
    size?: number;
  }[]>([]);
  const [searching, setSearching] = useState(false);
  const [favoritePaths, setFavoritePaths] = useState<Set<string>>(new Set());

  const { userDomain, supabaseClient } = useAuth();
  const brandColors = getBrandColors(userDomain);

  const BUCKET_NAME = getBucketNameForDomain(userDomain);
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);

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
  }, [currentPath, supabaseClient]);

  const loadFolder = async () => {
    setLoading(true);
    try {
      // Build path string
      const folderPath = currentPath.length > 0 ? currentPath.join('/') : '';
      
      console.log('📂 Loading folder:', folderPath || 'root');
      console.log('📂 Bucket name:', BUCKET_NAME);

      // List files and folders in current path using domain-specific client
      const { data, error } = await supabaseClient
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
      // Transform data
      const transformedItems: StorageItem[] = (data || []).map((item: any) => ({
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
      // It's a file - get public URL
      try {
        const filePath = currentPath.length > 0 
          ? `${currentPath.join('/')}/${item.name}`
          : item.name;

        const { data } = supabaseClient
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (data.publicUrl) {
          const type = getFileType(item.name);
          if (type === 'pdf') {
            console.log('🔗 Opening online PDF viewer:', data.publicUrl);
            setOnlinePdfUrl(data.publicUrl);
            setOnlinePdfVisible(true);
          } else {
            console.log('🔗 Opening file preview:', data.publicUrl);
            setPreviewFile({
              url: data.publicUrl,
              name: item.name,
              type,
            });
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

      const { data } = supabaseClient
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

  const buildFilePath = (fileName: string) => (currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName);

  // Cache untuk signed URLs (expire setelah 1 jam)
  const [signedUrlCache, setSignedUrlCache] = useState<{ [key: string]: string }>({});

  const getPublicUrlForItem = (item: StorageItem) => {
    if (item.isFolder) return null;
    const filePath = buildFilePath(item.name);
    
    // Cek cache dulu
    if (signedUrlCache[filePath]) {
      return signedUrlCache[filePath];
    }
    
    // Gunakan public URL terlebih dahulu
    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const url = data.publicUrl || null;
    
    // Debug: log URL untuk troubleshoot thumbnail
    if (url && (item.name.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i))) {
      console.log('🖼️ Thumbnail URL:', url);
    }
    return url;
  };

  // Global recursive search across all folders/files
  useEffect(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timeout = setTimeout(() => {
      (async () => {
        try {
          const results: {
            id: string;
            name: string;
            isFolder: boolean;
            fullPath: string;
            size?: number;
          }[] = [];

          const queue: string[] = [''];

          while (queue.length > 0 && !cancelled) {
            const prefix = queue.shift() || '';

            const { data, error } = await supabaseClient.storage
              .from(BUCKET_NAME)
              .list(prefix, {
                limit: 1000,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
              });

            if (error) {
              console.log('❌ Search list error:', error.message);
              continue;
            }

            for (const entry of data || []) {
              const isFolder = !entry.metadata;
              const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
              const nameLower = entry.name.toLowerCase();

              if (nameLower.includes(normalized)) {
                results.push({
                  id: fullPath,
                  name: entry.name,
                  isFolder,
                  fullPath,
                  size: entry.metadata?.size,
                });
              }

              if (isFolder) {
                queue.push(fullPath);
              }
            }
          }

          if (!cancelled) {
            setSearchResults(results);
            setSearching(false);
          }
        } catch (err) {
          console.log('❌ Global search error:', err);
          if (!cancelled) {
            setSearchResults([]);
            setSearching(false);
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, BUCKET_NAME, supabaseClient]);

  // Fungsi untuk mendapatkan signed URL (untuk private bucket)
  const getSignedUrlForItem = async (item: StorageItem): Promise<string | null> => {
    if (item.isFolder) return null;
    const filePath = buildFilePath(item.name);
    
    if (signedUrlCache[filePath]) {
      return signedUrlCache[filePath];
    }
    
    try {
      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600);
      
      if (error) {
        console.log('❌ Signed URL error:', error.message);
        return null;
      }
      
      if (data?.signedUrl) {
        setSignedUrlCache(prev => ({ ...prev, [filePath]: data.signedUrl }));
        return data.signedUrl;
      }
    } catch (err) {
      console.log('❌ Signed URL exception:', err);
    }
    return null;
  };

  // Grid-based thumbnail layout
  // Phone: 2 kolom biar card lebih besar, Tablet tetap lebih rapat
  const colCount = isTablet ? (isLandscape ? 5 : 4) : 2;
  const thumbSize = isTablet ? (isLandscape ? 170 : 140) : 120;
  // Use percentage-based width for consistent grid
  const itemWidthPercent = 100 / colCount;

  // Component untuk file item dengan async thumbnail loading
  const FileItemWithThumbnail = ({ item }: { item: StorageItem }) => {
    const [thumbnailUri, setThumbnailUri] = useState<string | undefined>(undefined);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const fullPath = buildFilePath(item.name);
    const isFavorite = favoritePaths.has(fullPath);

    const handleToggleFavorite = async () => {
      const updated = await FavoritesManager.toggleFavorite(userDomain || null, fullPath, item.name, item.size);
      const domainFavs = updated.filter(f => f.domain === (userDomain || null));
      setFavoritePaths(new Set(domainFavs.map(f => f.fullPath)));
    };
    
    useEffect(() => {
      let cancelled = false;
      
      const loadThumbnail = async () => {
        const ext = item.name.toLowerCase().split('.').pop() || '';
        const isPdf = ext === 'pdf';
        const needsThumbnail = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'pdf'].includes(ext);

        if (!needsThumbnail) {
          setThumbnailUri(undefined);
          setPdfUrl(null);
          return;
        }

        try {
          if (isPdf) {
            const signedUrl = await getSignedUrlForItem(item);
            const fallbackUrl = !signedUrl ? getPublicUrlForItem(item) : signedUrl;
            if (!cancelled) {
              setPdfUrl(fallbackUrl || null);
              setThumbnailUri(undefined);
            }
            return;
          }

          // Non-PDF: pakai signed URL file asli (image/video)
          const signedUrl = await getSignedUrlForItem(item);
          if (!cancelled && signedUrl) {
            setThumbnailUri(signedUrl);
          }
        } catch (err) {
          console.log('❌ Failed to get thumbnail URL:', err);
          if (!cancelled) {
            const publicUrl = getPublicUrlForItem(item);
            if (publicUrl) {
              setThumbnailUri(publicUrl);
            }
          }
        }
      };
      
      loadThumbnail();
      
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id]);
    
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
          <View
            style={{ position: 'absolute', top: 6, right: 6, zIndex: 10 }}
          >
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className="rounded-full items-center justify-center"
              style={{
                padding: 4,
                backgroundColor: 'rgba(255,255,255,0.9)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
              }}
            >
              <FontAwesome
                name={isFavorite ? 'star' : 'star-o'}
                size={isTablet ? 20 : 18}
                color={isFavorite ? '#eab308' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
          <Pressable
            onPress={() => handleItemPress(item)}
            className="rounded-xl active:bg-orange-50 items-center justify-center w-full"
            style={{
              aspectRatio: 1,
              padding: 8,
            }}
          >
            {getFileType(item.name) === 'pdf' && pdfUrl ? (
              <PdfThumbnail sourceUrl={pdfUrl} />
            ) : (
              <FileThumbnail 
                name={item.name} 
                size={thumbSize}
                uri={thumbnailUri}
                type={getFileType(item.name)}
              />
            )}
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
              {formatFileSize(item.size)}
            </Text>
            {downloadProgress[item.id] !== undefined && (
              <Text 
                className="text-blue-400 text-xs mt-1"
                style={{ fontSize: isTablet ? 10 : 8 }}
              >
                {Math.round(downloadProgress[item.id] * 100)}%
              </Text>
            )}
          </View>
          <View className="mt-3 w-full">
            <View
              className="flex-row w-full rounded-lg overflow-hidden"
              style={{ backgroundColor: brandColors.primary }}
            >
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownload(item);
                }}
                className="flex-1 py-2 items-center justify-center"
                disabled={downloadProgress[item.id] !== undefined}
              >
                <View className="w-8 h-8 rounded-md bg-white/20 items-center justify-center">
                  <Feather
                    name="download"
                    size={isTablet ? 18 : 16}
                    color="#ffffff"
                  />
                </View>
              </TouchableOpacity>
              <View
                className="w-px"
                style={{ backgroundColor: brandColors.primaryDark }}
              />
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleShare(item);
                }}
                className="flex-1 py-2 items-center justify-center"
              >
                <View className="w-8 h-8 rounded-md bg-white/20 items-center justify-center">
                  <Feather
                    name="share-2"
                    size={isTablet ? 18 : 16}
                    color="#ffffff"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFileItem = ({ item }: { item: StorageItem }) => (
    <FileItemWithThumbnail item={item} />
  );

  const renderFolderItem = ({ item }: { item: StorageItem }) => (
    <Pressable
      onPress={() => handleItemPress(item)}
      className="bg-white rounded-lg active:bg-orange-50 flex-row items-center p-4 mb-3 border border-orange-100"
    >
      <Text style={{ fontSize: 32, marginRight: 12 }}>📁</Text>
      <Text className="text-gray-900 font-medium flex-1" style={{ fontSize: isTablet ? 16 : 14 }}>
        {item.name}
      </Text>
      <Text className="text-gray-400" style={{ fontSize: 16 }}>›</Text>
    </Pressable>
  );

  // Separate folders and files
  const folders = items.filter(item => item.isFolder);
  const files = items.filter(item => !item.isFolder);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;

  return (
    <Container>
      <View style={responsiveStyle.container}>
        {/* Back Button and Breadcrumb Navigation */}
        <View style={{ marginBottom: isTablet ? 24 : 16 }}>
          <View className="flex-row items-center justify-between mb-3">
            {currentPath.length > 0 && (
              <TouchableOpacity
                onPress={() => handleBreadcrumbPress(currentPath.length - 1)}
                className="px-3 py-2 bg-white border border-orange-200 rounded-lg active:bg-orange-50 flex-row items-center"
              >
                <Text
                  style={{
                    fontSize: responsiveStyle.text.body,
                    color: brandColors.primary,
                  }}
                >
                  ‹ Back
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row flex-wrap items-center">
            {breadcrumb.map((crumb, index) => (
              <React.Fragment key={index}>
                <Pressable onPress={() => handleBreadcrumbPress(index)}>
                  <Text
                    style={{
                      fontSize: responsiveStyle.text.body,
                      color: index === breadcrumb.length - 1 ? brandColors.primary : '#6b7280',
                      fontWeight: index === breadcrumb.length - 1 ? '600' : '400',
                    }}
                  >
                    {crumb}
                  </Text>
                </Pressable>
                {index < breadcrumb.length - 1 && (
                  <Text className="text-gray-400 mx-2" style={{ fontSize: responsiveStyle.text.body }}>
                    ›
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ marginBottom: isTablet ? 20 : 16 }}>
          <View className="flex-row items-center bg-white border border-orange-200 rounded-lg px-3 py-2">
            <Text style={{ fontSize: responsiveStyle.text.body, marginRight: 8 }}>🔍</Text>
            <TextInput
              placeholder="Cari folder atau file..."
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
          {hasSearchQuery && !searching && searchResults.length === 0 && (
            <Text
              className="text-slate-400 mt-2"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              {`Tidak ada hasil untuk "${searchQuery}".`}
            </Text>
          )}
        </View>

        {/* Content - Search Results or Folders/Files */}
        {hasSearchQuery ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isTablet ? 24 : 16 }}
          >
            {searching && (
              <View className="flex-row items-center py-4">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text
                  className="text-slate-400 ml-2"
                  style={{ fontSize: responsiveStyle.text.caption }}
                >
                  Mencari di semua folder...
                </Text>
              </View>
            )}

            {!searching && searchResults.length > 0 && (
              <View>
                {searchResults.map((result) => (
                  <Pressable
                    key={result.id}
                    onPress={async () => {
                      if (result.isFolder) {
                        const segments = result.fullPath.split('/');
                        setCurrentPath(segments);
                        setBreadcrumb(['Storage', ...segments]);
                        setSearchQuery('');
                      } else {
                        try {
                          const { data } = supabaseClient.storage
                            .from(BUCKET_NAME)
                            .getPublicUrl(result.fullPath);

                          if (data.publicUrl) {
                            const type = getFileType(result.name);
                            if (type === 'pdf') {
                              setOnlinePdfUrl(data.publicUrl);
                              setOnlinePdfVisible(true);
                            } else {
                              setPreviewFile({
                                url: data.publicUrl,
                                name: result.name,
                                type,
                              });
                              setPreviewVisible(true);
                            }
                          }
                        } catch (err: any) {
                          Alert.alert('Error', 'Gagal membuka file: ' + err.message);
                        }
                      }
                    }}
                    className="bg-slate-800 rounded-lg flex-row items-center p-3 mb-2"
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>
                      {result.isFolder ? '📁' : '📄'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        className="text-white font-medium"
                        style={{ fontSize: isTablet ? 14 : 12 }}
                        numberOfLines={1}
                      >
                        {result.name}
                      </Text>
                      <Text
                        className="text-slate-400"
                        style={{ fontSize: isTablet ? 10 : 9 }}
                        numberOfLines={1}
                      >
                        {result.fullPath}
                      </Text>
                    </View>
                    {!result.isFolder && (
                      <Text
                        className="text-slate-400 ml-2"
                        style={{ fontSize: isTablet ? 10 : 9 }}
                      >
                        {formatFileSize(result.size)}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          // Default content: current folder view
          <>
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
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: isTablet ? 24 : 16 }}
              >
                {/* Folders Section - Single Column List */}
                {folders.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    {folders.map((folder) => (
                      <View key={folder.id}>
                        {renderFolderItem({ item: folder })}
                      </View>
                    ))}
                  </View>
                )}

                {/* Files Section - Grid Layout */}
                {files.length > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                    }}
                  >
                    {files.map((file) => (
                      <View key={file.id} style={{ width: `${itemWidthPercent}%` as any }}>
                        {renderFileItem({ item: file })}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </>
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
      <OnlinePdfViewerModal
        visible={onlinePdfVisible}
        sourceUrl={onlinePdfUrl}
        title={onlinePdfUrl ? onlinePdfUrl.split('/').pop() || 'PDF' : 'PDF'}
        onClose={() => {
          setOnlinePdfVisible(false);
          setOnlinePdfUrl(null);
        }}
      />
    </Container>
  );
}
