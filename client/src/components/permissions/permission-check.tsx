import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Camera, AlertCircle } from 'lucide-react';
import { requestAllCallPermissions, checkMicrophonePermission, hasRequestedPermissions } from '@/utils/permissions';
import { useToast } from '@/hooks/use-toast';

interface PermissionCheckProps {
  onPermissionsGranted: () => void;
}

export function PermissionCheck({ onPermissionsGranted }: PermissionCheckProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [needsPermissions, setNeedsPermissions] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      // Only check permissions on mobile platforms
      if (!Capacitor.isNativePlatform()) {
        setIsChecking(false);
        onPermissionsGranted();
        return;
      }

      // If permissions have already been requested before, don't ask again
      if (hasRequestedPermissions()) {
        console.log('Permissions already requested previously, skipping permission check');
        setIsChecking(false);
        onPermissionsGranted();
        return;
      }

      // Check current microphone permission status
      const micStatus = await checkMicrophonePermission();
      
      if (micStatus === 'granted') {
        setIsChecking(false);
        onPermissionsGranted();
      } else {
        setIsChecking(false);
        setNeedsPermissions(true);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsChecking(false);
      // Allow app to continue even if permission check fails
      onPermissionsGranted();
    }
  };

  const handleRequestPermissions = async () => {
    setRequesting(true);
    try {
      const permissions = await requestAllCallPermissions();
      
      if (permissions.microphone) {
        toast({
          title: "Permissions granted",
          description: "You can now use voice calling features",
        });
        setNeedsPermissions(false);
        onPermissionsGranted();
      } else {
        toast({
          title: "Permission required",
          description: "Microphone access is needed for voice calls. You can enable it later in device settings.",
          variant: "destructive"
        });
        // Still allow app to continue
        onPermissionsGranted();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: "Permission error",
        description: "There was an issue requesting permissions. You can enable them later in device settings.",
        variant: "destructive"
      });
      // Still allow app to continue
      onPermissionsGranted();
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Permissions skipped",
      description: "You can enable call permissions later in device settings",
    });
    onPermissionsGranted();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!needsPermissions) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-pink-600" />
          </div>
          <CardTitle className="text-xl font-bold">Enable Call Features</CardTitle>
          <CardDescription>
            TrendoTalk needs permissions to provide the best calling experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mic className="w-5 h-5 text-pink-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Microphone</p>
                <p className="text-xs text-gray-600">Required for voice calls</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Camera className="w-5 h-5 text-pink-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Camera</p>
                <p className="text-xs text-gray-600">Optional for video calls</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 pt-4">
            <Button 
              onClick={handleRequestPermissions} 
              disabled={requesting}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {requesting ? 'Requesting...' : 'Enable Permissions'}
            </Button>
            
            <Button 
              onClick={handleSkip} 
              variant="outline" 
              className="w-full"
              disabled={requesting}
            >
              Skip for Now
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            You can change these permissions later in your device settings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}