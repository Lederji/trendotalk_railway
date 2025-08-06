import { Capacitor } from '@capacitor/core';

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    // For web, use native browser API
    if (!Capacitor.isNativePlatform()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close the stream immediately after permission is granted
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('Web microphone permission denied:', error);
        return false;
      }
    }

    // For native mobile platforms, directly use browser API since Capacitor doesn't have specific microphone plugin
    // Check current permission status
    const currentStatus = await checkMicrophonePermission();
    
    if (currentStatus === 'granted') {
      return true;
    }
    
    if (currentStatus === 'denied') {
      // Permission was previously denied, we can't request again
      // User needs to manually enable in device settings
      return false;
    }

    // Request permission using browser API since Capacitor doesn't have a specific microphone plugin
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Native microphone permission denied:', error);
      return false;
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (!navigator.permissions) {
      // Fallback: try to access microphone directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }

    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    // Fallback: assume prompt state
    return 'prompt';
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('Web camera permission denied:', error);
        return false;
      }
    }

    // For native platforms, use Camera plugin
    const { Camera } = await import('@capacitor/camera');
    try {
      await Camera.checkPermissions();
      return true;
    } catch (error) {
      try {
        const result = await Camera.requestPermissions();
        return result.camera === 'granted';
      } catch (requestError) {
        console.error('Camera permission request failed:', requestError);
        return false;
      }
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

export async function requestAllCallPermissions(): Promise<{ microphone: boolean; camera: boolean }> {
  const [microphoneGranted, cameraGranted] = await Promise.all([
    requestMicrophonePermission(),
    requestCameraPermission()
  ]);

  return {
    microphone: microphoneGranted,
    camera: cameraGranted
  };
}

export function showPermissionAlert() {
  const isNative = Capacitor.isNativePlatform();
  const message = isNative 
    ? 'TrendoTalk needs microphone permission for voice calls. Please enable it in your device settings and restart the app.'
    : 'TrendoTalk needs microphone access for voice calls. Please allow microphone permission when prompted.';
  
  alert(message);
}