import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
}

export const useResponsive = (): ScreenDimensions => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    
    return {
      width,
      height,
      isLandscape: width > height,
      // More accurate tablet detection: min 768px and aspect ratio consideration
      isTablet: minDimension >= 768 || (minDimension >= 600 && maxDimension >= 960),
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      
      setDimensions({
        width,
        height,
        isLandscape: width > height,
        isTablet: minDimension >= 768 || (minDimension >= 600 && maxDimension >= 960),
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

export const getResponsiveStyle = (isTablet: boolean, isLandscape: boolean) => ({
  // Container styles
  container: {
    paddingHorizontal: isTablet ? (isLandscape ? 32 : 24) : 16,
    paddingVertical: isTablet ? 24 : 16,
  },
  
  // Grid styles for tablet landscape
  gridContainer: {
    flexDirection: isTablet && isLandscape ? 'row' : 'column',
    flex: 1,
  } as const,
  
  // Sidebar for tablet landscape
  sidebar: {
    width: isTablet && isLandscape ? 300 : '100%',
    marginRight: isTablet && isLandscape ? 24 : 0,
    marginBottom: isTablet && isLandscape ? 0 : 16,
  },
  
  // Main content area
  mainContent: {
    flex: 1,
  },
  
  // Card grid for items
  cardGrid: {
    numColumns: isTablet ? (isLandscape ? 4 : 3) : 2,
  },
  
  // Item card sizes
  itemCard: {
    flex: isTablet ? undefined : 1,
    width: isTablet ? (isLandscape ? 280 : 200) : undefined,
    marginHorizontal: isTablet ? 8 : 4,
    marginBottom: 16,
  },
  
  // Text sizing
  text: {
    heading: isTablet ? 28 : 24,
    subheading: isTablet ? 20 : 18,
    body: isTablet ? 16 : 14,
    caption: isTablet ? 14 : 12,
  },
});