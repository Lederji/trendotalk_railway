import { Capacitor } from '@capacitor/core';

// Store permission status to avoid repeated requests - persistent across app sessions
const PERMISSION_STORAGE_KEY = 'trendotalk_permissions';

interface PermissionCache {
  microphone: 'granted' | 'denied' | 'prompt' | null;
  camera: 'granted' | 'denied' | 'prompt' | null;
  lastChecked: number;
  hasBeenRequested: boolean;
}

// Get cached permissions
function getCachedPermissions(): PermissionCache {
  try {
    const cached = localStorage.getItem(PERMISSION_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache expires after 24 hours
      if (Date.now() - parsed.lastChecked < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.log('Error reading cached permissions:', error);
  }
  
  return {
    microphone: null,
    camera: null,
    lastChecked: 0,
    hasBeenRequested: false
  };
}

// Cache permissions
function setCachedPermissions(permissions: Partial<PermissionCache>) {
  try {
    const current = getCachedPermissions();
    const updated = {
      ...current,
      ...permissions,
      lastChecked: Date.now()
    };
    localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.log('Error caching permissions:', error);
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    // Check cache first
    const cached = getCachedPermissions();
    
    // If we already have granted permission, verify it still works
    if (cached.microphone === 'granted') {
      console.log('Microphone permission already granted (cached)');
      try {
        // Quick test to ensure it's still working
        const { testMicrophoneAccess } = await import('./mobile-webrtc');
        const isWorking = await testMicrophoneAccess();
        if (isWorking) {
          return true;
        } else {
          console.log('Cached permission not working, re-requesting...');
          // Clear cache and try again
          setCachedPermissions({ microphone: null });
        }
      } catch (e) {
        console.log('Error testing cached permission:', e);
      }
    }
    
    // If we already asked once and it was denied, don't ask again
    if (cached.microphone === 'denied' && cached.hasBeenRequested) {
      console.log('Microphone permission previously denied');
      return false;
    }
    
    // For web, use native browser API
    if (!Capacitor.isNativePlatform()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close the stream immediately after permission is granted
        stream.getTracks().forEach(track => track.stop());
        
        // Cache the granted permission
        setCachedPermissions({ 
          microphone: 'granted', 
          hasBeenRequested: true 
        });
        
        console.log('Microphone permission granted (web)');
        return true;
      } catch (error) {
        console.error('Web microphone permission denied:', error);
        
        // Cache the denied permission
        setCachedPermissions({ 
          microphone: 'denied', 
          hasBeenRequested: true 
        });
        
        return false;
      }
    }

    // For native mobile platforms - enhanced mobile audio constraints
    try {
      // Use enhanced mobile audio constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
          // Additional mobile-specific settings for Android WebRTC
          echoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googTypingNoiseDetection: true
        }
      });
      
      // Test that we actually got audio tracks and they're live
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }
      
      // Verify track is live and ready
      const track = audioTracks[0];
      if (track.readyState !== 'live') {
        throw new Error('Microphone track is not live');
      }
      
      console.log('Got working audio tracks:', {
        count: audioTracks.length,
        state: track.readyState,
        settings: track.getSettings()
      });
      
      // Clean up the test stream
      stream.getTracks().forEach(track => track.stop());
      
      // Cache the granted permission
      setCachedPermissions({ 
        microphone: 'granted', 
        hasBeenRequested: true 
      });
      
      console.log('Microphone permission granted (native)');
      return true;
    } catch (error) {
      console.error('Native microphone permission denied:', error);
      
      // Cache the denied permission
      setCachedPermissions({ 
        microphone: 'denied', 
        hasBeenRequested: true 
      });
      
      return false;
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    // Check cache first
    const cached = getCachedPermissions();
    if (cached.microphone && cached.microphone !== 'prompt') {
      return cached.microphone;
    }
    
    if (!navigator.permissions) {
      // Fallback: try to access microphone directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        setCachedPermissions({ microphone: 'granted' });
        return 'granted';
      } catch {
        setCachedPermissions({ microphone: 'denied' });
        return 'denied';
      }
    }

    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    const status = result.state as 'granted' | 'denied' | 'prompt';
    
    // Cache the result
    setCachedPermissions({ microphone: status });
    
    return status;
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return 'prompt';
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    // Check cache first
    const cached = getCachedPermissions();
    
    // If we already have granted permission, return true
    if (cached.camera === 'granted') {
      console.log('Camera permission already granted (cached)');
      return true;
    }
    
    // If we already asked once and it was denied, don't ask again
    if (cached.camera === 'denied' && cached.hasBeenRequested) {
      console.log('Camera permission previously denied');
      return false;
    }
    
    if (!Capacitor.isNativePlatform()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        setCachedPermissions({ 
          camera: 'granted', 
          hasBeenRequested: true 
        });
        
        console.log('Camera permission granted (web)');
        return true;
      } catch (error) {
        console.error('Web camera permission denied:', error);
        
        setCachedPermissions({ 
          camera: 'denied', 
          hasBeenRequested: true 
        });
        
        return false;
      }
    }

    // For native platforms, use Camera plugin
    try {
      const { Camera } = await import('@capacitor/camera');
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera === 'granted') {
        setCachedPermissions({ camera: 'granted' });
        return true;
      }
      
      const result = await Camera.requestPermissions();
      const granted = result.camera === 'granted';
      
      setCachedPermissions({ 
        camera: granted ? 'granted' : 'denied', 
        hasBeenRequested: true 
      });
      
      console.log('Camera permission:', granted ? 'granted' : 'denied', '(native)');
      return granted;
    } catch (error) {
      console.error('Camera permission request failed:', error);
      
      setCachedPermissions({ 
        camera: 'denied', 
        hasBeenRequested: true 
      });
      
      return false;
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

export async function requestAllCallPermissions(): Promise<{ microphone: boolean; camera: boolean }> {
  // Check if we already have permissions to avoid unnecessary requests
  const cached = getCachedPermissions();
  
  let microphoneGranted = cached.microphone === 'granted';
  let cameraGranted = cached.camera === 'granted';
  
  // Only request permissions that we don't already have
  const promises: Promise<boolean>[] = [];
  
  if (!microphoneGranted) {
    promises.push(requestMicrophonePermission());
  } else {
    promises.push(Promise.resolve(true));
  }
  
  if (!cameraGranted) {
    promises.push(requestCameraPermission());
  } else {
    promises.push(Promise.resolve(true));
  }
  
  const [micResult, camResult] = await Promise.all(promises);
  
  return {
    microphone: micResult,
    camera: camResult
  };
}

export function showPermissionAlert() {
  const isNative = Capacitor.isNativePlatform();
  const message = isNative 
    ? 'TrendoTalk needs microphone permission for voice calls. Please enable it in your device settings and restart the app.'
    : 'TrendoTalk needs microphone access for voice calls. Please allow microphone permission when prompted.';
  
  alert(message);
}

// Clear cached permissions (useful for testing or if user wants to reset)
export function clearPermissionCache() {
  try {
    localStorage.removeItem(PERMISSION_STORAGE_KEY);
    console.log('Permission cache cleared');
  } catch (error) {
    console.error('Error clearing permission cache:', error);
  }
}

// Check if permissions have been requested before
export function hasRequestedPermissions(): boolean {
  const cached = getCachedPermissions();
  return cached.hasBeenRequested;
}