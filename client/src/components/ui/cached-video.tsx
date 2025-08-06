import { useCachedMedia } from '@/hooks/use-offline-query';
import { cn } from '@/lib/utils';
import { Play, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface CachedVideoProps {
  src: string | undefined;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function CachedVideo({ 
  src, 
  className, 
  controls = true, 
  autoPlay = false, 
  muted = true,
  loop = false 
}: CachedVideoProps) {
  const { src: cachedSrc, isLoading, isCached } = useCachedMedia(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!cachedSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <div className="text-center">
          <Play className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Video unavailable offline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={cachedSrc}
        className={className}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      {/* Hide cached indicator for better UX */}
      {false && isCached && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-75">
          Cached
        </div>
      )}
      
      {!controls && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity"
        >
          <div className="bg-white bg-opacity-80 rounded-full p-3">
            <Play className={cn('w-6 h-6 text-black', isPlaying && 'opacity-50')} />
          </div>
        </button>
      )}
    </div>
  );
}