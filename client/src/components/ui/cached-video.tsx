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
  autoPlay = true, // Default autoplay for home page 
  muted = true,
  loop = true // Loop videos for social media feel
}: CachedVideoProps) {
  const { src: cachedSrc, isLoading, isCached } = useCachedMedia(src);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
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

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Prevent default video pause/play behavior
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Video clicked - unmuting directly');
    
    // Directly unmute on click
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      
      // Ensure video keeps playing
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.log);
      }
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
        className={cn(className, "cursor-pointer")}
        controls={false} // Always disable controls for autoplay experience
        autoPlay={true} // Force autoplay for all videos
        muted={isMuted}
        loop={loop}
        onClick={handleVideoClick}
        onLoadedData={() => {
          // Ensure autoplay starts when video loads
          if (videoRef.current && autoPlay) {
            videoRef.current.play().catch(console.log);
          }
        }}
        onCanPlay={() => {
          // Auto-start playing when ready
          if (videoRef.current && autoPlay) {
            videoRef.current.play().catch(console.log);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
        playsInline
      />
      
      {/* No visual indicators - clean interface */}
      
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