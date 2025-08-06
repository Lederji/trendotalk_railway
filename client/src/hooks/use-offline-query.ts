import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineCache } from '@/lib/offline-cache';

// Enhanced query hook that works offline like Instagram
export function useOfflineQuery<T>(
  queryKey: string[],
  cacheType: 'post' | 'story' | 'vibe' | 'user' | 'message' | 'notification',
  id?: string
) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedData, setCachedData] = useState<T[]>([]);

  // Load cached data immediately
  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await offlineCache.getCachedData(cacheType, id);
      if (cached.length > 0) {
        setCachedData(cached as T[]);
        // Pre-populate React Query cache with offline data
        queryClient.setQueryData(queryKey, cached);
      }
    };

    loadCachedData();
  }, [queryKey.join(','), cacheType, id]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Invalidate and refetch when back online
      queryClient.invalidateQueries({ queryKey });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app-online', handleOnline);
    window.addEventListener('app-offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app-online', handleOnline);
      window.removeEventListener('app-offline', handleOffline);
    };
  }, [queryKey, queryClient]);

  // Regular React Query with offline fallback
  const query = useQuery({
    queryKey,
    enabled: isOnline,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
    queryFn: async () => {
      // Build URL with query parameters
      const [baseUrl, ...params] = queryKey;
      let url = baseUrl;
      
      // Handle query parameters
      if (params.length > 0) {
        const searchParams = new URLSearchParams();
        params.forEach((param, index) => {
          if (param === 'admin-only') {
            searchParams.set('adminOnly', 'true');
          } else if (typeof param === 'string') {
            searchParams.set(`param${index}`, param);
          }
        });
        url += '?' + searchParams.toString();
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId') || ''}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      return response.json();
    },
    meta: {
      offline: {
        cacheType,
        id
      }
    }
  });

  // Cache successful responses
  useEffect(() => {
    if (query.data && isOnline) {
      const cacheData = Array.isArray(query.data) ? query.data : [query.data];
      
      // Cache each item individually if it has an ID
      cacheData.forEach((item: any, index: number) => {
        const itemId = item.id || id || index.toString();
        offlineCache.cacheData(cacheType, itemId, item);
      });
    }
  }, [query.data, cacheType, id, isOnline]);

  // Return cached data when offline, live data when online
  return {
    ...query,
    data: isOnline ? query.data : cachedData,
    isOffline: !isOnline,
    isCached: !isOnline && cachedData.length > 0,
    hasOfflineData: cachedData.length > 0
  };
}

// Hook for caching media files
export function useCachedMedia(url: string | undefined) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) return;

    const loadMedia = async () => {
      setIsLoading(true);

      // First try to get from cache
      const cached = await offlineCache.getCachedMedia(url);
      if (cached) {
        setCachedUrl(cached);
        setIsLoading(false);
        return;
      }

      // If online, fetch and cache
      if (navigator.onLine) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          
          // Cache the media
          await offlineCache.cacheMedia(url, blob);
          
          // Create object URL
          const objectUrl = URL.createObjectURL(blob);
          setCachedUrl(objectUrl);
        } catch (error) {
          console.error('Failed to cache media:', error);
          // Fallback to original URL
          setCachedUrl(url);
        }
      } else {
        // Offline and no cache - use original URL as fallback
        setCachedUrl(url);
      }

      setIsLoading(false);
    };

    loadMedia();

    // Cleanup object URLs to prevent memory leaks
    return () => {
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [url]);

  return {
    src: cachedUrl,
    isLoading,
    isCached: cachedUrl?.startsWith('blob:') || false
  };
}