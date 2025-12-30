import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from 'context/AuthContext';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';
import { getBrandColors } from 'lib/theme';
import { getBucketNameForDomain } from 'lib/storage';
import { useNavigation } from '@react-navigation/native';
import FilePreviewModal from 'components/FilePreviewModal';
import OnlinePdfViewerModal from 'components/OnlinePdfViewerModal';
import FileThumbnail from 'components/FileThumbnail';

const CATALOGUE_LOGOS_BY_FILENAME: Record<string, any> = {
  'tacbecon.png': require('../assets/logo_lms/tacbecon.png'),
  'total.webp': require('../assets/logo_lms/total.webp'),
  'whitmore.png': require('../assets/logo_lms/whitmore.png'),
  'descase.png': require('../assets/logo_lms/descase.png'),
};

const RMW_LOGOS_BY_NAME: Record<string, any> = {
  Autosigma: require('../assets/logo_lms/Autosigma.png'),
  Belsa: require('../assets/logo_lms/Belsa.png'),
  CDC: require('../assets/logo_lms/CDC.png'),
  Covna: require('../assets/logo_lms/Covna.png'),
  Fontal: require('../assets/logo_lms/Fontal.png'),
  ITV: require('../assets/logo_lms/ITV.png'),
  KCC: require('../assets/logo_lms/KCC.png'),
};

type DqwCatalogueItem = {
  title: string;
  rootFolder: string;
  logo: any;
};

const DQW_CATALOGUE_ITEMS: DqwCatalogueItem[] = [
  {
    title: 'Schmalz',
    rootFolder: 'Katalog/Schmalz',
    logo: require('../assets/logo_lms/schmalz.png'),
  },
  {
    title: 'Binar Handling',
    rootFolder: 'Katalog/Binar Handling',
    logo: require('../assets/logo_lms/binar.png'),
  },
];

/* ================= PROFILE / LOGO DOMAIN ================= */
const DOMAIN_LOGOS = {
  // Use profile images for header avatar per request
  nsg: require('../assets/profile1.png'),
  rmw: require('../assets/profile2.png'),
  dqw: require('../assets/profile3.png'),
  admin: require('../assets/icon.png'),
};

type DashboardItem = {
  id: string;
  name: string;
  fullPath: string;
};

