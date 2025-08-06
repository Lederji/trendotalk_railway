import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide "back online" indicator after 3 seconds
      timeout = setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
      // Keep offline indicator visible
      clearTimeout(timeout);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeout);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-300',
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 text-white',
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline - showing cached content</span>
          <Database className="w-4 h-4" />
        </>
      )}
    </div>
  );
}