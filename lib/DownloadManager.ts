import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

export interface DownloadedFile {
  id: string;
  name: string;
  originalUrl: string;
  localUri: string;
  size: number;
  downloadedAt: string;
  fileType: string;
}

const DOWNLOADS_KEY = 'downloaded_files';

export class DownloadManager {
  private static _downloadsFolder: string | null = null;

  static getDownloadsFolder() {
    if (!this._downloadsFolder) {
      if (Platform.OS === 'android') {
        // Default to app documentDirectory; when SAF is granted we write to that URI instead
        this._downloadsFolder = `${FileSystem.documentDirectory}Downloads/`;
      } else {
        // For iOS, use Documents folder with app-specific subfolder
        this._downloadsFolder = `${FileSystem.documentDirectory}Downloads/`;
      }
    }
    return this._downloadsFolder;
  }

  static async initializeDownloadsFolder() {
    try {
      const downloadsFolder = this.getDownloadsFolder();
      console.log('Initializing downloads folder:', downloadsFolder);
      
      const dirInfo = await FileSystem.getInfoAsync(downloadsFolder);
      if (!dirInfo.exists) {
        console.log('Creating downloads directory...');
        await FileSystem.makeDirectoryAsync(downloadsFolder, { intermediates: true });
        console.log('Downloads directory created successfully');
      }
      return downloadsFolder;
    } catch (error) {
      console.error('Error initializing downloads folder:', error);
      throw error;
    }
  }

  static async requestPermissions(): Promise<boolean> {
    // Permission handling is now done at app level via PermissionManager
    // This method is kept for compatibility but returns true since we use internal storage
    return true;
  }

