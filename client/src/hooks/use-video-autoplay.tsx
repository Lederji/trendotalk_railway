import { useEffect, useRef, useCallback } from 'react';

interface VideoAutoplayHook {
  registerVideo: (postId: number, videoElement: HTMLVideoElement) => void;
  unregisterVideo: (postId: number) => void;
  observePost: (postId: number, element: HTMLElement) => void;
  unobservePost: (postId: number) => void;
}

export function useVideoAutoplay(): VideoAutoplayHook {
  const videoRefs = useRef<Map<number, HTMLVideoElement[]>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const currentPlayingPost = useRef<number | null>(null);

  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach((videos) => {
      videos.forEach(video => {
        if (video && !video.paused) {
          video.pause();
        }
      });
    });
  }, []);

  const playVideosForPost = useCallback((postId: number) => {
    const videos = videoRefs.current.get(postId);
    if (videos) {
      videos.forEach(video => {
        if (video && video.paused) {
          video.play().catch(console.error);
        }
      });
    }
  }, []);

  const registerVideo = useCallback((postId: number, videoElement: HTMLVideoElement) => {
    const existingVideos = videoRefs.current.get(postId) || [];
    if (!existingVideos.includes(videoElement)) {
      videoRefs.current.set(postId, [...existingVideos, videoElement]);
    }
  }, []);

  const unregisterVideo = useCallback((postId: number) => {
    videoRefs.current.delete(postId);
  }, []);

  const observePost = useCallback((postId: number, element: HTMLElement) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const entryPostId = parseInt(entry.target.getAttribute('data-post-id') || '0');
            
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              // Video is mostly visible - play it
              if (currentPlayingPost.current !== entryPostId) {
                pauseAllVideos();
                currentPlayingPost.current = entryPostId;
                playVideosForPost(entryPostId);
              }
            } else if (currentPlayingPost.current === entryPostId && entry.intersectionRatio < 0.3) {
              // Video is mostly out of view - pause it
              pauseAllVideos();
              currentPlayingPost.current = null;
            }
          });
        },
        {
          threshold: [0.3, 0.6], // Multiple thresholds for smooth transitions
          rootMargin: '-20px'
        }
      );
    }

    element.setAttribute('data-post-id', postId.toString());
    observerRef.current.observe(element);
  }, [pauseAllVideos, playVideosForPost]);

  const unobservePost = useCallback((postId: number) => {
    if (observerRef.current) {
      const element = document.querySelector(`[data-post-id="${postId}"]`);
      if (element) {
        observerRef.current.unobserve(element);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    registerVideo,
    unregisterVideo,
    observePost,
    unobservePost
  };
}