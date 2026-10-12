const fs = require('fs');

const IS_DEV = process.env.APP_VARIANT === 'development';

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  name: IS_DEV ? 'Palora (Dev)' : 'Palora',
  slug: IS_DEV ? 'palora-dev' : 'palora',
  version: '0.2.1',
  orientation: 'portrait',
  scheme: IS_DEV ? 'paloradev' : 'palora',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FDF7FD',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV ? 'com.kraftisium.palora.dev' : 'com.kraftisium.palora',
    buildNumber: '3',
    infoPlist: {
      NSCameraUsageDescription: 'Palora uses the camera so you can add profile photos.',
      NSPhotoLibraryUsageDescription: 'Palora needs access to your photos to add them to your profile.',
      NSLocationWhenInUseUsageDescription: 'Palora uses your location to show people near you.',
    },
  },
  android: {
    package: IS_DEV ? 'com.kraftisium.palora.dev' : 'com.kraftisium.palora',
    versionCode: 4,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4B164C',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    // Push on Android needs Firebase Cloud Messaging. Drop google-services.json in app/
    // (or point GOOGLE_SERVICES_JSON at it) and rebuild; until then push is skipped.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || (fs.existsSync('./google-services.json') ? './google-services.json' : undefined),
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-dev-client', { addGeneratedScheme: !!IS_DEV }],
    [
      './plugins/signing-config.js',
      { prefix: 'PALORA_UPLOAD' },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/HankenGrotesk-Regular.ttf',
          './assets/fonts/HankenGrotesk-Medium.ttf',
          './assets/fonts/HankenGrotesk-SemiBold.ttf',
          './assets/fonts/HankenGrotesk-Bold.ttf',
          './assets/fonts/HankenGrotesk-ExtraBold.ttf',
          './assets/fonts/HankenGrotesk-Light.ttf',
        ],
      },
    ],
    ['expo-image-picker', { photosPermission: false, cameraPermission: 'Palora uses the camera so you can add profile photos.' }],
    ['expo-location', { locationWhenInUsePermission: 'Palora uses your location to show people near you.', isAndroidBackgroundLocationEnabled: false }],
    ['expo-notifications', { color: '#DD88CF' }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    bffApiUrl: process.env.EXPO_PUBLIC_BFF_API_URL?.trim() || 'https://palora.kraftisium.xyz',
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});

