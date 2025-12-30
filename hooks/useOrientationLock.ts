import { useEffect, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useResponsive } from './useResponsive';

export const useOrientationLock = () => {
  const { isTablet, isLandscape } = useResponsive();
  const [orientationSet, setOrientationSet] = useState(false);

  useEffect(() => {
    const setOrientation = async () => {
      try {
        // Allow all orientations for all devices (both phone and tablet)
        await ScreenOrientation.unlockAsync();
        setOrientationSet(false);
      } catch (error) {
        console.log('Could not set screen orientation:', error);
      }
    };

    setOrientation();
  }, [orientationSet]);

  // Reset orientation lock when switching between tablet/phone modes
  useEffect(() => {
    return () => {
      if (orientationSet) {
        ScreenOrientation.unlockAsync().catch(console.log);
      }
    };
  }, []);
};