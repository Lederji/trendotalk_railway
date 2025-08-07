import { Capacitor } from '@capacitor/core';

// Check if running in native app
function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Request microphone permission for native apps
async function requestMicrophonePermission(): Promise<boolean> {
  if (!isCapacitorNative()) {
    // In web browser, permissions are handled by getUserMedia
    return true;
  }

  try {
    // For native apps, check existing permission first
    const { Camera } = await import('@capacitor/camera');
    
    // Check if microphone permission is already granted
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    
    if (permissionStatus.state === 'granted') {
      console.log('🎤 Microphone permission already granted');
      return true;
    }
    
    if (permissionStatus.state === 'denied') {
      console.log('❌ Microphone permission permanently denied');
      return false;
    }
    
    // Permission is 'prompt' - will be requested when getUserMedia is called
    console.log('🎤 Microphone permission will be requested');
    return true;
    
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    // Continue anyway - getUserMedia will handle permission request
    return true;
  }
}

// Mobile-specific WebRTC utilities
export async function getMobileMediaStream(): Promise<MediaStream> {
  console.log('🎤 Requesting microphone access...', { isNative: isCapacitorNative() });
  
  // For native apps, ensure permission is available
  if (isCapacitorNative()) {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      throw new Error('Microphone permission denied. Please enable microphone access in your device settings.');
    }
  }
  
  // Detect mobile platform for optimized constraints
  const isNative = isCapacitorNative() || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
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

  console.log('🎤 Requesting media stream with constraints:', constraints);
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify we got audio tracks
    const audioTracks = stream.getAudioTracks();
    console.log('✅ Got media stream with tracks:', {
      audio: audioTracks.length,
      audioSettings: audioTracks.map(track => track.getSettings())
    });
    
    if (audioTracks.length === 0) {
      throw new Error('No audio tracks available in media stream');
    }
    
    // Show success message for native apps
    if (isCapacitorNative()) {
      console.log('🎉 Mobile app microphone access granted successfully!');
    }
    
    return stream;
  } catch (error) {
    console.error('❌ Failed to get media stream:', error);
    
    // Provide helpful error messages for different scenarios
    const errorName = (error as any)?.name || '';
    if (errorName === 'NotAllowedError') {
      const message = isCapacitorNative() 
        ? 'Microphone access denied. Please enable microphone permission in your device settings and restart the app.'
        : 'Microphone access denied. Please allow microphone access in your browser and try again.';
      throw new Error(message);
    }
    
    if (errorName === 'NotFoundError') {
      throw new Error('No microphone found on this device.');
    }
    
    if (errorName === 'NotReadableError') {
      throw new Error('Microphone is already in use by another application.');
    }
    
    throw error;
  }
}

// Test microphone access without keeping the stream
export async function testMicrophoneAccess(): Promise<boolean> {
  try {
    console.log('🧪 Testing microphone access...');
    const stream = await getMobileMediaStream();
    
    // Test that tracks are actually working
    const audioTracks = stream.getAudioTracks();
    const working = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
    // Clean up immediately
    stream.getTracks().forEach(track => track.stop());
    
    console.log('🧪 Microphone test result:', working ? '✅ Working' : '❌ Not working');
    return working;
  } catch (error) {
    console.error('🧪 Microphone test failed:', error);
    return false;
  }
}

// Check if microphone permission is available (for UI state)
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (!isCapacitorNative()) {
      // In web browser, check navigator.permissions if available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state;
      }
      return 'prompt'; // Browser will prompt when needed
    }

    // For native apps, check permission status
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    console.log('🎤 Native app microphone permission status:', permissionStatus.state);
    return permissionStatus.state;
    
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return 'prompt'; // Default to prompt if we can't determine
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