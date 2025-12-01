
// Test script to reset permission flag - run in Expo console
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('permissions_requested');
console.log('Permission flag reset - app will ask again on next launch');

