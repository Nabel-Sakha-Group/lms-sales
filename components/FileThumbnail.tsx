import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from 'context/AuthContext';
import { getBrandColors } from 'lib/theme';
import * as VideoThumbnails from 'expo-video-thumbnails';

interface FileThumbnailProps {
  name: string;
  size?: number;
  uri?: string;
  type?: 'video' | 'image' | 'pdf' | 'document' | 'other';
}

// Global cache untuk thumbnails
const thumbCache: Record<string, string> = {};

export default function FileThumbnail({ name, size = 48, uri, type }: FileThumbnailProps) {
  const { userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);
  // Detect type based on extension
  const ext = name.toLowerCase().split('.').pop() || '';
  const fileType = type || (() => {
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
    return 'other';
  })();

  // State untuk thumbnails
  const [thumbUri, setThumbUri] = useState<string | null>(
    uri ? thumbCache[uri] || null : null
  );
  const [thumbSize, setThumbSize] = useState<{ width: number; height: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Load thumbnail based on file type

  useEffect(() => {
    if (!uri) {
      setThumbUri(null);
      return;
    }
    if (thumbCache[uri]) {
      setThumbUri(thumbCache[uri]);
      return;
    }
    let active = true;
    const loadThumb = async () => {
      const lower = uri.toLowerCase();
      const isPdfThumbnailImage =
        fileType === 'pdf' &&
        (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp'));

      if (fileType === 'image' || isPdfThumbnailImage) {
        if (active) {
          thumbCache[uri] = uri;
          setThumbUri(uri);
        }
        return;
      }

      if (fileType === 'video') {
        try {
          const { uri: thumb, width, height } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          if (active && thumb) {
            thumbCache[uri] = thumb;
            setThumbUri(thumb);
            setThumbSize(width && height ? { width, height } : null);
          }
        } catch (e) {
          if (active) setThumbUri(null);
        }
        return;
      }
      // PDF tanpa thumbnail & other types: hanya icon
    };
    loadThumb();
    return () => { active = false; };
  }, [uri, fileType]);

  // Reset loadFailed when uri changes
  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  const getIcon = () => {
    switch (fileType) {
      case 'video': return '🎬';
      case 'image': return '🖼️';
      case 'pdf': return '📄';
      case 'document': return '📝';
      default: return '📄';
    }
  };

  const getIconColor = () => {
    switch (fileType) {
      case 'pdf': return brandColors.primary;
      case 'document': return '#3b82f6';
      case 'video': return '#8b5cf6';
      case 'image': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Show thumbnail if available (for images and videos)
  if (thumbUri && !loadFailed) {
    // If video, use aspect ratio from thumbnail
    if (fileType === 'video' && thumbSize) {
      const { width, height } = thumbSize;
      // Fit thumbnail inside square size, preserving aspect ratio
      const ratio = width / height;
      let thumbW = size, thumbH = size;
      if (ratio > 1) {
        thumbW = size;
        thumbH = Math.round(size / ratio);
      } else {
        thumbH = size;
        thumbW = Math.round(size * ratio);
      }
      return (
        <View style={[styles.container, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}> 
          <Image
            source={thumbUri}
            style={{ width: thumbW, height: thumbH, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setLoadFailed(true)}
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>▶</Text>
          </View>
        </View>
      );
    }
    // Default: image/pdf
    return (
      <View style={[styles.container, { width: size, height: size }]}> 
        <Image
          source={thumbUri}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setLoadFailed(true)}
        />
        {fileType === 'video' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>▶</Text>
          </View>
        )}
      </View>
    );
  }

  // PDF: show a document-style icon with lines
  if (fileType === 'pdf') {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.pdfIcon, { backgroundColor: brandColors.primaryLightBg }]}>
          {/* Document lines to simulate page content */}
          <View style={styles.pdfLines}>
            <View style={[styles.pdfLine, { width: '80%', backgroundColor: brandColors.primary }]} />
            <View style={[styles.pdfLine, { width: '60%', backgroundColor: brandColors.primary }]} />
            <View style={[styles.pdfLine, { width: '70%', backgroundColor: brandColors.primary }]} />
            <View style={[styles.pdfLine, { width: '50%', backgroundColor: brandColors.primary }]} />
          </View>
          {/* Corner fold */}
          <View style={styles.pdfCorner} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: brandColors.primary }]}>
          <Text style={styles.typeBadgeText}>PDF</Text>
        </View>
      </View>
    );
  }

  // Other file types: show emoji icon
  return (
    <View style={[styles.container, styles.iconContainer, { width: size, height: size }]}>
      <View style={[styles.iconBg, { backgroundColor: getIconColor() + '20' }]}>
        <Text style={[styles.icon, { fontSize: size * 0.35, color: getIconColor() }]}>
          {getIcon()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconContainer: {
    padding: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  iconBg: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor removed
  },
  icon: {
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
  },
  // PDF document style icon
  pdfIcon: {
    width: '85%',
    height: '90%',
    borderRadius: 4,
    padding: 6,
    justifyContent: 'center',
  },
  pdfLines: {
    gap: 4,
  },
  pdfLine: {
    height: 3,
    borderRadius: 1,
  },
  pdfCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#fca5a5',
    borderBottomLeftRadius: 4,
  },
});
