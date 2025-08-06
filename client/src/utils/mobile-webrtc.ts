// Mobile WebRTC utilities - no Capacitor imports to avoid build issues

// Mobile-specific WebRTC utilities
export async function getMobileMediaStream(): Promise<MediaStream> {
  // Detect mobile platform by checking user agent and touch support
  const isNative = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);
  
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(isNative && {
        // Mobile-specific settings for better performance
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        // Android specific audio settings
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googEchoCancellation2: true,
        googDAEchoCancellation: true,
        googTypingNoiseDetection: true,
      })
    }
  };

  console.log('Requesting media stream with constraints:', constraints);
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify we got audio tracks
    const audioTracks = stream.getAudioTracks();
    console.log('Got media stream with tracks:', {
      audio: audioTracks.length,
      audioSettings: audioTracks.map(track => track.getSettings())
    });
    
    if (audioTracks.length === 0) {
      throw new Error('No audio tracks available in media stream');
    }
    
    return stream;
  } catch (error) {
    console.error('Failed to get media stream:', error);
    throw error;
  }
}

// Test microphone access without keeping the stream
export async function testMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await getMobileMediaStream();
    
    // Test that tracks are actually working
    const audioTracks = stream.getAudioTracks();
    const working = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
    // Clean up immediately
    stream.getTracks().forEach(track => track.stop());
    
    console.log('Microphone test result:', working);
    return working;
  } catch (error) {
    console.error('Microphone test failed:', error);
    return false;
  }
}

// Enhanced peer connection configuration for mobile
export function getMobilePeerConnectionConfig(): RTCConfiguration {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
}