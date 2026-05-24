import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.claw.reader.android',
  appName: 'ClawReader',
  webDir: 'dist-renderer',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;
