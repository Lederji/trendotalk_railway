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

// Global state - EXACTLY like trends page
const globalVideoRefs = new Map<string, HTMLVideoElement>();
const videoMuteStates = new Map<string, boolean>();
let currentPlayingVideo: string | null = null;
let globalObserver: IntersectionObserver | null = null;

// Global unmute functionality - once user unmutes, all videos play unmuted
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
  autoPlay = true,
  muted = true,
  loop = true
}: CachedVideoProps) {
  const { src: cachedSrc, isLoading, isCached } = useCachedMedia(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoId = useRef(`video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Instagram-style reels autoplay with intersection observer - EXACTLY like trends page
  useEffect(() => {
    if (!globalObserver) {
      globalObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const videoElement = entry.target.querySelector('video');
            const videoId = entry.target.getAttribute('data-video-id');
            
            if (!videoElement || !videoId) return;
            
            if (entry.isIntersecting) {
              // Pause all other videos first
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
              videoElement.muted = videoMuteStates.get(videoId) ?? true; // Start muted
              videoElement.volume = videoElement.muted ? 0 : 1;
              
              // Check global unmute state
              const globalUnmuted = getGlobalUnmuteState();
              if (globalUnmuted) {
                videoElement.muted = false;
                videoElement.volume = 1;
                videoMuteStates.set(videoId, false);
              }
              
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
                  videoMuteStates.set(videoId, true);
                  videoElement.play().catch((retryErr) => {
                    console.warn(`Failed to autoplay video ${videoId} even muted:`, retryErr);
                  });
                });
            } else {
              // Pause and reset when out of view
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
          threshold: 0.75,
          rootMargin: '0px'
        }
      );
    }

    if (videoRef.current && containerRef.current && cachedSrc) {
      // Register video in global refs
      globalVideoRefs.set(videoId.current, videoRef.current);
      
      // Set data attribute for observer
      containerRef.current.setAttribute('data-video-id', videoId.current);
      
      // Observe the container
      if (globalObserver) {
        globalObserver.observe(containerRef.current);
        console.log(`Registered video for observation: ${videoId.current}`);
      }
      
      // Initialize mute state
      if (!videoMuteStates.has(videoId.current)) {
        videoMuteStates.set(videoId.current, true); // Start muted
      }
    }

    return () => {
      // Cleanup
      if (containerRef.current && globalObserver) {
        globalObserver.unobserve(containerRef.current);
      }
      globalVideoRefs.delete(videoId.current);
      videoMuteStates.delete(videoId.current);
      
      if (currentPlayingVideo === videoId.current) {
        currentPlayingVideo = null;
      }
    };
  }, [cachedSrc]);

  // Toggle video mute - exactly like trends page
  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (video) {
      const currentMute = videoMuteStates.get(videoId.current) ?? true;
      const newMute = !currentMute;
      video.muted = newMute;
      videoMuteStates.set(videoId.current, newMute);
      
      // Update global state - once unmuted, all videos play unmuted
      if (!newMute) {
        setGlobalUnmuteState(true);
      }
      
      console.log(`Video ${videoId.current} ${newMute ? 'muted' : 'unmuted'}`);
    }
  };

  // Simple click handler
  const handleVideoClick = () => {
    toggleVideoMute();
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

  const currentMuteState = videoMuteStates.get(videoId.current) ?? true;

  return (
    <div ref={containerRef} className="relative">
      <video
        ref={videoRef}
        src={cachedSrc}
        className={cn(className, "cursor-pointer")}
        muted={currentMuteState}
        loop
        playsInline
        preload="auto"
        onLoadedData={() => {
          // Ensure video is ready for Instagram-style autoplay
          const video = videoRef.current;
          if (video) {
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
          }
        }}
        onCanPlay={() => {
          // Additional trigger when video can play
          const video = videoRef.current;
          if (video && currentPlayingVideo === videoId.current && video.paused) {
            video.play().catch(() => {
              video.muted = true;
              video.play().catch(console.error);
            });
          }
        }}
        onClick={handleVideoClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Mute/Unmute Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleVideoMute();
        }}
        className="absolute top-4 right-4 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 transition-opacity z-10"
        title={currentMuteState ? "Unmute video" : "Mute video"}
      >
        {currentMuteState ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}