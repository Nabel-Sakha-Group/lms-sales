import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Share } from 'react-native';
import { Container } from 'components/Container';
import FilePreviewModal from 'components/FilePreviewModal';
import OnlinePdfViewerModal from 'components/OnlinePdfViewerModal';
import FileThumbnail from 'components/FileThumbnail';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { useAuth } from 'context/AuthContext';
import { getBrandColors } from 'lib/theme';
import { FavoritesManager, FavoriteItem } from 'lib/FavoritesManager';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { DownloadManager } from 'lib/DownloadManager';
import { getBucketNameForDomain } from 'lib/storage';

export default function FavoritesScreen() {
  const { userDomain, supabaseClient } = useAuth();
  const brandColors = getBrandColors(userDomain);
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [onlinePdfVisible, setOnlinePdfVisible] = useState(false);
  const [onlinePdfUrl, setOnlinePdfUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  const BUCKET_NAME = getBucketNameForDomain(userDomain);
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const favs = await FavoritesManager.getFavoritesForDomain(userDomain || null);
    setFavorites(favs);
    setLoading(false);
  }, [userDomain]);

  // Muat ulang setiap kali screen Favorites difokuskan
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const getFileType = (fileName: string): 'video' | 'image' | 'pdf' | 'document' | 'other' => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return 'document';
    return 'other';
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

  const handleOpenFavorite = async (fav: FavoriteItem) => {
    try {
      const { data } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fav.fullPath);

      if (data.publicUrl) {
        const type = getFileType(fav.name);
        if (type === 'pdf') {
          setOnlinePdfUrl(data.publicUrl);
          setOnlinePdfVisible(true);
        } else {
          setPreviewFile({ url: data.publicUrl, name: fav.name, type });
          setPreviewVisible(true);
        }
      }
    } catch (err: any) {
      console.log('Error opening favorite file:', err);
    }
  };

  const colCount = isTablet ? (isLandscape ? 5 : 4) : 2;
  const thumbSize = isTablet ? (isLandscape ? 190 : 160) : 140;
  const itemWidthPercent = 100 / colCount;

  return (
    <Container>
      <View style={responsiveStyle.container}>
        <Text
          className="text-gray-900 font-bold mb-4"
          style={{ fontSize: responsiveStyle.text.heading }}
        >
          Favorites
        </Text>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text className="text-gray-500 mt-4">Memuat favorites...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400">Belum ada file di Favorites.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isTablet ? 24 : 16 }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {favorites
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((fav) => {
                  const type = getFileType(fav.name);
                  return (
                    <View key={fav.id} style={{ width: `${itemWidthPercent}%` as any }}>
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
                            onPress={() => handleOpenFavorite(fav)}
                            className="rounded-xl active:bg-orange-50 items-center justify-center w-full"
                            style={{
                              aspectRatio: 1,
                              padding: 8,
                            }}
                          >
                            <FileThumbnail
                              name={fav.name}
                              size={thumbSize}
                              type={type}
                            />
                          </Pressable>
                          <View className="mt-2 w-full items-center">
                            <Text
                              className="text-gray-900 font-medium text-center"
                              style={{ fontSize: isTablet ? 11 : 9 }}
                              numberOfLines={2}
                            >
                              {fav.name}
                            </Text>
                            <Text
                              className="text-gray-500 text-center mt-1"
                              style={{ fontSize: isTablet ? 10 : 8 }}
                              numberOfLines={1}
                            >
                              {formatFileSize(fav.size)}
                            </Text>
                          </View>
                          <View className="mt-3 w-full">
                            <View
                              className="flex-row w-full rounded-lg overflow-hidden"
                              style={{ backgroundColor: brandColors.primary }}
                            >
                              <TouchableOpacity
                                onPress={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const { data } = supabaseClient.storage
                                      .from(BUCKET_NAME)
                                      .getPublicUrl(fav.fullPath);
                                    if (data.publicUrl) {
                                      setDownloadProgress(prev => ({ ...prev, [fav.id]: 0 }));
                                      await DownloadManager.downloadFile(
                                        data.publicUrl,
                                        fav.name,
                                        (progress) => {
                                          setDownloadProgress(prev => ({ ...prev, [fav.id]: progress }));
                                        }
                                      );
                                      setDownloadProgress(prev => {
                                        const copy = { ...prev };
                                        delete copy[fav.id];
                                        return copy;
                                      });
                                    }
                                  } catch (error: any) {
                                    console.log('Download favorite error:', error?.message || error);
                                    setDownloadProgress(prev => {
                                      const copy = { ...prev };
                                      delete copy[fav.id];
                                      return copy;
                                    });
                                  }
                                }}
                                className="flex-1 py-2 items-center justify-center"
                                disabled={downloadProgress[fav.id] !== undefined}
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
                                onPress={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const { data } = supabaseClient.storage
                                      .from(BUCKET_NAME)
                                      .getPublicUrl(fav.fullPath);
                                    if (data.publicUrl) {
                                      await Share.share({
                                        message: `${fav.name} - ${data.publicUrl}`,
                                        url: data.publicUrl,
                                        title: fav.name,
                                      });
                                    }
                                  } catch (error: any) {
                                    console.log('Share favorite error:', error?.message || error);
                                  }
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
                          {downloadProgress[fav.id] !== undefined && (
                            <Text
                              className="text-blue-400 text-xs mt-1"
                              style={{ fontSize: isTablet ? 10 : 8 }}
                            >
                              {Math.round(downloadProgress[fav.id] * 100)}%
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
            </View>
          </ScrollView>
        )}
      </View>

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