  static async saveToMediaLibrary(localUri: string, filename: string): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        // If using SAF, localUri will already be a content URI; otherwise app storage path
        console.log('Android: File saved at:', localUri);
        return localUri;
      } else if (Platform.OS === 'ios') {
        // For iOS, files in documentDirectory are automatically available in Files app
        console.log('iOS: File available in Files app at:', localUri);
        return localUri;
      }
      return localUri;
    } catch (error) {
      console.error('Error saving to media library:', error);
      return null;
    }
  }

  static async downloadFile(url: string, fileName: string, onProgress?: (progress: number) => void): Promise<DownloadedFile | null> {
    try {
      console.log('Starting download for:', fileName);
      // Ensure Android SAF directory is selected before proceeding to final save
      if (Platform.OS === 'android') {
        try {
          const SAF = (FileSystem as any).StorageAccessFramework;
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');
          if (SAF && !directoryUri) {
            Alert.alert(
              'Pilih Folder "LMS"',
              'Sebelum mengunduh, pilih folder tujuan. Disarankan membuat/menentukan folder "LMS" di dalam Downloads.',
              [{ text: 'OK' }]
            );
            const result = await SAF.requestDirectoryPermissionsAsync();
            if (result?.granted && result.directoryUri) {
              directoryUri = result.directoryUri as string;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            } else {
              console.log('SAF: directory permission not granted. Will keep app-local copy only.');
            }
          }
        } catch (e) {
          console.log('SAF pre-check error:', e);
        }
      }
      const fileId = Date.now().toString();
      const tempTarget = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileId}_${fileName}`;
      // Download to a temporary app location first
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        tempTarget,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log('Download progress:', Math.round(progress * 100) + '%');
          onProgress?.(progress);
        }
      );
      console.log('Starting download...');
      const downloadResult = await downloadResumable.downloadAsync();
      console.log('Download result:', downloadResult);
      
      if (downloadResult && (downloadResult.status === 200 || downloadResult.status === 206)) {
        console.log('Download successful with status:', downloadResult.status, '(200=OK, 206=Partial Content)');
        // Decide final destination
        let finalUri = tempTarget;
        let size = 0;
        const tempInfo = await FileSystem.getInfoAsync(tempTarget);
        size = 'size' in tempInfo ? (tempInfo.size as number) : 0;

        if (Platform.OS === 'android') {
          try {
            const SAF = (FileSystem as any).StorageAccessFramework;
            const directoryUri = await AsyncStorage.getItem('downloads_directory_uri');
            if (SAF && directoryUri) {
              // Ensure LMS subfolder exists; create or use picked directory directly
              // Attempt to create file inside the selected directory
              const mimeType = this.getMimeTypeFromName(fileName);
              const safFileUri = await SAF.createFileAsync(directoryUri, fileName, mimeType);
              const base64 = await FileSystem.readAsStringAsync(tempTarget, { encoding: FileSystem.EncodingType.Base64 });
              await SAF.writeAsStringAsync(safFileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              // Keep an app-local copy for in-app viewing
              const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
              finalUri = DOWNLOADS_FOLDER + `${fileId}_${fileName}`;
              await FileSystem.moveAsync({ from: tempTarget, to: finalUri });
              const movedInfo = await FileSystem.getInfoAsync(finalUri);
              size = 'size' in movedInfo ? (movedInfo.size as number) : size;
              // Store SAF uri as publicUri by assigning after record creation
              (downloadResult as any)._safUri = safFileUri;
            } else {
              console.log('SAF not available or directory not set. Saving to app storage only.');
              const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
              finalUri = DOWNLOADS_FOLDER + `${fileId}_${fileName}`;
              await FileSystem.moveAsync({ from: tempTarget, to: finalUri });
              const movedInfo = await FileSystem.getInfoAsync(finalUri);
              size = 'size' in movedInfo ? (movedInfo.size as number) : size;
            }
          } catch (e) {
            console.error('SAF write error, keeping app storage file:', e);
            // Fallback: move to app Downloads folder
            const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
            finalUri = DOWNLOADS_FOLDER + `${fileId}_${fileName}`;
            await FileSystem.moveAsync({ from: tempTarget, to: finalUri });
            const movedInfo = await FileSystem.getInfoAsync(finalUri);
            size = 'size' in movedInfo ? (movedInfo.size as number) : size;
          }
        } else {
          // iOS: move to app Downloads folder for visibility in Files
          const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
          finalUri = DOWNLOADS_FOLDER + `${fileId}_${fileName}`;
          await FileSystem.moveAsync({ from: tempTarget, to: finalUri });
          const movedInfo = await FileSystem.getInfoAsync(finalUri);
          size = 'size' in movedInfo ? (movedInfo.size as number) : size;
        }
        
        const downloadedFile: DownloadedFile = {
          id: fileId,
          name: fileName,
          originalUrl: url,
          localUri: finalUri,
          size: size,
          downloadedAt: new Date().toISOString(),
          fileType: this.getFileType(fileName),
        };

        // Save to media library for file manager access
        const publicUri = await this.saveToMediaLibrary(finalUri, fileName);
        console.log('File saved to media library:', publicUri ? 'Success' : 'Failed');

        // Add public URI if available
        // Prefer SAF uri if available
        const safUri = (downloadResult as any)?._safUri;
        if (safUri) {
          (downloadedFile as any).publicUri = safUri;
        } else if (publicUri) {
          (downloadedFile as any).publicUri = publicUri;
        }

        // Save to AsyncStorage
        await this.saveDownloadRecord(downloadedFile);
        console.log('Download completed and saved:', downloadedFile);
        
        // Show success message with file location info
        setTimeout(async () => {
          if (Platform.OS === 'android') {
            let folderHint = 'Selected folder';
            try {
              const dirUri = await AsyncStorage.getItem('downloads_directory_uri');
              if (dirUri) {
                // Best-effort hint: show "LMS" if user followed guidance
                folderHint = dirUri.includes('LMS') ? 'LMS' : 'selected folder';
              }
            } catch {}
            Alert.alert(
              'Download Complete',
              `${fileName} has been saved.\n\n• View in Downloads tab\n• Access via File Manager (${folderHint})`,
              [{ text: 'OK' }]
            );
          } else if (Platform.OS === 'ios') {
            Alert.alert(
              'Download Complete',
              `${fileName} has been saved to:\n• Downloads tab (for viewing)\n• Files app → lms-nsg → Downloads`,
              [{ text: 'OK' }]
            );
          }
        }, 500);
        
        return downloadedFile;
      } else {
        console.error('Download failed with status:', downloadResult?.status, 'Expected 200 or 206');
        Alert.alert('Download Failed', `Failed to download ${fileName}. Status: ${downloadResult?.status}`);
      }
    } catch (error) {
      console.error('Download failed with error:', error);
    }
    return null;
  }

  static async saveDownloadRecord(file: DownloadedFile) {
    try {
      console.log('Saving download record for:', file.name);
      const existingDownloads = await this.getDownloadedFiles();
      console.log('Existing downloads:', existingDownloads.length);
      const updatedDownloads = [...existingDownloads, file];
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updatedDownloads));
      console.log('Download record saved. Total downloads now:', updatedDownloads.length);
      
      // Verify save
      const verification = await AsyncStorage.getItem(DOWNLOADS_KEY);
      console.log('Verification - saved items:', verification ? JSON.parse(verification).length : 0);
    } catch (error) {
      console.error('Error saving download record:', error);
    }
  }

  static async getDownloadedFiles(): Promise<DownloadedFile[]> {
    try {
      const downloadsJson = await AsyncStorage.getItem(DOWNLOADS_KEY);
      const saved = downloadsJson ? (JSON.parse(downloadsJson) as DownloadedFile[]) : [];

      // If Android SAF directory is set, prioritize listing files from that directory only
      if (Platform.OS === 'android') {
        try {
          const SAF = (FileSystem as any).StorageAccessFramework;
          const directoryUri = await AsyncStorage.getItem('downloads_directory_uri');
          if (SAF && directoryUri) {
            const childUris: string[] = await SAF.readDirectoryAsync(directoryUri);
            const safDownloads: DownloadedFile[] = [];
            for (const uri of childUris) {
              let name = 'file';
              let size = 0;
              try {
                const info = await SAF.getInfoAsync(uri);
                if (info?.name) name = info.name as string;
                if (typeof info?.size === 'number') size = info.size as number;
              } catch {
                const decoded = decodeURIComponent(uri);
                const parts = decoded.split('/');
                name = parts[parts.length - 1] || 'file';
              }
              const savedMatch = saved.find(s => s.name === name);
              let localUri = savedMatch?.localUri;
              if (!localUri) {
                try {
                  // Create/ensure app-local copy for in-app viewing
                  const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
                  const localId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  localUri = DOWNLOADS_FOLDER + `${localId}_${name}`;
                  const base64 = await SAF.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                  const info = await FileSystem.getInfoAsync(localUri);
                  if (info && typeof (info as any).size === 'number') {
                    size = (info as any).size as number;
                  }
                } catch (copyErr) {
                  console.log('Failed to create app-local copy from SAF URI:', copyErr);
                  localUri = uri; // fallback for external opening
                }
              }
              safDownloads.push({
                id: savedMatch?.id ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                name,
                originalUrl: savedMatch?.originalUrl ?? '',
                localUri,
                size,
                downloadedAt: savedMatch?.downloadedAt ?? new Date().toISOString(),
                fileType: savedMatch?.fileType ?? this.getFileType(name),
              } as DownloadedFile);
            }
            return safDownloads;
          }
        } catch (e) {
          console.log('SAF listing error:', e);
        }
      }

      // Fallback: show validated app-local copies (iOS or Android without SAF)
      const validDownloads: DownloadedFile[] = [];
      for (const d of saved) {
        try {
          const info = await FileSystem.getInfoAsync(d.localUri);
          if (info.exists) {
            validDownloads.push(d);
          }
        } catch {}
      }
      return validDownloads;
    } catch (error) {
      console.error('Error getting downloaded files:', error);
    }
    return [];
  }

  static async deleteDownloadedFile(fileId: string): Promise<boolean> {
    try {
      const downloads = await this.getDownloadedFiles();
      const fileToDelete = downloads.find(f => f.id === fileId);
      
      if (fileToDelete) {
        console.log('Deleting file:', fileToDelete.name);
        
        // Delete physical file
        try {
          await FileSystem.deleteAsync(fileToDelete.localUri, { idempotent: true });
          console.log('Physical file deleted successfully');
        } catch (deleteError) {
          console.error('Error deleting physical file:', deleteError);
          // Continue to remove from storage even if physical delete fails
        }
        
        // Remove from storage
        const updatedDownloads = downloads.filter(f => f.id !== fileId);
        await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updatedDownloads));
        console.log('File removed from storage');
        
        return true;
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
    return false;
  }

  static async getTotalDownloadSize(): Promise<number> {
    const downloads = await this.getDownloadedFiles();
    return downloads.reduce((total, file) => total + file.size, 0);
  }

  static async clearAllDownloads(): Promise<void> {
    try {
      const downloads = await this.getDownloadedFiles();
      console.log(`Clearing ${downloads.length} downloads`);
      
      // Delete all files
      for (const download of downloads) {
        try {
          await FileSystem.deleteAsync(download.localUri, { idempotent: true });
          console.log('Deleted:', download.name);
        } catch (deleteError) {
          console.error('Error deleting file:', download.name, deleteError);
          // Continue with other files
        }
      }
      
      // Clear storage
      await AsyncStorage.removeItem(DOWNLOADS_KEY);
      console.log('All downloads cleared from storage');
    } catch (error) {
      console.error('Error clearing downloads:', error);
    }
  }

  static getFileType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
        return 'video';
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'file';
    }
  }

  private static getMimeTypeFromName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'mp4': return 'video/mp4';
      case 'mp3': return 'audio/mpeg';
      default: return 'application/octet-stream';
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}