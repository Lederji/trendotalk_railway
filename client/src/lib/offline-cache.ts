// Offline cache implementation for Instagram-like experience
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'TrendoTalkCache';
const DB_VERSION = 1;

interface CacheData {
  id: string;
  data: any;
  timestamp: number;
  type: 'post' | 'story' | 'vibe' | 'user' | 'message' | 'notification';
}

interface MediaCache {
  url: string;
  blob: Blob;
  timestamp: number;
}

class OfflineCache {
  private db: IDBPDatabase | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for text/JSON data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('type', 'type');
          cacheStore.createIndex('timestamp', 'timestamp');
        }

        // Store for media files (images/videos)
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
          mediaStore.createIndex('timestamp', 'timestamp');
        }

        // Store for user preferences and settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });

    return this.db;
  }

  // Cache API responses
  async cacheData(type: CacheData['type'], id: string, data: any) {
    await this.init();
    const cacheEntry: CacheData = {
      id: `${type}_${id}`,
      data,
      timestamp: Date.now(),
      type
    };

    await this.db!.put('cache', cacheEntry);
  }

  // Get cached API responses
  async getCachedData(type: CacheData['type'], id?: string): Promise<any[]> {
    await this.init();
    
    if (id) {
      const entry = await this.db!.get('cache', `${type}_${id}`);
      return entry ? [entry.data] : [];
    }

    const tx = this.db!.transaction('cache', 'readonly');
    const index = tx.store.index('type');
    const entries = await index.getAll(type);
    
    // Sort by timestamp (newest first)
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(entry => entry.data);
  }

  // Cache media files (images/videos)
  async cacheMedia(url: string, blob: Blob) {
    await this.init();
    const mediaEntry: MediaCache = {
      url,
      blob,
      timestamp: Date.now()
    };

    await this.db!.put('media', mediaEntry);
  }

  // Get cached media
  async getCachedMedia(url: string): Promise<string | null> {
    await this.init();
    const entry = await this.db!.get('media', url);
    
    if (entry) {
      // Convert blob to URL
      return URL.createObjectURL(entry.blob);
    }
    
    return null;
  }

  // Store user settings/preferences
  async setSetting(key: string, value: any) {
    await this.init();
    await this.db!.put('settings', { key, value });
  }

  async getSetting(key: string): Promise<any> {
    await this.init();
    const entry = await this.db!.get('settings', key);
    return entry?.value;
  }

  // Clean old cache entries (older than 7 days)
  async cleanOldCache() {
    await this.init();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Clean data cache
    const cacheEntries = await this.db!.getAll('cache');
    const oldCacheIds = cacheEntries
      .filter(entry => entry.timestamp < weekAgo)
      .map(entry => entry.id);
    
    for (const id of oldCacheIds) {
      await this.db!.delete('cache', id);
    }

    // Clean media cache
    const mediaEntries = await this.db!.getAll('media');
    const oldMediaUrls = mediaEntries
      .filter(entry => entry.timestamp < weekAgo)
      .map(entry => entry.url);
    
    for (const url of oldMediaUrls) {
      await this.db!.delete('media', url);
    }

    console.log(`🧹 Cleaned ${oldCacheIds.length} cached entries and ${oldMediaUrls.length} media files`);
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Get cache size info
  async getCacheInfo() {
    await this.init();
    const cacheCount = await this.db!.count('cache');
    const mediaCount = await this.db!.count('media');
    
    return {
      cacheEntries: cacheCount,
      mediaFiles: mediaCount,
      online: this.isOnline()
    };
  }
}

export const offlineCache = new OfflineCache();

// Initialize cache and clean old entries on startup
offlineCache.init().then(() => {
  offlineCache.cleanOldCache();
});

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('📶 Back online - syncing data...');
  // Trigger data refresh when back online
  window.dispatchEvent(new CustomEvent('app-online'));
});

window.addEventListener('offline', () => {
  console.log('📵 Offline mode - using cached data');
  window.dispatchEvent(new CustomEvent('app-offline'));
});