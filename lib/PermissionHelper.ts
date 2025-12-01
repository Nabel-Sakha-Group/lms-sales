import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_ASKED_KEY = 'permissions_requested';

export class PermissionHelper {
  // Reset permission flag (useful for testing)
  static async resetPermissionFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERMISSION_ASKED_KEY);
      console.log('Permission flag reset - app will ask for permissions again on next launch');
    } catch (error) {
      console.error('Error resetting permission flag:', error);
    }
  }

  // Check if permissions have been requested before
  static async hasAskedForPermissions(): Promise<boolean> {
    try {
      const hasAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      return hasAsked === 'true';
    } catch (error) {
      console.error('Error checking permission flag:', error);
      return false;
    }
  }
}