import { useCachedMedia } from '@/hooks/use-offline-query';
import { cn } from '@/lib/utils';
import { Play, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface CachedVideoProps {
  src: string | undefined;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

// Global unmute state - once user unmutes, all videos play unmuted
const getGlobalUnmuteState = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('videoUnmuted') === 'true';
  }
  return false;
};

const setGlobalUnmuteState = (unmuted: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('videoUnmuted', unmuted.toString());
  }
};

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
  const [globalUnmuted, setGlobalUnmuted] = useState(getGlobalUnmuteState());
  const [isMuted, setIsMuted] = useState(!globalUnmuted); // If globally unmuted, start unmuted
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync with global unmute state on mount
  useEffect(() => {
    const globalState = getGlobalUnmuteState();
    setGlobalUnmuted(globalState);
    setIsMuted(!globalState);
    
    if (videoRef.current) {
      videoRef.current.muted = !globalState;
    }
  }, []);

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

  const toggleGlobalMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      // Update global state - once unmuted, all videos play unmuted
      const newGlobalUnmuted = !newMutedState;
      setGlobalUnmuted(newGlobalUnmuted);
      setGlobalUnmuteState(newGlobalUnmuted);
      
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
        onClick={toggleGlobalMute}
        onLoadedData={() => {
          // Ensure autoplay starts when video loads
          if (videoRef.current && autoPlay) {
            // Respect global unmute state
            videoRef.current.muted = !globalUnmuted;
            setIsMuted(!globalUnmuted);
            videoRef.current.play().catch(console.log);
          }
        }}
        onCanPlay={() => {
          // Auto-start playing when ready (like other video components)
          if (videoRef.current && autoPlay) {
            // Start with global unmute state
            videoRef.current.muted = !globalUnmuted;
            setIsMuted(!globalUnmuted);
            videoRef.current.play().catch(() => {
              // Fallback if autoplay fails
              videoRef.current && (videoRef.current.muted = !globalUnmuted);
              videoRef.current && videoRef.current.play().catch(console.log);
            });
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
        playsInline
      />
      
      {/* Unmute Button - Always visible */}
      <button
        onClick={toggleGlobalMute}
        className="absolute top-4 right-4 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 transition-opacity z-10"
        title={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
      
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