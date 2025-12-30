export type BrandKey = 'nsg' | 'rmw' | 'dqw';

export type BrandColors = {
  primary: string;
  primaryDark: string;
  primaryLightBg: string;
  primaryBorder: string;
  drawerActiveBg: string;
  drawerActiveTint: string;
};

const PALETTES: Record<BrandKey, BrandColors> = {
  nsg: {
    primary: '#ef4444', // red-500
    primaryDark: '#b91c1c', // red-700
    primaryLightBg: '#fee2e2', // red-100
    primaryBorder: '#fecaca', // red-200
    drawerActiveBg: '#fee2e2',
    drawerActiveTint: '#b91c1c',
  },
  rmw: {
    primary: '#22c55e', // green-500
    primaryDark: '#15803d', // green-700
    primaryLightBg: '#dcfce7', // green-100
    primaryBorder: '#bbf7d0', // green-200
    drawerActiveBg: '#dcfce7',
    drawerActiveTint: '#166534',
  },
  dqw: {
    primary: '#3b82f6', // blue-500
    primaryDark: '#1d4ed8', // blue-700
    primaryLightBg: '#dbeafe', // blue-100/200
    primaryBorder: '#bfdbfe', // blue-200
    drawerActiveBg: '#dbeafe',
    drawerActiveTint: '#1d4ed8',
  },
};

export const getBrandKeyForDomain = (domain: string | null): BrandKey => {
  switch (domain) {
    case 'rmw':
      return 'rmw';
    case 'dqw':
      return 'dqw';
    case 'nsg':
    case 'admin':
    default:
      return 'nsg';
  }
};

export const getBrandColors = (domain: string | null): BrandColors => {
  const key = getBrandKeyForDomain(domain);
  return PALETTES[key];
};
