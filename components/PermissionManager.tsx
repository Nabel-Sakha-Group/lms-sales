import React, { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_ASKED_KEY = 'permissions_requested';

interface PermissionManagerProps {
  children: React.ReactNode;
}

export default function PermissionManager({ children }: PermissionManagerProps) {
  useEffect(() => {
    // Request permissions asynchronously; do not block initial render
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      // Check if we've already asked for permissions
      const hasAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      
      if (!hasAsked) {
        if (Platform.OS === 'android') {
          // Prompt with SAF to select target folder (native system UI)
          Alert.alert(
            'Pilih Folder Penyimpanan',
            'Di langkah berikut, buat atau pilih folder "LMS" di dalam Downloads agar file tersimpan rapi.',
            [
              {
                text: 'Batal',
                style: 'cancel',
                onPress: async () => {
                  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                }
              },
              {
                text: 'Pilih Folder',
                onPress: async () => {
                  try {
                    const SAF = (FileSystem as any).StorageAccessFramework;
                    if (SAF && typeof SAF.requestDirectoryPermissionsAsync === 'function') {
                      const result = await SAF.requestDirectoryPermissionsAsync();
                      if (result?.granted && result.directoryUri) {
                        await AsyncStorage.setItem('downloads_directory_uri', result.directoryUri);
                      }
                    } else {
                      Alert.alert(
                        'Unsupported Storage Access',
                        'Versi FileSystem saat ini tidak mendukung pemilihan folder (SAF). File akan disimpan di penyimpanan aplikasi dan bisa dibuka via Share.',
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (error) {
                    console.error('SAF permission error:', error);
                  } finally {
                    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                  }
                }
              }
            ]
          );
        } else {
          // iOS - No explicit permission needed for document directory
          // Just show info about Files app access
          Alert.alert(
            'File Access',
            'Downloaded files will be available in:\n• Downloads tab in this app\n• Files app → lms-nsg → Downloads',
            [
              {
                text: 'Got it',
                onPress: async () => {
                  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };
  // Always render children; permission prompts are non-blocking
  return <>{children}</>;
}