import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from 'context/AuthContext';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { getBrandColors } from 'lib/theme';
import { getBucketNameForDomain } from 'lib/storage';
import FileThumbnail from 'components/FileThumbnail';
import FilePreviewModal from 'components/FilePreviewModal';

export default function VideosScreen() {
  const { userDomain, supabaseClient } = useAuth();
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);
  const brandColors = getBrandColors(userDomain);

  type DashboardItem = {
    id: string;
    name: string;
    fullPath: string;
  };

  const [videoFiles, setVideoFiles] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState<{ [key: string]: string }>({});

  const BUCKET_NAME = getBucketNameForDomain(userDomain);

  const getFileType = (fileName: string): 'video' | 'image' | 'pdf' | 'document' | 'other' => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return 'document';
    return 'other';
  };

  const getPublicUrlForPath = (fullPath: string): string | null => {
    if (!supabaseClient) return null;
    if (signedUrlCache[fullPath]) return signedUrlCache[fullPath];

    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    const url = data.publicUrl || null;
    if (url) {
      setSignedUrlCache(prev => ({ ...prev, [fullPath]: url }));
    }
    return url;
  };

  const handleOpenVideo = (item: DashboardItem) => {
    const url = getPublicUrlForPath(item.fullPath);
    if (!url) return;

    setPreviewFile({ url, name: item.name, type: 'video' });
    setPreviewVisible(true);
  };

  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      if (!supabaseClient) return;

      setLoading(true);
      const videos: DashboardItem[] = [];
      const queue: string[] = [''];

      try {
        while (queue.length > 0 && !cancelled) {
          const prefix = queue.shift() || '';

          const { data, error } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .list(prefix, {
              limit: 1000,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' },
            });

          if (error) {
            console.log('❌ Videos list error:', error.message);
            continue;
          }

          for (const entry of data || []) {
            const isFolder = !entry.metadata;
            const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (isFolder) {
              queue.push(fullPath);
              continue;
            }

            const ext = entry.name.toLowerCase().split('.').pop() || '';
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

            if (isVideo) {
              videos.push({ id: fullPath, name: entry.name, fullPath });
            }
          }
        }
      } catch (err) {
        console.log('❌ Error loading videos:', err);
      } finally {
        if (!cancelled) {
          setVideoFiles(videos);
          setLoading(false);
        }
      }
    };

    loadVideos();

    return () => {
      cancelled = true;
    };
  }, [BUCKET_NAME, supabaseClient]);

  return (
    <ScrollView style={{ backgroundColor: '#ffffff' }}>
      <View style={[responsiveStyle.container, { minHeight: '100%', paddingVertical: isTablet ? 24 : 16 }]}>
        <Text
          className="text-gray-900 font-bold mb-4"
          style={{ fontSize: responsiveStyle.text.heading }}
        >
          Videos
        </Text>

        {loading ? (
          <View className="flex-row items-center mt-2">
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text
              className="text-gray-500 ml-2"
              style={{ fontSize: responsiveStyle.text.caption }}
            >
              Sedang memuat semua video...
            </Text>
          </View>
        ) : videoFiles.length === 0 ? (
          <Text className="text-gray-500 mt-4">Tidak ada video.</Text>
        ) : isTablet && isLandscape ? (
          <View className="mt-2 flex-row flex-wrap justify-between">
            {videoFiles.map((v) => {
              const uri = getPublicUrlForPath(v.fullPath) || undefined;
              return (
                <Pressable
                  key={v.id}
                  style={{ width: '23%', marginBottom: 16 }}
                  onPress={() => handleOpenVideo(v)}
                >
                  <View className="bg-gray-100 rounded-xl overflow-hidden">
                    <View
                      style={{ width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FileThumbnail
                        name={v.name}
                        size={isTablet ? (isLandscape ? 170 : 140) : 120}
                        uri={uri}
                        type={getFileType(v.name)}
                      />
                    </View>
                  </View>
                  <Text
                    className="text-gray-900 mt-2 font-semibold"
                    style={{ fontSize: responsiveStyle.text.caption }}
                    numberOfLines={2}
                  >
                    {v.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="mt-2">
            {videoFiles.map((v) => {
              const uri = getPublicUrlForPath(v.fullPath) || undefined;
              return (
                <Pressable
                  key={v.id}
                  className="mb-4"
                  onPress={() => handleOpenVideo(v)}
                >
                  <View className="bg-gray-100 rounded-xl overflow-hidden">
                    <View
                      style={{
                        width: '100%',
                        height: isTablet ? 140 : 120,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileThumbnail
                        name={v.name}
                        size={isTablet ? (isLandscape ? 170 : 140) : 120}
                        uri={uri}
                        type={getFileType(v.name)}
                      />
                    </View>
                  </View>
                  <Text
                    className="text-gray-900 mt-2 font-semibold"
                    style={{ fontSize: responsiveStyle.text.caption }}
                    numberOfLines={2}
                  >
                    {v.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <FilePreviewModal
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          file={previewFile}
        />
      </View>
    </ScrollView>
  );
}
