import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trendotalk.app',
  appName: 'TrendoTalk',
  webDir: 'dist/public',
  server: {
    // For production, this will be your actual API server
    url: 'https://your-app-domain.replit.app',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a1a'
    },
    Camera: {
      permissions: {
        camera: 'TrendoTalk needs camera access to take photos and videos',
        photos: 'TrendoTalk needs photo access to select images from your gallery'
      }
    },
    Filesystem: {
      permissions: {
        publicStorage: 'TrendoTalk needs storage access to save and access media files'
      }
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
