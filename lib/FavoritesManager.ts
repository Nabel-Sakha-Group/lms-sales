import AsyncStorage from '@react-native-async-storage/async-storage';

export type FavoriteItem = {
  id: string; // unique per domain + fullPath
  name: string;
  fullPath: string; // path di dalam bucket, mis. "Folder/Sub/file.pdf"
  domain: string | null;
  addedAt: string;
  size?: number;
};

const FAVORITES_KEY = 'favorites_v1';

export class FavoritesManager {
  private static makeId(domain: string | null, fullPath: string) {
    return `${domain || 'default'}::${fullPath}`;
  }

  static async getAllFavorites(): Promise<FavoriteItem[]> {
    try {
      const json = await AsyncStorage.getItem(FAVORITES_KEY);
      if (!json) return [];
      const parsed = JSON.parse(json) as FavoriteItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  static async saveAllFavorites(favorites: FavoriteItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }

  static async getFavoritesForDomain(domain: string | null): Promise<FavoriteItem[]> {
    const all = await this.getAllFavorites();
    const key = domain || null;
    return all.filter(f => f.domain === key);
  }

  static async toggleFavorite(domain: string | null, fullPath: string, name: string, size?: number): Promise<FavoriteItem[]> {
    const all = await this.getAllFavorites();
    const id = this.makeId(domain, fullPath);
    const index = all.findIndex(f => f.id === id);

    if (index >= 0) {
      all.splice(index, 1);
    } else {
      all.push({
        id,
        name,
        fullPath,
        domain: domain || null,
        addedAt: new Date().toISOString(),
        size,
      });
    }

    await this.saveAllFavorites(all);
    return all;
  }

  static async removeFavorite(domain: string | null, fullPath: string): Promise<FavoriteItem[]> {
    const all = await this.getAllFavorites();
    const id = this.makeId(domain, fullPath);
    const filtered = all.filter(f => f.id !== id);
    await this.saveAllFavorites(filtered);
    return filtered;
  }
}