export default function HomeScreen() {
  const { user, userDomain, isAdmin, supabaseClient } = useAuth();
  const navigation = useNavigation<any>();
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);

  const [searchQuery, setSearchQuery] = useState('');
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  const [videoFiles, setVideoFiles] = useState<DashboardItem[]>([]);
  const [pdfFiles, setPdfFiles] = useState<DashboardItem[]>([]);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);

  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [onlinePdfVisible, setOnlinePdfVisible] = useState(false);
  const [onlinePdfUrl, setOnlinePdfUrl] = useState<string | null>(null);

  const [signedUrlCache, setSignedUrlCache] = useState<Record<string, string>>(
    {}
  );

  const avatarImg = userDomain
    ? DOMAIN_LOGOS[userDomain as keyof typeof DOMAIN_LOGOS]
    : require('../assets/icon.png');

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.displayName ||
    user?.user_metadata?.display_name ||
    user?.email ||
    '';

  const brandColors = getBrandColors(userDomain);

  const roleBadge = isAdmin
    ? { text: 'ADMIN', icon: '🔐' }
    : { text: 'USER', icon: '👤' };

  /* ================= BUCKET ================= */
  const BUCKET_NAME = getBucketNameForDomain(userDomain);

  const getPublicUrlForPath = (path: string): string | null => {
    if (!supabaseClient) return null;
    if (signedUrlCache[path]) return signedUrlCache[path];

    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
    if (data?.publicUrl) {
      setSignedUrlCache(prev => ({ ...prev, [path]: data.publicUrl }));
      return data.publicUrl;
    }
    return null;
  };

  /* ================= SEARCH ================= */
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;

  const filteredVideos = hasSearchQuery
    ? videoFiles.filter(v =>
        `${v.name} ${v.fullPath}`.toLowerCase().includes(normalizedQuery)
      )
    : videoFiles;

  const filteredPdfs = hasSearchQuery
    ? pdfFiles.filter(p =>
        `${p.name} ${p.fullPath}`.toLowerCase().includes(normalizedQuery)
      )
    : pdfFiles;

  const filteredFolders = hasSearchQuery
    ? folderPaths.filter(f => f.toLowerCase().includes(normalizedQuery))
    : [];

  const combinedSearchResults = hasSearchQuery
    ? [
        ...filteredFolders.map(f => ({ type: 'folder', name: f })),
        ...filteredVideos.map(v => ({ type: 'video', ...v })),
        ...filteredPdfs.map(p => ({ type: 'pdf', ...p })),
      ]
    : [];

  const dashboardVideos = useMemo(() => {
    if (hasSearchQuery) return filteredVideos;
    if (videoFiles.length <= 10) return videoFiles;
    return [...videoFiles].sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [videoFiles, filteredVideos, hasSearchQuery]);

  /* ================= LOAD STORAGE ================= */
  useEffect(() => {
    if (!supabaseClient) return;
    let cancelled = false;

    const loadCatalogue = async () => {
      setCatalogueLoading(true);

      const videos: DashboardItem[] = [];
      const pdfs: DashboardItem[] = [];
      const folders: string[] = [];

      const queue = [''];

      while (queue.length && !cancelled) {
        const prefix = queue.shift() || '';

        const { data } = await supabaseClient.storage
          .from(BUCKET_NAME)
          .list(prefix, { limit: 1000 });

        for (const item of data || []) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

          if (!item.metadata) {
            folders.push(fullPath);
            queue.push(fullPath);
            continue;
          }

          const ext = item.name.toLowerCase().split('.').pop();
          if (ext === 'pdf') pdfs.push({ id: fullPath, name: item.name, fullPath });
          if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || ''))
            videos.push({ id: fullPath, name: item.name, fullPath });
        }
      }

      if (!cancelled) {
        setVideoFiles(videos);
        setPdfFiles(pdfs);
        setFolderPaths(folders);
        setCatalogueLoading(false);
      }
    };

    loadCatalogue();
    return () => {
      cancelled = true;
    };
  }, [BUCKET_NAME, supabaseClient]);

  /* ================= UI ================= */
  return (
    <ScrollView
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View
        style={[
          responsiveStyle.container,
          { paddingVertical: isTablet ? 20 : 16 },
        ]}
      >
        {/* ================= HEADER ================= */}
        <View className="bg-white rounded-xl mb-4 shadow-sm border border-orange-100 p-4">
          <Text className="text-gray-900 mb-3">
            Selamat datang di Dashboard!
          </Text>

          <View className="flex-row items-center gap-4">
            <Image
              source={avatarImg}
              style={{ width: 52, height: 52, borderRadius: 26 }}
            />
            <View>
              <Text className="font-bold text-gray-900">
                {displayName}
              </Text>
              <Text className="text-gray-500 text-sm">{user?.email}</Text>

              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-gray-600">{userDomain?.toUpperCase()}</Text>
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: brandColors.primary }}
                >
                  <Text className="text-white text-xs font-bold">
                    {roleBadge.icon} {roleBadge.text}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ================= SEARCH BAR ================= */}
        <View className="mb-4 flex-row items-center bg-white border border-orange-200 rounded-lg px-3 py-2">
          <Text>🔍</Text>
          <TextInput
            placeholder="Cari file, video, PDF, atau folder..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>

        {/* ================= SEARCH RESULT ================= */}
        {hasSearchQuery && (
          <View>
            <Text className="font-semibold mb-2">Hasil Pencarian</Text>

            {catalogueLoading && <ActivityIndicator />}

            {combinedSearchResults.length === 0 && (
              <Text className="text-gray-500 py-4">Tidak ada hasil</Text>
            )}

            {combinedSearchResults.map((item: any, i) => (
              <Pressable
                key={i}
                className="bg-white border border-orange-100 rounded-lg px-3 py-3 mb-2 flex-row items-center"
                onPress={() => {
                  if (item.type === 'folder') {
                    const fullPath = item.name as string;
                    navigation.navigate('ClientFolder', {
                      rootFolder: fullPath,
                      title: fullPath.split('/').pop() || fullPath,
                    });
                    return;
                  }

                  if (item.type === 'video' || item.type === 'pdf') {
                    const url = getPublicUrlForPath(item.fullPath);
                    if (!url) return;

                    if (item.type === 'video') {
                      setPreviewFile({ url, name: item.name, type: 'video' });
                      setPreviewVisible(true);
                    } else {
                      setOnlinePdfUrl(url);
                      setOnlinePdfVisible(true);
                    }
                  }
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>
                  {item.type === 'folder'
                    ? '📁'
                    : item.type === 'video'
                    ? '🎬'
                    : '📄'}
                </Text>

                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} className="font-medium">
                    {item.name}
                  </Text>
                  {item.fullPath && (
                    <Text
                      numberOfLines={1}
                      className="text-gray-400 text-xs"
                    >
                      {item.fullPath}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* ================= CATALOGUE ================= */}
        {!hasSearchQuery && (
          <>
            <Text className="text-lg font-bold mb-3">Catalogue</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-4">
                {(userDomain === 'nsg' || userDomain === 'admin') && (
                  <>
                    {[
                      ['Tacbecon', 'tacbecon.png'],
                      ['Total Energies', 'total.webp'],
                      ['Whitmore', 'whitmore.png'],
                      ['Des Case', 'descase.png'],
                    ].map(([name, img]) => (
                      <Pressable
                        key={name}
                        className="w-36 bg-white rounded-2xl shadow-md px-4 py-2 items-center"
                        onPress={() =>
                          navigation.navigate('ClientFolder', {
                            rootFolder: name,
                            title: name,
                          })
                        }
                      >
                        <Image
                          source={CATALOGUE_LOGOS_BY_FILENAME[img]}
                          style={{
                            width: 110,
                            height: 48,
                            resizeMode: 'contain',
                          }}
                        />
                      </Pressable>
                    ))}
                  </>
                )}

                {userDomain === 'rmw' && (
                  <>
                    {[
                      'Autosigma',
                      'Belsa',
                      'CDC',
                      'Covna',
                      'Fontal',
                      'ITV',
                      'KCC',
                    ].map(name => (
                      <Pressable
                        key={name}
                        className="w-36 bg-white rounded-2xl shadow-md px-4 py-2 items-center"
                        onPress={() =>
                          navigation.navigate('ClientFolder', {
                            rootFolder: `Katalog/${name}`,
                            title: name,
                          })
                        }
                      >
                        <Image
                          source={RMW_LOGOS_BY_NAME[name]}
                          style={{
                            width: 110,
                            height: 48,
                            resizeMode: 'contain',
                          }}
                        />
                      </Pressable>
                    ))}
                  </>
                )}

                {userDomain === 'dqw' && (
                  <>
                    {DQW_CATALOGUE_ITEMS.map((item) => (
                      <Pressable
                        key={item.rootFolder}
                        className="w-36 bg-white rounded-2xl shadow-md px-4 py-2 items-center"
                        onPress={() =>
                          navigation.navigate('ClientFolder', {
                            rootFolder: item.rootFolder,
                            title: item.title,
                          })
                        }
                      >
                            <Image
                              source={item.logo}
                              style={{ width: 110, height: 48, resizeMode: 'contain' }}
                            />
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            </ScrollView>

            {/* ================= VIDEOS ================= */}
            <Text className="text-base font-semibold mt-6 mb-3">🎬 Videos</Text>

            {catalogueLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={brandColors.primary} />
                <Text className="text-gray-500 mt-2">Mengambil video...</Text>
              </View>
            ) : dashboardVideos.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-500">Tidak ada video tersedia.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-4">
                  {dashboardVideos.map(v => (
                    <Pressable
                      key={v.id}
                      style={{ width: 200 }}
                      onPress={() => {
                        setPreviewFile({
                          url: getPublicUrlForPath(v.fullPath),
                          name: v.name,
                          type: 'video',
                        });
                        setPreviewVisible(true);
                      }}
                    >
                      <View className="bg-gray-100 rounded-xl p-4 items-center">
                        <FileThumbnail
                          name={v.name}
                          size={isTablet ? (isLandscape ? 170 : 140) : 120}
                          uri={getPublicUrlForPath(v.fullPath) || undefined}
                          type="video"
                        />
                      </View>
                      <Text numberOfLines={2} className="mt-2 text-sm font-medium">
                        {v.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* ================= MODALS ================= */}
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
      </View>
    </ScrollView>
  );
}
