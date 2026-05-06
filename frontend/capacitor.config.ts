import type { CapacitorConfig } from '@capacitor/cli';

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  process.env.GOOGLE_CLIENT_ID ??
  '669903110693-3f1lt6ci39go17j1hsutaeabrt36utq0.apps.googleusercontent.com';

const config: CapacitorConfig = {
  appId: 'com.biosense.iot',
  appName: 'BioSense IoT',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: googleClientId,
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
