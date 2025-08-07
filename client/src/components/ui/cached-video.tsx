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

// Global video refs and observer - same pattern as trends page
const globalVideoRefs = new Map<string, HTMLVideoElement>();
let globalObserver: IntersectionObserver | null = null;
let currentPlayingVideo: string | null = null;

// Setup observer exactly like trends page
const setupGlobalObserver = () => {
  if (globalObserver || typeof window === 'undefined') return;
  
  globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const videoElement = entry.target.querySelector('video');
        const videoId = entry.target.getAttribute('data-video-id') || '';
        
        if (!videoElement || !videoId) return;
        
        if (entry.isIntersecting) {
          // Pause all other videos first (EXACTLY like trends page)
          globalVideoRefs.forEach((v, id) => {
            if (id !== videoId && v) {
              v.pause();
              v.currentTime = 0;
              v.volume = 0;
              v.muted = true;
            }
          });
          
          // Set current playing video
          currentPlayingVideo = videoId;
          
          // Auto-play the visible video
          videoElement.currentTime = 0;
          const globalUnmuted = getGlobalUnmuteState();
          videoElement.muted = !globalUnmuted;
          videoElement.volume = videoElement.muted ? 0 : 1;
          
          videoElement
            .play()
            .then(() => {
              console.log(`Home page autoplay: video ${videoId} ${videoElement.muted ? '(muted)' : '(with sound)'}`);
            })
            .catch((err) => {
              // Fallback to muted autoplay
              console.log(`Autoplay blocked for video ${videoId}, trying muted:`, err);
              videoElement.muted = true;
              videoElement.volume = 0;
              videoElement.play().catch((retryErr) => {
                console.warn(`Failed to autoplay video ${videoId} even muted:`, retryErr);
              });
            });
        } else {
          // Pause and reset when out of view (EXACTLY like trends page)
          videoElement.pause();
          videoElement.currentTime = 0;
          videoElement.volume = 0;
          videoElement.muted = true;
          
          if (currentPlayingVideo === videoId) {
            console.log(`Paused video ${videoId} - out of view`);
            currentPlayingVideo = null;
          }
        }
      });
    },
    {
      threshold: 0.75, // Only when 75% is visible (Instagram-like)
      rootMargin: '0px'
    }
  );
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalUnmuted, setGlobalUnmuted] = useState(getGlobalUnmuteState());
  const [isMuted, setIsMuted] = useState(!globalUnmuted); // If globally unmuted, start unmuted
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoId = useRef(`video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Setup observer and register video (same pattern as trends)
  useEffect(() => {
    setupGlobalObserver();
    
    if (videoRef.current && containerRef.current && cachedSrc) {
      // Register video in global refs
      globalVideoRefs.set(videoId.current, videoRef.current);
      
      // Set data attribute for observer
      containerRef.current.setAttribute('data-video-id', videoId.current);
      
      // Observe the container
      if (globalObserver && containerRef.current) {
        globalObserver.observe(containerRef.current);
        console.log(`Registered video for observation: ${videoId.current}`);
      }
    }

    return () => {
      // Cleanup - exactly like trends page
      if (containerRef.current && globalObserver) {
        globalObserver.unobserve(containerRef.current);
      }
      globalVideoRefs.delete(videoId.current);
      
      if (currentPlayingVideo === videoId.current) {
        currentPlayingVideo = null;
      }
    };
  }, [cachedSrc]);

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
    <div ref={containerRef} className="relative">
      <video
        ref={videoRef}
        src={cachedSrc}
        className={cn(className, "cursor-pointer")}
        controls={false} // Always disable controls for autoplay experience
        autoPlay={false} // Observer handles autoplay
        muted={isMuted}
        loop={loop}
        onClick={toggleGlobalMute}
        onLoadedData={() => {
          // Ensure video is ready for Instagram-style autoplay
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.loop = true;
          }
        }}
        onCanPlay={() => {
          // Additional trigger when video can play
          const video = videoRef.current;
          if (video && currentPlayingVideo === videoId.current && video.paused) {
            const globalUnmuted = getGlobalUnmuteState();
            video.muted = !globalUnmuted;
            video.play().catch(() => {
              video.muted = true;
              video.play().catch(console.error);
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