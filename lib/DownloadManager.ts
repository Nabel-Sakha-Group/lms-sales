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
        // Use device's public Downloads folder with app subfolder
        this._downloadsFolder = `${FileSystem.documentDirectory}../../../storage/emulated/0/Download/LMS-Sales/`;
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
        // File is already saved to public Downloads/LMS-Sales/ folder
        console.log('Android: File saved to Downloads/LMS-Sales/ folder:', localUri);
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
      const DOWNLOADS_FOLDER = await this.initializeDownloadsFolder();
      
      const fileId = Date.now().toString();
      const localUri = DOWNLOADS_FOLDER + `${fileId}_${fileName}`;
      console.log('Download URI:', localUri);
      
      // Start download
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri,
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
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        console.log('File info:', fileInfo);
        
        const downloadedFile: DownloadedFile = {
          id: fileId,
          name: fileName,
          originalUrl: url,
          localUri: localUri,
          size: 'size' in fileInfo ? fileInfo.size : 0,
          downloadedAt: new Date().toISOString(),
          fileType: this.getFileType(fileName),
        };

        // Save to media library for file manager access
        const publicUri = await this.saveToMediaLibrary(localUri, fileName);
        console.log('File saved to media library:', publicUri ? 'Success' : 'Failed');

        // Add public URI if available
        if (publicUri) {
          (downloadedFile as any).publicUri = publicUri;
        }

        // Save to AsyncStorage
        await this.saveDownloadRecord(downloadedFile);
        console.log('Download completed and saved:', downloadedFile);
        
        // Show success message with file location info
        setTimeout(() => {
          if (Platform.OS === 'android') {
            Alert.alert(
              'Download Complete',
              `${fileName} has been saved to:\n📁 Downloads → LMS-Sales → ${fileName}\n\n• View in Downloads tab\n• Access via File Manager`,
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
      
      if (downloadsJson) {
        const downloads = JSON.parse(downloadsJson) as DownloadedFile[];
        
        // Verify files still exist (with minimal logging)
        const validDownloads = [];
        for (const download of downloads) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(download.localUri);
            if (fileInfo.exists) {
              validDownloads.push(download);
            }
          } catch {
            // Skip this file if we can't check it
          }
        }
        
        // Update storage if some files were removed
        if (validDownloads.length !== downloads.length) {
          console.log(`Updated storage: ${validDownloads.length} valid files out of ${downloads.length}`);
          await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(validDownloads));
        }
        
        return validDownloads;
      }
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

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}