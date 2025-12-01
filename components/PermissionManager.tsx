import React, { useEffect, useState } from 'react';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_ASKED_KEY = 'permissions_requested';

interface PermissionManagerProps {
  children: React.ReactNode;
}

export default function PermissionManager({ children }: PermissionManagerProps) {
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      // Check if we've already asked for permissions
      const hasAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      
      if (!hasAsked) {
        if (Platform.OS === 'android') {
          // Request storage permissions for Android
          Alert.alert(
            'File Access Permission',
            'This app needs access to your device storage to download and save files. Please grant permission in the next dialog.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                  setPermissionsChecked(true);
                }
              },
              {
                text: 'Grant Permission',
                onPress: async () => {
                  try {
                    // Request proper storage permission using PermissionsAndroid
                    const granted = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                      {
                        title: 'Storage Permission',
                        message: 'This app needs access to storage to download files',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                      }
                    );
                    
                    // Mark that we've asked for permissions
                    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                    
                    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                      console.log('Storage permission granted');
                      Alert.alert(
                        'Permission Granted',
                        'Great! You can now download and save files from the app.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      console.log('Storage permission denied');
                      Alert.alert(
                        'Permission Required',
                        'Storage permission is needed to download files. You can enable it later in Settings → Apps → lms-nsg → Permissions.',
                        [{ text: 'OK' }]
                      );
                    }
                    setPermissionsChecked(true);
                  } catch (error) {
                    console.error('Error requesting permissions:', error);
                    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
                    setPermissionsChecked(true);
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
                  setPermissionsChecked(true);
                }
              }
            ]
          );
        }
      } else {
        setPermissionsChecked(true);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionsChecked(true);
    }
  };

  // Show loading while checking permissions
  if (!permissionsChecked) {
    return null; // Or you can show a loading screen here
  }

  return <>{children}</>;
}