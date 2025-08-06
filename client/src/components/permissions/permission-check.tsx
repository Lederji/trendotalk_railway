import { useEffect, useState } from 'react';
// Permission check component - no Capacitor imports to avoid build issues
import { requestMicrophonePermission, checkMicrophonePermission } from '@/utils/permissions-cache';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, RefreshCw } from 'lucide-react';

interface PermissionCheckProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export function PermissionCheck({ onPermissionGranted, onPermissionDenied }: PermissionCheckProps) {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = async () => {
    setPermissionStatus('checking');
    try {
      const status = await checkMicrophonePermission();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        onPermissionGranted();
      } else if (status === 'denied') {
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('prompt');
    }
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestMicrophonePermission();
      if (granted) {
        setPermissionStatus('granted');
        onPermissionGranted();
      } else {
        setPermissionStatus('denied');
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionStatus('denied');
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  if (permissionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  if (permissionStatus === 'granted') {
    return (
      <div className="flex items-center justify-center p-4 text-green-600">
        <Mic className="w-6 h-6" />
        <span className="ml-2">Microphone access granted</span>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-red-600">
        <MicOff className="w-8 h-8 mb-2" />
        <span className="text-center mb-3">Microphone access denied</span>
        <p className="text-sm text-gray-600 text-center mb-4">
          Please enable microphone permission in your device settings for TrendoTalk to enable voice calling.
        </p>
        <Button onClick={checkPermissions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Check Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Mic className="w-8 h-8 mb-2 text-blue-600" />
      <span className="text-center mb-3">Voice calling requires microphone access</span>
      <p className="text-sm text-gray-600 text-center mb-4">
        TrendoTalk needs microphone permission to enable voice calls between users.
      </p>
      <Button 
        onClick={requestPermissions} 
        disabled={isRequesting}
        className="w-full max-w-xs"
      >
        {isRequesting ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Allow Microphone
          </>
        )}
      </Button>
    </div>
  );
}